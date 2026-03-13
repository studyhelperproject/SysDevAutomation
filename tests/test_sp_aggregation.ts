import { GitHubClient } from "../src/github.js";

// Mock Octokit for SP aggregation
class MockOctokit {
  rest = {
    issues: {
      listForRepo: () => {} // Not used directly in paginate mock but defined for completeness
    }
  };

  async paginate(method: any, params: any) {
    // Return mock issues
    return [
      {
        pull_request: false,
        labels: [{ name: "SP: 5" }, { name: "bug" }]
      },
      {
        pull_request: false,
        labels: ["SP: 3", "[Feature]"]
      },
      {
        pull_request: true, // Should be skipped
        labels: [{ name: "SP: 8" }]
      },
      {
        pull_request: false,
        labels: [{ name: "SP:13" }] // No space
      },
      {
        pull_request: false,
        labels: [{ name: "sp: 2" }] // Case insensitive
      },
      {
        pull_request: false,
        labels: [{ name: "SP: invalid" }] // Invalid
      }
    ];
  }
}

async function testSPAggregation() {
  console.log("Running testSPAggregation...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore: Inject mock
  client.octokit = new MockOctokit();

  const totalSP = await client.calculateTotalSP();

  console.log(`Calculated Total SP: ${totalSP}`);

  // 5 + 3 + 13 + 2 = 23
  const expectedSP = 23;

  if (totalSP === expectedSP) {
    console.log("✅ Test Passed: SP correctly aggregated.");
  } else {
    console.error(`❌ Test Failed: Expected ${expectedSP}, but got ${totalSP}.`);
    process.exit(1);
  }
}

testSPAggregation().catch(err => {
  console.error(err);
  process.exit(1);
});
