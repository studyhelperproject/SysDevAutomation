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
    const info = await client.conversations.info({ channel: channelId });
    const channelName = info.ok ? info.channel.name : channelId;
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
    const { permalink } = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

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
      channel,
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
    const { permalink } = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

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
      channel,
      thread_ts: message.ts,
      text: `Error: Failed to process request. ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

// member_joined_channel handler (when bot is added to a channel)
app.event("member_joined_channel", async ({ event, client, logger }: any) => {
  try {
    // Check if the joined member is this bot
    const auth = await client.auth.test();
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
  const requiredEnvVars = [
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
    "GITHUB_TOKEN",
    "GITHUB_REPO",
    "GEMINI_API_KEY",
  ];

  if (socketMode) {
    requiredEnvVars.push("SLACK_APP_TOKEN");
  }

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(", ")}`);
    console.error("Please check your .env file.");
    process.exit(1);
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
