import { GeminiEngine } from "./gemini.js";
import { GitHubClient } from "./github.js";
import { GeminiAnalysisResult } from "./types.js";
import { App } from "@slack/bolt";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

export const githubClient = new GitHubClient(
  process.env.GITHUB_TOKEN || "dummy",
  process.env.GITHUB_REPO || "studyhelperproject/SysDevAutomation"
);
export const geminiEngine = new GeminiEngine(process.env.GEMINI_API_KEY || "dummy");

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN || "xoxb-dummy",
  signingSecret: process.env.SLACK_SIGNING_SECRET || "dummy",
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN || "xapp-dummy",
});

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

// app_mention handler
app.event("app_mention", async ({ event, client, logger }: any) => {
  try {
    const { text, ts, channel } = event;

    // Get Slack message link
    const { permalink } = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

    // Fetch project context from GitHub
    const context = await githubClient.getProjectContext();

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text, context);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await githubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: formatSlackReply(result, issue.html_url),
    });
  } catch (error) {
    logger.error(error);
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

    // Fetch project context from GitHub
    const context = await githubClient.getProjectContext();

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text, context);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await githubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: formatSlackReply(result, issue.html_url),
    });
  } catch (error) {
    logger.error(error);
  }
});

export async function main() {
  const requiredEnvVars = [
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
    "SLACK_APP_TOKEN",
    "GITHUB_TOKEN",
    "GITHUB_REPO",
    "GEMINI_API_KEY",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`Error: Missing required environment variables: ${missingVars.join(", ")}`);
    console.error("Please check your .env file.");
    process.exit(1);
  }

  try {
    await app.start();
    console.log("⚡️ Bolt app is running!");
  } catch (error) {
    console.error("Error starting app:", error);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
