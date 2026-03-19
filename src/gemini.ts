import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { GeminiAnalysisResult } from "./types.js";

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

■出力フォーマット (JSON)
{
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
過去のIssue状況（スナップショット）が提供された場合、重複する要望がないか確認し、関連性がある場合は説明に含めてください。
`,
    });
  }

  async analyzeMessage(message: string, context?: string): Promise<GeminiAnalysisResult> {
    const prompt = context
      ? `以下のプロジェクト状況（YAML形式）を考慮して、ユーザーの入力を分析してください。\n\n[Project Context]\n${context}\n\n[User Input]\n${message}`
      : message;

    const result = await this.model.generateContent({
      contents: [
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await result.response;
    const text = response.text();
    try {
      return JSON.parse(text) as GeminiAnalysisResult;
    } catch (e) {
      console.error("Failed to parse Gemini response:", text);
      throw e;
    }
  }
}
