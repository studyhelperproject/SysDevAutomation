import { GeminiEngine } from "./gemini.js";
import { GitHubClient } from "./github.js";
import { App, SlackEventMiddlewareArgs, SlackMessageMiddlewareArgs } from "@slack/bolt";
import * as dotenv from "dotenv";
import { fileURLToPath } from 'url';

dotenv.config();

export const githubClient = new GitHubClient(
  process.env.GITHUB_TOKEN || "",
  process.env.GITHUB_REPO || "studyhelperproject/SysDevAutomation"
);
export const geminiEngine = new GeminiEngine(process.env.GEMINI_API_KEY || "");

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN || "xoxb-dummy",
  signingSecret: process.env.SLACK_SIGNING_SECRET || "dummy",
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN || "xapp-dummy",
});

// app_mention handler
app.event("app_mention", async ({ event, client, logger }: any) => {
  try {
    const { text, ts, channel } = event;

    // Get Slack message link
    const { permalink } = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await githubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: `GitHub Issue created: ${issue.html_url}\nCategory: ${result.category}`,
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

    // Analyze message with Gemini
    const result = await geminiEngine.analyzeMessage(text);
    console.log("Gemini Analysis:", JSON.stringify(result, null, 2));

    // Create GitHub issue
    const issue = await githubClient.createIssue(result, permalink);
    console.log("GitHub Issue Created:", issue.html_url);

    // Reply to Slack
    await client.chat.postMessage({
      channel,
      thread_ts: ts,
      text: `GitHub Issue created: ${issue.html_url}\nCategory: ${result.category}`,
    });
  } catch (error) {
    logger.error(error);
  }
});

export async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }
  if (!process.env.GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is not set.");
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
