import { GeminiEngine } from "./gemini.js";
import { GitHubClient } from "./github.js";
import { GeminiAnalysisResult } from "./types.js";
import { storage } from "./storage.js";
import { App, AppOptions } from "@slack/bolt";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { Buffer } from "buffer";

dotenv.config();

// Helper to get trimmed environment variables
const getEnv = (name: string, defaultValue: string = ""): string => {
  const val = process.env[name];
  return val ? val.trim() : defaultValue;
};

export const githubClient = new GitHubClient(
  getEnv("GITHUB_TOKEN", "dummy"),
  getEnv("GITHUB_REPO", "studyhelperproject/SysDevAutomation")
);
export const geminiEngine = new GeminiEngine(getEnv("GEMINI_API_KEY", "dummy"));

const socketMode = process.env.SLACK_SOCKET_MODE === "true";

async function handlePullRequestOpened(payload: any) {
  try {
    const pr = payload.pull_request;
    const repoFullName = payload.repository.full_name;
    const body = pr.body || "";
    
    const match = body.match(/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/i);
    if (!match) return;

    const issueNum = parseInt(match[1]);
    const client = new GitHubClient(getEnv("GITHUB_TOKEN"), repoFullName);
    const issueText = await client.getIssue(issueNum);
    
    const slackLinkMatch = issueText.match(/\[Slack Message\]\((https:\/\/[^\/]+\/archives\/([^\/]+)\/p(\d+)(?:\?.*)?)\)/);
    if (slackLinkMatch) {
      const permalink = slackLinkMatch[1];
      const channel = slackLinkMatch[2];
      const tsRaw = slackLinkMatch[3];
      const ts = tsRaw.length >= 6 ? tsRaw.slice(0, -6) + "." + tsRaw.slice(-6) : tsRaw;
      
      const message = `🤖 *Jules Update*\n仕様に基づき機能実装のPRが作成されました！\n` +
                      `*PR:* <${pr.html_url}|${pr.title}>\n` +
                      `内容を確認し、問題なければレビュー・マージをお願いします。`;
                      
      await app.client.chat.postMessage({
        channel,
        thread_ts: ts,
        text: message
      });
      console.log(`Posted PR notification to Slack thread: ${permalink}`);
    }
  } catch (error) {
    console.error("Failed to handle PR opened event:", error);
  }
}

const appOptions: AppOptions = {
  token: getEnv("SLACK_BOT_TOKEN", "xoxb-dummy"),
  signingSecret: getEnv("SLACK_SIGNING_SECRET", "dummy"),
  endpoints: ["/"],
  customRoutes: [
    {
      path: "/health",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        res.end("OK");
      },
    },
    {
      path: "/",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        res.end("SysDevAutomation service is running. Slack events are accepted at /");
      },
    },
    {
      path: "/github/webhook",
      method: ["POST"],
      handler: (req: any, res: any) => {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            if (body) {
              const payload = JSON.parse(body);
              if (payload.action === 'opened' && payload.pull_request) {
                await handlePullRequestOpened(payload);
              }
            }
            res.writeHead(200);
            res.end("OK");
          } catch (e) {
            console.error("Error parsing webhook:", e);
            res.writeHead(500);
            res.end("Error");
          }
        });
      },
    },
  ],
};

if (socketMode) {
  appOptions.socketMode = true;
  appOptions.appToken = getEnv("SLACK_APP_TOKEN", "xapp-dummy");
  console.log("Starting in Socket Mode");
} else {
  appOptions.socketMode = false;
  // HTTP Mode (for Cloud Run)
  console.log("Starting in HTTP Mode");
}

export const app = new App(appOptions);

/**
 * Formats the Slack reply message based on Gemini analysis.
 */
export function formatSlackReply(result: GeminiAnalysisResult, issueUrl: string): string {
  let actionText = "created";
  if (result.action === "update") actionText = "updated";
  if (result.action === "comment") actionText = "commented on";
  if (result.action === "UPDATE_DOCS") actionText = "created for development";

  let message = `GitHub Issue ${actionText}: ${issueUrl}\nCategory: ${result.category}`;

  const needsClarification = result.is_ambiguous || result.category === "[Clarify]" || result.category === "[Dependency]";

  if (needsClarification && result.missing_info && result.missing_info.length > 0) {
    message += `\n\n*Missing Information / Questions:*`;
    result.missing_info.forEach(info => {
      message += `\n- ${info}`;
    });
  }

  return message;
}

/**
 * Gets or creates a GitHub client for a specific Slack channel.
 */
async function getGitHubClientForChannel(channelId: string, client: any): Promise<GitHubClient> {
  let fullRepoName = await storage.getRepo(channelId);
  let isNew = false;

  if (!fullRepoName) {
    console.log(`No mapping found for channel ${channelId}. Creating new repository...`);
    // Get channel info to use in repo name
    let channelName = channelId;
    try {
      const info = await client.conversations.info({ channel: channelId });
      if (info.ok) {
        channelName = info.channel.name;
      }
    } catch (error) {
      console.warn(`Failed to fetch channel info for ${channelId}, using ID as name:`, error);
    }
    // Repo name must be lowercase and only contain alphanumeric, underscores, and hyphens
    const sanitizedName = channelName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const repoName = `slack-${sanitizedName}-${channelId}`.toLowerCase();

    fullRepoName = await githubClient.createRepository(repoName);
    await storage.setRepo(channelId, fullRepoName);
    isNew = true;
    console.log(`Created repository ${fullRepoName} for channel ${channelId}`);
  }

  const clientForChannel = new GitHubClient(getEnv("GITHUB_TOKEN"), fullRepoName);
  if (isNew) {
    await clientForChannel.ensureLabelsExist();
  }
  return clientForChannel;
}

/**
 * Unified handler for Slack messages and mentions.
 */
async function handleSlackMessage({ text, ts, thread_ts, channel, client, logger }: any) {
  try {
    // Get Slack message link
    let permalink = "";
    try {
      const result = await client.chat.getPermalink({
        channel,
        message_ts: ts,
      });
      permalink = result.permalink || "";
    } catch (error) {
      console.warn("Failed to fetch permalink:", error);
    }

    // Fetch thread history if message is part of a thread
    let threadHistory = "";
    if (thread_ts) {
      try {
        const replies = await client.conversations.replies({
          channel,
          ts: thread_ts,
          limit: 20, // Limit to recent 20 messages for context
        });

        if (replies.ok && replies.messages) {
          threadHistory = replies.messages
            .filter((m: any) => m.ts !== ts) // Exclude current message
            .map((m: any) => `${m.bot_id ? 'Bot' : 'User'}: ${m.text}`)
            .join("\n");
        }
      } catch (error) {
        console.warn("Failed to fetch thread history:", error);
      }
    }

    // Get channel-specific GitHub client
    const channelGitHubClient = await getGitHubClientForChannel(channel, client);

    // Fetch project context from GitHub
    const context = await channelGitHubClient.getProjectContext();

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text, context, threadHistory, channelGitHubClient);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Perform action on GitHub issue
    let issue;
    if (result.action === "update" && result.issue_number) {
      issue = await channelGitHubClient.updateIssue(result.issue_number, result, permalink);
      console.log(`GitHub Issue Updated: #${result.issue_number}`);
    } else if (result.action === "comment" && result.issue_number) {
      // For comments, we use description as the comment body
      const comment = await channelGitHubClient.addComment(result.issue_number, result.description);
      issue = { html_url: comment.html_url }; // Minimal issue-like object for formatSlackReply
      console.log(`GitHub Comment Added to: #${result.issue_number}`);
    } else if (result.action === "UPDATE_DOCS") {
      if (result.feature_doc_filename && result.feature_doc_markdown) {
        await channelGitHubClient.upsertFile(
          result.feature_doc_filename,
          result.feature_doc_markdown,
          `docs: Update specification for ${result.title}`
        );
        console.log(`GitHub File Upserted: ${result.feature_doc_filename}`);
      }
      
      try {
        await channelGitHubClient.updateEstimates(result.title, result.feature_doc_filename, result.priority);
        console.log(`Updated docs/estimates.md for ${result.title}`);
      } catch (e) {
        console.error("Failed to update estimates:", e);
      }

      issue = await channelGitHubClient.createIssue(result, permalink);
      console.log("GitHub Issue Created for UPDATE_DOCS:", issue.html_url);
    } else {
      issue = await channelGitHubClient.createIssue(result, permalink);
      console.log("GitHub Issue Created:", issue.html_url);
    }

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: formatSlackReply(result, issue.html_url),
    });
  } catch (error) {
    logger.error(error);
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: `Error: Failed to process request. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// app_mention handler
app.event("app_mention", async ({ event, client, logger }: any) => {
  const { text, ts, thread_ts, channel } = event;
  await handleSlackMessage({ text, ts, thread_ts, channel, client, logger });
});

// message.im handler
app.message(async ({ message, client, logger }: any) => {
  // Only handle messages in IMs
  if (message.channel_type !== "im") return;
  // Ignore bot messages
  if ("bot_id" in message) return;

  const { text, ts, thread_ts, channel } = message;
  await handleSlackMessage({ text, ts, thread_ts, channel, client, logger });
});

// member_joined_channel handler (when bot is added to a channel)
app.event("member_joined_channel", async ({ event, client, logger }: any) => {
  try {
    // Check if the joined member is this bot
    // Use try-catch for auth.test to allow app to start even with dummy tokens during challenge
    let auth;
    try {
      auth = await client.auth.test();
    } catch (authError) {
      logger.error("Auth test failed in member_joined_channel:", authError);
      return;
    }

    if (event.user !== auth.user_id) return;

    const { channel } = event;
    console.log(`Bot joined channel ${channel}. Initializing repository...`);

    const channelGitHubClient = await getGitHubClientForChannel(channel, client);
    const repoName = await storage.getRepo(channel);

    await client.chat.postMessage({
      channel,
      text: `Hello! I've been linked to this channel. I've created/linked a GitHub repository for this channel: https://github.com/${repoName}`,
    });
  } catch (error) {
    logger.error("Error in member_joined_channel handler:", error);
  }
});

export async function main() {
  // Global error handlers to prevent crashes during initial setup/challenge
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  const slackEnvVars = [
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
  ];

  if (socketMode) {
    slackEnvVars.push("SLACK_APP_TOKEN");
  }

  const otherEnvVars = [
    "GITHUB_TOKEN",
    "GITHUB_REPO",
    "GEMINI_API_KEY",
  ];

  const missingSlackVars = slackEnvVars.filter((v) => {
    const val = getEnv(v);
    return !val || val === "dummy" || val === "xoxb-dummy" || val === "xapp-dummy";
  });
  if (missingSlackVars.length > 0) {
    console.warn(`Warning: Missing or dummy Slack environment variables: ${missingSlackVars.join(", ")}`);
    console.warn("The app will start but Slack features may not work correctly.");
  }

  const missingOtherVars = otherEnvVars.filter((v) => !getEnv(v) || getEnv(v) === "dummy");
  if (missingOtherVars.length > 0) {
    console.warn(`Warning: Missing or dummy environment variables: ${missingOtherVars.join(", ")}`);
    console.warn("The app will start but GitHub/Gemini features will be limited.");
  }

  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await app.start(port);
    console.log(`⚡️ Bolt app is running on port ${port}!`);
  } catch (error) {
    console.error("Error starting app:", error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
