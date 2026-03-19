import * as dotenv from "dotenv";

dotenv.config();

interface Model {
  name: string;
  displayName: string;
  description: string;
  supportedGenerationMethods: string[];
}

interface ListModelsResponse {
  models: Model[];
}

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    console.error("GEMINI_API_KEY is not set or dummy. Cannot list models.");
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as ListModelsResponse;

    console.log("Available models:");
    data.models.forEach((m: Model) => {
      console.log(`- ${m.name} (DisplayName: ${m.displayName})`);
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
