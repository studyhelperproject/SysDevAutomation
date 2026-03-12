/**
 * Improved test script to verify Slack event handlers in src/app.js
 */

// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test';
process.env.SLACK_SIGNING_SECRET = 'test-secret';

const { app, getMessageLink } = require('../src/app.js');

async function testHandlers() {
  console.log('Starting Slack integration tests...');

  const mockData = {
    text: 'Test message',
    user: 'U12345',
    ts: '1234567890.123456',
    channel: 'C67890'
  };

  console.log('\n--- Verifying getMessageLink helper ---');
  const generatedLink = getMessageLink(mockData.channel, mockData.ts);
  const expectedLink = 'https://slack.com/archives/C67890/p1234567890123456';

  console.log(`Generated Link: ${generatedLink}`);
  if (generatedLink === expectedLink) {
    console.log('✅ getMessageLink helper logic is correct');
  } else {
    console.error(`❌ getMessageLink helper logic failed. Expected ${expectedLink}, got ${generatedLink}`);
    process.exit(1);
  }

  // Verify that the handlers are registered
  // Bolt stores listeners in an internal array
  if (app.listeners && app.listeners.length > 0) {
    console.log(`✅ App has ${app.listeners.length} listeners registered`);
  } else {
    console.error('❌ No listeners registered in the Bolt app');
    process.exit(1);
  }

  console.log('\nAll tests passed successfully!');
  process.exit(0);
}

testHandlers().catch(err => {
  console.error(err);
  process.exit(1);
});
