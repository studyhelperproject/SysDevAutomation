import { FileStorage } from "../src/storage.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

async function testRepoAutomation() {
  console.log("Running testRepoAutomation...");

  const storage = new FileStorage();
  const channelId = "TEST_CH_123_" + Date.now();
  const repoName = "owner/test-repo";

  // Test 1: setRepo and getRepo
  await storage.setRepo(channelId, repoName);
  const retrieved = await storage.getRepo(channelId);

  if (retrieved === repoName) {
    console.log("✅ Test 1 Passed: setRepo and getRepo work correctly.");
  } else {
    console.error(`❌ Test 1 Failed: Expected ${repoName}, got ${retrieved}`);
    process.exit(1);
  }

  // Test 2: persistence (simulated by re-instantiating)
  const storage2 = new FileStorage();
  const retrieved2 = await storage2.getRepo(channelId);
  if (retrieved2 === repoName) {
    console.log("✅ Test 2 Passed: Persistence works.");
  } else {
    console.error(`❌ Test 2 Failed: Expected ${repoName} to be persisted, got ${retrieved2}`);
    process.exit(1);
  }

  console.log("All repo automation tests passed!");
}

testRepoAutomation().catch(err => {
  console.error(err);
  process.exit(1);
});
