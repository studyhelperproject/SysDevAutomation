import { GeminiEngine } from "./gemini.js";
import { GitHubClient } from "./github.js";
import { GeminiAnalysisResult } from "./types.js";
import { storage } from "./storage.js";
import { App, AppOptions } from "@slack/bolt";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

export const githubClient = new GitHubClient(
  process.env.GITHUB_TOKEN || "dummy",
  process.env.GITHUB_REPO || "studyhelperproject/SysDevAutomation"
);
export const geminiEngine = new GeminiEngine(process.env.GEMINI_API_KEY || "dummy");

const socketMode = process.env.SLACK_SOCKET_MODE === "true";

const appOptions: AppOptions = {
  token: process.env.SLACK_BOT_TOKEN || "xoxb-dummy",
  signingSecret: process.env.SLACK_SIGNING_SECRET || "dummy",
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
      method: ["POST"],
      handler: (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (data.type === "url_verification") {
              console.log("Handling Slack url_verification challenge at root path");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ challenge: data.challenge }));
              return;
            }
            // If it's not a challenge, it might be an actual Slack event.
            // When using HTTP Mode, Bolt expects events at /slack/events by default.
            // We log this to help users troubleshoot misconfigured Request URLs.
            console.warn("Received POST request at root path that is not a url_verification challenge.");
            console.warn("If this is a Slack event, please check your App settings and ensure the Request URL is set to <YOUR_URL>/slack/events");
            res.writeHead(404);
            res.end("Not Found. Slack events should be sent to /slack/events");
          } catch (e) {
            res.writeHead(400);
            res.end("Bad Request");
          }
        });
      },
    },
  ],
};

if (socketMode) {
  appOptions.socketMode = true;
  appOptions.appToken = process.env.SLACK_APP_TOKEN || "xapp-dummy";
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
  let message = `GitHub Issue created: ${issueUrl}\nCategory: ${result.category}`;

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

  const clientForChannel = new GitHubClient(process.env.GITHUB_TOKEN!, fullRepoName);
  if (isNew) {
    await clientForChannel.ensureLabelsExist();
  }
  return clientForChannel;
}

// app_mention handler
app.event("app_mention", async ({ event, client, logger }: any) => {
  try {
    const { text, ts, channel } = event;

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

    // Get channel-specific GitHub client
    const channelGitHubClient = await getGitHubClientForChannel(channel, client);

    // Fetch project context from GitHub
    const context = await channelGitHubClient.getProjectContext();

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text, context);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await channelGitHubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: formatSlackReply(result, issue.html_url),
    });
  } catch (error) {
    logger.error(error);
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `Error: Failed to process request. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// message.im handler
app.message(async ({ message, client, logger }: any) => {
  // Only handle messages in IMs
  if (message.channel_type !== "im") return;
  // Ignore bot messages
  if ("bot_id" in message) return;

  try {
    const { text, ts, channel } = message;

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

    // Get channel-specific GitHub client
    const channelGitHubClient = await getGitHubClientForChannel(channel, client);

    // Fetch project context from GitHub
    const context = await channelGitHubClient.getProjectContext();

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text, context);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await channelGitHubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: formatSlackReply(result, issue.html_url),
    });
  } catch (error) {
    logger.error(error);
    await client.chat.postMessage({
      channel: message.channel,
      thread_ts: message.ts,
      text: `Error: Failed to process request. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
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
    const val = process.env[v];
    return !val || val === "dummy" || val === "xoxb-dummy" || val === "xapp-dummy";
  });
  if (missingSlackVars.length > 0) {
    console.warn(`Warning: Missing or dummy Slack environment variables: ${missingSlackVars.join(", ")}`);
    console.warn("The app will start but Slack features may not work correctly.");
  }

  const missingOtherVars = otherEnvVars.filter((v) => !process.env[v] || process.env[v] === "dummy");
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
