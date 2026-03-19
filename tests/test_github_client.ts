import { GitHubClient } from "../src/github.js";
import { GeminiAnalysisResult } from "../src/types.js";

// Mock Octokit
class MockOctokit {
  rest = {
    users: {
      getAuthenticated: async () => {
        return { data: { login: "owner" } };
      }
    },
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
      update: async (params: any) => {
        return { data: { html_url: `https://github.com/mock/issue/${params.issue_number}`, ...params } };
      },
      createComment: async (params: any) => {
        return { data: { html_url: `https://github.com/mock/issue/${params.issue_number}#comment`, ...params } };
      }
    }
  };
}

async function testGitHubClientAssignToJules() {
  console.log("Running testGitHubClientAssignToJules...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore: Access private property for testing or inject mock
  client.octokit = new MockOctokit();

  const featureResult: GeminiAnalysisResult = {
    action: "create",
    category: "[Feature]",
    title: "Clear Requirement",
    description: "Implement search feature.",
    acceptance_criteria: "Given... When... Then...",
    is_ambiguous: false,
    missing_info: []
  };

  const issue = await client.createIssue(featureResult);

  console.log("Created Issue Title:", issue.title);
  console.log("Created Issue Labels:", issue.labels);

  if (issue.labels.includes("assign-to-jules") && issue.labels.includes("[Feature]")) {
    console.log("✅ Test Passed: [Feature] issue correctly assigned 'assign-to-jules' label.");
  } else {
    console.error("❌ Test Failed: [Feature] issue was not correctly labeled.");
    process.exit(1);
  }
}

async function testGitHubClientAmbiguity() {
  console.log("Running testGitHubClientAmbiguity...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore: Access private property for testing or inject mock
  client.octokit = new MockOctokit();

  const ambiguousResult: GeminiAnalysisResult = {
    action: "create",
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

async function testGitHubClientUpdate() {
  console.log("Running testGitHubClientUpdate...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore
  client.octokit = new MockOctokit();

  const updateResult: GeminiAnalysisResult = {
    action: "update",
    issue_number: 123,
    category: "[Feature]",
    title: "Updated Title",
    description: "Updated description.",
    acceptance_criteria: "Updated criteria.",
    is_ambiguous: false,
    missing_info: []
  };

  const issue = await client.updateIssue(123, updateResult);

  console.log("Updated Issue URL:", issue.html_url);
  console.log("Updated Issue Title:", issue.title);

  if (issue.issue_number === 123 && issue.title.includes("Updated Title")) {
    console.log("✅ Test Passed: Issue correctly updated.");
  } else {
    console.error("❌ Test Failed: Issue was not correctly updated.");
    process.exit(1);
  }
}

async function testGitHubClientComment() {
  console.log("Running testGitHubClientComment...");

  const client = new GitHubClient("fake-token", "owner/repo");
  // @ts-ignore
  client.octokit = new MockOctokit();

  const commentBody = "This is a test comment.";
  const comment = await client.addComment(123, commentBody);

  console.log("Comment URL:", comment.html_url);
  console.log("Comment Body:", comment.body);

  if (comment.issue_number === 123 && comment.body === commentBody) {
    console.log("✅ Test Passed: Comment correctly added.");
  } else {
    console.error("❌ Test Failed: Comment was not correctly added.");
    process.exit(1);
  }
}

async function runTests() {
  await testGitHubClientAssignToJules();
  await testGitHubClientAmbiguity();
  await testGitHubClientUpdate();
  await testGitHubClientComment();
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
