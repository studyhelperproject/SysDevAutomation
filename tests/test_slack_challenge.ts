import { app } from '../src/index.js';
import http from 'http';

async function testChallenge() {
  const port = 3001;
  await app.start(port);
  console.log(`Test app started on port ${port}`);

  const challenge = "test_challenge_123";
  const postData = JSON.stringify({
    type: "url_verification",
    challenge: challenge
  });

  const options = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', async () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', body);

      const data = JSON.parse(body);
      if (res.statusCode === 200 && data.challenge === challenge) {
        console.log('✅ Challenge test passed!');
      } else {
        console.error('❌ Challenge test failed!');
        process.exit(1);
      }

      // Test non-challenge POST to root
      const nonChallengePostData = JSON.stringify({ type: "some_other_event" });
      const nonChallengeReq = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': nonChallengePostData.length
        }
      }, (nonChallengeRes) => {
        let ncBody = '';
        nonChallengeRes.on('data', (chunk) => ncBody += chunk);
        nonChallengeRes.on('end', () => {
          console.log('Non-challenge POST status:', nonChallengeRes.statusCode);
          console.log('Non-challenge POST body:', ncBody);
          if (nonChallengeRes.statusCode === 404 && ncBody.includes('Slack events should be sent to /slack/events')) {
            console.log('✅ Non-challenge POST test passed!');
          } else {
            console.error('❌ Non-challenge POST test failed!');
            process.exit(1);
          }
        });
      });
      nonChallengeReq.write(nonChallengePostData);
      nonChallengeReq.end();

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
