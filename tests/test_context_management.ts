import { GitHubClient } from "../src/github.js";
import { GeminiAnalysisResult } from "../src/types.js";
import yaml from "js-yaml";

// Mock Octokit
class MockOctokit {
  rest = {
    issues: {
      create: async (params: any) => {
        return { data: { html_url: "https://github.com/mock/issue", ...params } };
      },
      getLabel: async (params: any) => {
        return { data: { name: params.name } };
      },
      createLabel: async (params: any) => {
        return { data: { name: params.name, color: params.color } };
      },
      listForRepo: () => {} // Dummy for paginate
    }
  };

  async paginate(method: any, params: any) {
    if (params.state === "open") {
      return [
        {
          title: "Existing Feature",
          labels: [{ name: "SP: 5" }, { name: "Type: Feature" }],
          pull_request: null
        },
        {
          title: "Clarification Needed",
          labels: [{ name: "[Q]" }],
          pull_request: null
        },
        {
          title: "PR Title",
          labels: [],
          pull_request: {}
        }
      ];
    }
    return [];
  }
}

async function testGetProjectContext() {
  console.log("Running testGetProjectContext...");
  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore
  client.octokit = new MockOctokit();

  const context = await client.getProjectContext();
  console.log("Generated Context:\n", context);

  const parsed = yaml.load(context) as any[];

  if (parsed.length !== 2) {
    console.error(`❌ Test Failed: Expected 2 issues in context, got ${parsed.length}`);
    process.exit(1);
  }

  if (parsed[0].title === "Existing Feature" && parsed[0].labels.includes("Type: Feature")) {
    console.log("✅ Test Passed: Issue 1 correctly captured.");
  } else {
    console.error("❌ Test Failed: Issue 1 data incorrect.");
    process.exit(1);
  }

  if (parsed[1].title === "Clarification Needed" && parsed[1].labels.includes("[Q]")) {
    console.log("✅ Test Passed: Issue 2 correctly captured.");
  } else {
    console.error("❌ Test Failed: Issue 2 data incorrect.");
    process.exit(1);
  }
}

async function testCreateIssueWithMetadata() {
  console.log("Running testCreateIssueWithMetadata...");
  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore
  client.octokit = new MockOctokit();

  const result: GeminiAnalysisResult = {
    category: "[Feature]",
    title: "New Feature",
    description: "Description",
    acceptance_criteria: "Given... When... Then...",
    is_ambiguous: false,
    missing_info: [],
    type: "Feature",
    status: "MVP",
    priority: "P0"
  };

  const issue = await client.createIssue(result);
  console.log("Created Issue Labels:", issue.labels);

  const expectedLabels = ["[Feature]", "Type: Feature", "Status: MVP", "Priority: P0"];
  const allLabelsPresent = expectedLabels.every(l => issue.labels.includes(l));

  if (allLabelsPresent) {
    console.log("✅ Test Passed: All metadata labels correctly applied.");
  } else {
    console.error("❌ Test Failed: Some metadata labels missing.");
    process.exit(1);
  }
}

async function runTests() {
  try {
    await testGetProjectContext();
    await testCreateIssueWithMetadata();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runTests();
