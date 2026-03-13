import { GitHubClient } from "../src/github.js";
import { GeminiAnalysisResult } from "../src/types.js";
import { assert } from "console";

// Mock Octokit
class MockOctokit {
  rest = {
    issues: {
      create: async (params: any) => {
        return { data: { html_url: "https://github.com/mock/issue", ...params } };
      }
    }
  };
}

async function testGitHubClientAmbiguity() {
  console.log("Running testGitHubClientAmbiguity...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore: Access private property for testing or inject mock
  client.octokit = new MockOctokit();

  const ambiguousResult: GeminiAnalysisResult = {
    category: "[Feature]",
    title: "Vague Requirement",
    description: "Do something nicely.",
    acceptance_criteria: "Given... When... Then...",
    is_ambiguous: true,
    missing_info: ["What exactly?"]
  };

  const issue = await client.createIssue(ambiguousResult);

  console.log("Created Issue Title:", issue.title);
  console.log("Created Issue Labels:", issue.labels);

  if (issue.title.startsWith("[Clarify]") && issue.labels.includes("[Q]")) {
    console.log("✅ Test Passed: Ambiguous result correctly converted to [Clarify] and [Q] label.");
  } else {
    console.error("❌ Test Failed: Ambiguous result was not correctly handled.");
    process.exit(1);
  }

  if (issue.body.includes("## Missing Information")) {
    console.log("✅ Test Passed: Missing Information included in body.");
  } else {
    console.error("❌ Test Failed: Missing Information not found in body.");
    process.exit(1);
  }
}

testGitHubClientAmbiguity().catch(err => {
  console.error(err);
  process.exit(1);
});
