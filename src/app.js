require('dotenv').config();
const { App } = require('@slack/bolt');

/**
 * Helper to generate a Slack archive link for traceability
 * @param {string} channel - Channel ID
 * @param {string} ts - Message timestamp
 * @returns {string}
 */
function getMessageLink(channel, ts) {
  return `https://slack.com/archives/${channel}/p${ts.replace('.', '')}`;
}

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN || 'xoxb-dummy',
  signingSecret: process.env.SLACK_SIGNING_SECRET || 'dummy'
});

/**
 * app_mention event handler
 * Triggered when the app is mentioned in a channel.
 */
app.event('app_mention', async ({ event, context, logger }) => {
  try {
    const { text, user, ts, channel } = event;
    const messageLink = getMessageLink(channel, ts);

    console.log('--- App Mention Received ---');
    console.log('Raw Event Data:', JSON.stringify(event, null, 2));
    console.log(`User: ${user}`);
    console.log(`Text: ${text}`);
    console.log(`Timestamp: ${ts}`);
    console.log(`Link: ${messageLink}`);
    console.log('---------------------------');

    return { text, user, ts, channel, messageLink };
  } catch (error) {
    logger.error('Error handling app_mention event:', error);
  }
});

/**
 * message.im event handler
 * Triggered when a direct message is sent to the app.
 */
app.message(async ({ message, logger }) => {
  // Filter for messages in direct message channels (IMs)
  if (message.channel_type === 'im') {
    try {
      const { text, user, ts, channel } = message;
      const messageLink = getMessageLink(channel, ts);

      console.log('--- Direct Message Received ---');
      console.log('Raw Message Data:', JSON.stringify(message, null, 2));
      console.log(`User: ${user}`);
      console.log(`Text: ${text}`);
      console.log(`Timestamp: ${ts}`);
      console.log(`Link: ${messageLink}`);
      console.log('------------------------------');

      return { text, user, ts, channel, messageLink };
    } catch (error) {
      logger.error('Error handling message.im event:', error);
    }
  }
});

// Start the app if this file is run directly
if (require.main === module) {
  (async () => {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ SysDevAutomation Slack App is running on port ${port}!`);
  })();
}

module.exports = { app, getMessageLink };
