import { app } from '../src/index.js';
import http from 'http';
import crypto from 'crypto';

async function testChallenge() {
  const port = 3001;
  await app.start(port);
  console.log(`Test app started on port ${port}`);

  const challenge = "test_challenge_123";
  const postData = JSON.stringify({
    type: "url_verification",
    challenge: challenge
  });

  const signingSecret = 'dummy';
  const timestamp = Math.floor(Date.now() / 1000);
  const sigBaseString = `v0:${timestamp}:${postData}`;
  const signature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBaseString)
    .digest('hex');

  const options = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-Slack-Signature': signature,
      'X-Slack-Request-Timestamp': timestamp.toString()
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', async () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', body);

      // Bolt handles url_verification automatically.
      // It returns 200 and the challenge if correctly formatted, even without a valid signature.
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse response body as JSON:', body);
      }

      if (res.statusCode === 200 && data && data.challenge === challenge) {
        console.log('✅ Challenge test passed!');
      } else {
        // If it fails with 401, it might be because Bolt now enforces signatures even for challenges
        // in some versions or configurations when endpoints are unified.
        // However, usually url_verification is an exception.
        // In this case, we see it failed with 401 in the previous run.
        console.error('❌ Challenge test failed!');
        process.exit(1);
      }

      // Test GET to root
      const getReq = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET'
      }, (getRes) => {
        let getBody = '';
        getRes.on('data', (chunk) => getBody += chunk);
        getRes.on('end', () => {
          console.log('GET / status:', getRes.statusCode);
          console.log('GET / body:', getBody);
          if (getRes.statusCode === 200 && getBody.includes('Slack events are accepted at /')) {
            console.log('✅ GET / test passed!');
          } else {
            console.error('❌ GET / test failed!');
            process.exit(1);
          }
        });
      });
      getReq.end();

      // Test health check
      const healthReq = http.request({
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET'
      }, (healthRes) => {
        let healthBody = '';
        healthRes.on('data', (chunk) => healthBody += chunk);
        healthRes.on('end', async () => {
          console.log('Health check status:', healthRes.statusCode);
          console.log('Health check body:', healthBody);
          if (healthRes.statusCode === 200 && healthBody === 'OK') {
            console.log('✅ Health check test passed!');
            await app.stop();
            process.exit(0);
          } else {
            console.error('❌ Health check test failed!');
            process.exit(1);
          }
        });
      });
      healthReq.end();
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

testChallenge().catch(err => {
  console.error(err);
  process.exit(1);
});
