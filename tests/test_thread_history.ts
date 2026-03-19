import { GeminiEngine } from "../src/gemini.js";

async function testThreadHistoryIntegration() {
  console.log("Running test for thread history integration in GeminiEngine...");

  const apiKey = "dummy-key";
  const engine = new GeminiEngine(apiKey);

  let capturedPrompt = "";

  // Mocking the model to capture the constructed prompt
  (engine as any).model = {
    startChat: () => ({
      sendMessage: async (prompt: string) => {
        capturedPrompt = prompt;
        return {
          response: {
            functionCalls: () => [],
            text: () => JSON.stringify({
              category: "[Feature]",
              title: "Mocked Task",
              description: "A task analyzed with thread history.",
              acceptance_criteria: "Given... When... Then...",
              is_ambiguous: false,
              missing_info: []
            })
          }
        };
      }
    }),
    modelName: "gemini-3-flash-preview"
  };

  const message = "Explain more about the login button";
  const context = "Project: Auth System\nIssues: []";
  const threadHistory = "User: How do I add a login button?\nBot: You can use the button component.";

  try {
    const result = await engine.analyzeMessage(message, context, threadHistory);

    console.log("Captured Prompt:\n", capturedPrompt);
    console.log("Analysis Result:", JSON.stringify(result, null, 2));

    const hasContext = capturedPrompt.includes("[Project Context]");
    const hasHistory = capturedPrompt.includes("[Thread History]");
    const hasInput = capturedPrompt.includes("[User Input]");
    const hasCorrectHistory = capturedPrompt.includes("User: How do I add a login button?");

    if (hasContext && hasHistory && hasInput && hasCorrectHistory) {
      console.log("✅ Test Passed: GeminiEngine correctly constructs the prompt with context, history, and user input.");
    } else {
      console.error("❌ Test Failed: Prompt construction mismatch.");
      console.log("hasContext:", hasContext);
      console.log("hasHistory:", hasHistory);
      console.log("hasInput:", hasInput);
      console.log("hasCorrectHistory:", hasCorrectHistory);
    }
  } catch (error) {
    console.error("❌ Test Failed with error:", error);
  }
}

testThreadHistoryIntegration();
