import { GoogleGenerativeAI, GenerativeModel, SchemaType } from "@google/generative-ai";
import { GeminiAnalysisResult } from "./types.js";
import { GitHubClient } from "./github.js";

export class GeminiEngine {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      systemInstruction: `
あなたは一流のITプロジェクトマネージャー兼システムアナリストです。
顧客の曖昧な発言を、エンジニアが即座に実装可能な「厳密な仕様」に変換するのが任務です。

Slackからの入力を分析し、以下のいずれかのアクションを選択し、指定のJSON形式で出力してください。

■アクションの種類
- create: 新規にIssueを作成する。
- update: 既存のIssueの内容を更新する。特に [Clarify] ラベルの付いたIssueに対して、ユーザーから追加情報が得られた場合に使用する。
- comment: 既存のIssueにコメントを追加する。進捗の報告や、軽微な追記に使用する。

■分類タグの定義
- [Feature]: 実装すべき機能。仕様が明確なもの。
- [Clarify]: 定義が不足しており、見積もり不能な項目。
- [Dependency]: お客様側での作業や、提供が必要なデータ（画像、APIキー等）。
- [Estimate]: 工数増加が伴う追加要望。
- [Out of Scope]: 今回のMVPには含めない（バックログ行き）項目。

■判定基準（判定ロジック）
- 「適宜」「いい感じに」「お任せ」「検討中」「必要に応じて」「適切に」「など」といった曖昧な表現、または具体的な数値（秒、個数、色指定など）が欠けている場合は、強制的に is_ambiguous: true と判定し、category: [Clarify] を選択してください。
- 「ログイン機能を追加して」といった抽象的で範囲が広すぎる要望も、具体的な要件が特定できないため is_ambiguous: true とし、category: [Clarify] としてください。
- [Feature] と判定するためには、その機能が「何を」「いつ」「どのように」するかが明確である必要があります（例：「Google OAuthを使用したログイン機能を追加し、ユーザー情報をDBに保存する」は [Feature]）。
- [Feature] の場合、Acceptance Criteria（受入基準）を「Given/When/Then」形式で記述してください。
- **重要**: 既存の [Clarify] Issueに関連する発言の場合、新規作成（create）せず、既存のIssueを更新（update）またはコメント（comment）してください。これにより情報の断片化を防ぎます。
- **重要**: ユーザーが過去のIssue番号（例：Issue #3）やGitHubのIssue URLに言及し、その内容を知る必要がある場合は、必ず get_issue ツールを使用して内容を確認してください。

■出力フォーマット (JSON)
{
  "action": "create | update | comment",
  "issue_number": number (update/commentの場合に必須),
  "category": "[Feature] | [Clarify] | [Dependency] | [Estimate] | [Out of Scope]",
  "title": "Issueのタイトル（簡潔かつ具体的）",
  "description": "詳細な説明",
  "acceptance_criteria": "Given... When... Then... (Feature以外の場合は空文字列でも可)",
  "is_ambiguous": boolean,
  "missing_info": ["具体的に何が足りないかを解消するための、顧客への質問リスト"],
  "type": "Feature | Bug | Task (optional)",
  "status": "MVP | Optional | Pending (optional)",
  "priority": "P0 | P1 | P2 (optional)"
}

■コンテキストの活用
過去のIssue状況（スナップショット）が提供された場合、重複する要望がないか確認してください。
既存のIssueを更新（update）する場合は、元の内容（description等）を活かしつつ、最新の情報を反映させた「完成版」のIssue内容を提供してください。
Slackのスレッド履歴が提供された場合、これまでの会話の流れを把握し、すでにユーザーから提供された情報を再度質問しないようにしてください。
`,
      tools: [
        {
          functionDeclarations: [
            {
              name: "get_issue",
              description: "GitHub Issueの内容（タイトルと本文）を取得します。",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  issue_number: {
                    type: SchemaType.NUMBER,
                    description: "取得するIssueの番号（例：3）",
                  },
                },
                required: ["issue_number"],
              },
            },
          ],
        },
      ],
    });
  }

  async analyzeMessage(message: string, context?: string, threadHistory?: string, githubClient?: GitHubClient): Promise<GeminiAnalysisResult> {
    let prompt = "";
    if (context) {
      prompt += `以下のプロジェクト状況（YAML形式）を考慮して、ユーザーの入力を分析してください。\n\n[Project Context]\n${context}\n\n`;
    }
    if (threadHistory) {
      prompt += `以下のスレッド履歴を考慮して、ユーザーの最新の入力を分析してください。これまでの会話の流れを把握し、重複した質問を避けてください。\n\n[Thread History]\n${threadHistory}\n\n`;
    }
    prompt += `[User Input]\n${message}`;

    const chat = this.model.startChat();
    let result = await chat.sendMessage(prompt);
    let response = result.response;

    // Handle function calls loop
    while (response.functionCalls() && response.functionCalls()!.length > 0) {
      const toolResults: any[] = [];
      for (const call of response.functionCalls()!) {
        if (call.name === "get_issue" && githubClient) {
          const { issue_number } = call.args as { issue_number: number };
          console.log(`- Calling get_issue tool for Issue #${issue_number}`);
          const issueContent = await githubClient.getIssue(issue_number);
          toolResults.push({
            functionResponse: {
              name: "get_issue",
              response: { content: issueContent },
            },
          });
        }
      }

      if (toolResults.length > 0) {
        result = await chat.sendMessage(toolResults);
        response = result.response;
      } else {
        break;
      }
    }

    const text = response.text();
    try {
      // Remove possible markdown block formatting
      const cleanedText = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      return JSON.parse(cleanedText) as GeminiAnalysisResult;
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      throw e;
    }
  }
}
