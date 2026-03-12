# SysDevAutomation: 情報の非対称性を埋めるフィルタリングシステム

「人の介入を最小限にし、機械的に要件を詰める」ための、AIによる要件定義・プロジェクト管理自動化システムです。

## 1. システム概要

本システムは、お客様からの曖昧な入力をGeminiが「翻訳者」として解析し、構造化されたGitHub Issueへ自動変換する要件変換パイプラインです。

### 全体像：AIによる要件変換パイプライン

1.  **Input**: お客様からのコメント（Slackメンション、チャット、面談メモなど）。
2.  **Gemini Analysis**: テンプレートに沿って内容を分類・構造化。
3.  **Action Selection**:
    *   **明確な要件** → Development Issue 作成 ＋ 見積もり加算。
    *   **不明確・曖昧な点** → Clarification Issue（質問状）作成 ＋ お客様へ返信。
    *   **リソース不足** → Data Request（素材・権限要求）発行。
4.  **Output**: GitHub Projectの更新、見積書の自動修正、お客様への回答。

---

## 2. 曖昧さを排除する「要件定義テンプレート」

Geminiは以下の分類定義に基づき、入力を厳密に評価します。

### 分類タグの定義
-   **[Feature]**: 実装すべき機能。
-   **[Clarify]**: 定義が不足しており、見積もり不能な項目。
-   **[Dependency]**: お客様側での作業や、提供が必要なデータ。
-   **[Estimate]**: 工数増加が伴う追加要望。
-   **[Out of Scope]**: 今回のMVPには含めない（バックログ行き）項目。

### 判定基準（判定ロジック）
「適宜」「いい感じに」「お任せ」「検討中」といった曖昧な表現、または具体的な数値（秒、個数、色指定など）が欠けている場合は、強制的に **Status: Pending (Ambiguous)** と判定し、GitHubに `[Q]` ラベルのIssueを作成します。

---

## 3. システム構成

Slackをフロントエンド、Geminiをバックエンドロジック、GitHubを管理基盤とする構成です。

*   **Front**: Slack (お客様からの要望・連絡)
*   **Bridge**: Slack Bolt (Node.js) / Cloud Functions
*   **Brain**: Gemini 2.5 Pro (API)
*   **Back**: GitHub API (Issues, Projects)
*   **Dev Env**: Google Jules (GitHub上のIssueを元に開発)

---

## 4. 処理フロー：曖昧さを排除する判定マトリクス

| 入力例 | 判定 | アクション | 返答/対応例 |
| :--- | :--- | :--- | :--- |
| 「ログイン機能を付けて」 | **Clarify** | Issueを作らず保留 | 「認証方法は？（SNS/メール？）」等の質問 |
| 「ログインはGoogle連携のみで」 | **[Feature]** | Issue起票（受入基準定義） | 「承知しました。Issue #12として登録しました」 |
| 「ロゴをいい感じに変えて」 | **DataRequest** | 資産待ちラベルのIssue起票 | 「ロゴの元データ（AI/PNG）を送ってください」 |
| 「やっぱりこれも追加で」 | **[Estimate]** | 見積もり加算ラベルのIssue起票 | 「工数が○h増加します。進めて良いですか？」 |

---

## 5. 自動化のステップ

1.  **Slack Appの作成**: mentions をトリガーにメッセージを取得。
2.  **Gemini API連携**: システムプロンプトを用いてメッセージを構造化（JSON化）。
3.  **GitHub API連携**: JSONを受け取り、GitHub Issue / Projectに反映。
