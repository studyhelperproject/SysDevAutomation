import { GeminiEngine } from "../src/gemini.js";
import { GitHubClient } from "../src/github.js";

async function testReadTool() {
  console.log("Running test for GeminiEngine Read Tool (get_issue)...");

  const apiKey = "dummy-key";
  const engine = new GeminiEngine(apiKey);

  // Mock GitHubClient
  const mockGitHubClient = {
    getIssue: async (issueNumber: number) => {
      console.log(`- Mock GitHubClient.getIssue called for #${issueNumber}`);
      return `Issue #${issueNumber}: Original Requirement\n\nThis is the content of issue #${issueNumber}.`;
    }
  } as any as GitHubClient;

  // Mock Gemini model and chat
  (engine as any).model = {
    startChat: () => {
      let callCount = 0;
      return {
        sendMessage: async (prompt: any) => {
          callCount++;
          if (callCount === 1) {
            // First call: Gemini returns a function call
            return {
              response: {
                functionCalls: () => [{
                  name: "get_issue",
                  args: { issue_number: 3 }
                }],
                text: () => ""
              }
            };
          } else {
            // Second call: Gemini returns the final JSON analysis
            return {
              response: {
                functionCalls: () => [],
                text: () => JSON.stringify({
                  action: "update",
                  issue_number: 3,
                  category: "[Feature]",
                  title: "Updated Task based on Issue #3",
                  description: "This task was updated using information from Issue #3.",
                  acceptance_criteria: "Given... When... Then...",
                  is_ambiguous: false,
                  missing_info: []
                })
              }
            };
          }
        }
      };
    }
  };

  try {
    const result = await engine.analyzeMessage("Issue #3の内容を元に進めて", undefined, undefined, mockGitHubClient);
    console.log("Analysis Result:", JSON.stringify(result, null, 2));

    if (result.action === "update" && result.issue_number === 3) {
      console.log("✅ Read Tool Test Passed: Gemini correctly called get_issue and used the result.");
    } else {
      console.error("❌ Read Tool Test Failed: Unexpected result.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Read Tool Test Failed with error:", error);
    process.exit(1);
  }
}

testReadTool();
