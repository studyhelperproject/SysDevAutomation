import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    console.error("GEMINI_API_KEY is not set or dummy. Cannot list models.");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const response = await genAI.listModels();
    console.log("Available models:");
    response.models.forEach((m) => {
      console.log(`- ${m.name} (DisplayName: ${m.displayName})`);
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
