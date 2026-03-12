import { GeminiEngine } from "./gemini";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }
  const engine = new GeminiEngine(apiKey);

  const testMessage = "Add a login button to the home page. It should look nice.";
  try {
    const result = await engine.analyzeMessage(testMessage);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error analyzing message:", error);
  }
}

if (require.main === module) {
  main();
}
