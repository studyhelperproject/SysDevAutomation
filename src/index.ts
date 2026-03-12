import { GeminiEngine } from "./gemini";
import pkg from "@slack/bolt";
const { App } = pkg;
import * as dotenv from "dotenv";

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// app_mention handler
app.event("app_mention", async ({ event, client, logger }) => {
  try {
    const { text, user, ts, channel } = event;
    const permalink = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

    console.log("Received app_mention:");
    console.log({
      text,
      user,
      ts,
      channel,
      permalink: permalink.permalink,
    });
  } catch (error) {
    logger.error(error);
  }
});

// message.im handler
app.message(async ({ message, client, logger }) => {
  // Only handle messages in IMs
  if (message.channel_type !== "im") return;
  // Ignore bot messages
  if ("bot_id" in message) return;

  try {
    // message might be a generic message or a subtype, but for IMs we usually care about the basic fields
    // @ts-ignore
    const { text, user, ts, channel } = message;
    const permalink = await client.chat.getPermalink({
      channel,
      message_ts: ts,
    });

    console.log("Received message.im:");
    console.log({
      text,
      user,
      ts,
      channel,
      permalink: permalink.permalink,
    });
  } catch (error) {
    logger.error(error);
  }
});

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }
  const engine = new GeminiEngine(apiKey);

  const testMessage = "Add a login button to the home page. It should look nice.";
  try {
    await app.start();
    console.log("⚡️ Bolt app is running!");

    // Keep the existing test logic for now, or remove if not needed.
    // For this issue, we just need the app to start.
    // const result = await engine.analyzeMessage(testMessage);
    // console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error starting app:", error);
  }
}

if (require.main === module) {
  main();
}
