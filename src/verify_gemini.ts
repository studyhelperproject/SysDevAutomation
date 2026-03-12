import { GeminiEngine } from "./gemini.js";
import * as dotenv from "dotenv";

dotenv.config();

async function verify() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    console.warn("GEMINI_API_KEY is not set or dummy. Mocking response for verification.");
    mockVerify();
    return;
  }

  const engine = new GeminiEngine(apiKey);

  const testCases = [
    {
      name: "Clear Feature",
      message: "ログイン画面にGoogle連携ボタンを追加して。MVPに必須です。"
    },
    {
      name: "Ambiguous Request",
      message: "デザインをいい感じにしておいて。"
    }
  ];

  for (const testCase of testCases) {
    console.log(`--- Testing: ${testCase.name} ---`);
    console.log(`Input: ${testCase.message}`);
    try {
      const result = await engine.analyzeMessage(testCase.message);
      console.log("Output:", JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Error:", error);
    }
    console.log("\n");
  }
}

function mockVerify() {
    const results = [
        {
            name: "Clear Feature",
            output: {
                category: "[Feature]",
                title: "Google連携ボタンの追加",
                description: "ログイン画面にGoogle連携ボタンを追加し、認証を可能にする。",
                acceptance_criteria: "Given ログイン画面が表示されている When Google連携ボタンを押す Then Google認証画面に遷移する",
                is_ambiguous: false,
                missing_info: []
            }
        },
        {
            name: "Ambiguous Request",
            output: {
                category: "[Clarify]",
                title: "デザインの改善",
                description: "デザインを『いい感じ』にする。",
                acceptance_criteria: "",
                is_ambiguous: true,
                missing_info: ["具体的なデザインの変更希望点", "参考イメージ", "対象の画面"]
            }
        }
    ];
    results.forEach(r => {
        console.log(`--- Testing: ${r.name} (MOCKED) ---`);
        console.log("Output:", JSON.stringify(r.output, null, 2));
    });
}

verify();
