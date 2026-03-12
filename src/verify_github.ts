import { GitHubClient } from "./github.js";
import { GeminiAnalysisResult } from "./types.js";
import * as dotenv from "dotenv";

dotenv.config();

async function verify() {
  const token = process.env.GITHUB_TOKEN;
  const repo = "studyhelperproject/SysDevAutomation"; // Fixed repository as per project setup

  if (!token || token === "your-github-token") {
    console.warn("GITHUB_TOKEN is not set. Mocking GitHubClient.");
    mockVerify();
    return;
  }

  const client = new GitHubClient(token, repo);

  const testCases: GeminiAnalysisResult[] = [
    {
      category: "[Feature]",
      title: "Google連携ボタンの追加",
      description: "ログイン画面にGoogle連携ボタンを追加し、認証を可能にする。",
      acceptance_criteria: "Given ログイン画面が表示されている\nWhen Google連携ボタンを押す\nThen Google認証画面に遷移する",
      is_ambiguous: false,
      missing_info: []
    },
    {
      category: "[Clarify]",
      title: "デザインの改善",
      description: "デザインを『いい感じ』にする。",
      acceptance_criteria: "",
      is_ambiguous: true,
      missing_info: ["具体的なデザインの変更希望点", "参考イメージ", "対象の画面"]
    }
  ];

  for (const testCase of testCases) {
    console.log(`--- Creating Issue for: ${testCase.title} ---`);
    try {
      const mockSlackLink = "https://slack.com/archives/C12345/p123456789";
      const issue = await client.createIssue(testCase, mockSlackLink);
      console.log(`Issue created successfully: ${issue.html_url}`);
    } catch (error) {
      console.error("Error creating issue:", error);
    }
  }
}

function mockVerify() {
  const testCases: GeminiAnalysisResult[] = [
    {
      category: "[Feature]",
      title: "Google連携ボタンの追加",
      description: "ログイン画面にGoogle連携ボタンを追加し、認証を可能にする。",
      acceptance_criteria: "Given ログイン画面が表示されている\nWhen Google連携ボタンを押す\nThen Google認証画面に遷移する",
      is_ambiguous: false,
      missing_info: []
    },
    {
      category: "[Clarify]",
      title: "デザインの改善",
      description: "デザインを『いい感じ』にする。",
      acceptance_criteria: "",
      is_ambiguous: true,
      missing_info: ["具体的なデザインの変更希望点", "参考イメージ", "対象の画面"]
    }
  ];

  for (const testCase of testCases) {
    console.log(`--- [MOCKED] Creating Issue for: ${testCase.title} ---`);
    const labelMap: Record<string, string> = {
      "[Feature]": "[Feature]",
      "[Clarify]": "[Q]",
      "[Dependency]": "[Dependency]",
      "[Estimate]": "[Estimate]",
      "[Out of Scope]": "[Out of Scope]",
    };

    const label = labelMap[testCase.category] || testCase.category;

    let body = `## Description\n${testCase.description}\n\n`;

    if (testCase.category === "[Feature]" && testCase.acceptance_criteria) {
      body += `## Acceptance Criteria\n${testCase.acceptance_criteria}\n\n`;
    }

    if (testCase.is_ambiguous && testCase.missing_info.length > 0) {
      body += `## Missing Information\n`;
      testCase.missing_info.forEach((info) => {
        body += `- ${info}\n`;
      });
      body += `\n`;
    }

    const mockSlackLink = "https://slack.com/archives/C12345/p123456789";
    if (mockSlackLink) {
      body += `## Traceability\n- [Slack Message](${mockSlackLink})\n\n`;
    }

    console.log("Title:", `${testCase.category} ${testCase.title}`);
    console.log("Labels:", [label]);
    console.log("Body:\n", body);
    console.log("--- End of Mocked Issue ---\n");
  }
}

verify();
