import { Storage } from "../src/storage.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// NOTE: We need to use a separate file for testing mapping to avoid polluting actual data
// Since Storage uses a hardcoded MAPPING_FILE, we'll test the logic by instantiating it
// and then manually checking if we can mock the file system if needed,
// but for this environment, let's just test the class logic with a temporary override if possible.

async function testRepoAutomation() {
  console.log("Running testRepoAutomation...");

  const storage = new Storage();
  const channelId = "TEST_CH_123";
  const repoName = "owner/test-repo";

  // Test 1: setRepo and getRepo
  storage.setRepo(channelId, repoName);
  const retrieved = storage.getRepo(channelId);

  if (retrieved === repoName) {
    console.log("✅ Test 1 Passed: setRepo and getRepo work correctly.");
  } else {
    console.error(`❌ Test 1 Failed: Expected ${repoName}, got ${retrieved}`);
    process.exit(1);
  }

  // Test 2: persistence (simulated by re-instantiating)
  const storage2 = new Storage();
  const retrieved2 = storage2.getRepo(channelId);
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
