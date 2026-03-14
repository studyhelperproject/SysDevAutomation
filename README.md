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

## 2. 実装状況 (Current Status)

現在、以下のコア機能が実装済みです：
- [x] **Slack連携**: Socket Modeによるメンションおよびダイレクトメッセージ(IM)の取得。
- [x] **GitHubリポジトリ自動作成**: Slackチャンネルごとに紐づけられたGitHubリポジトリを自動作成・管理。
- [x] **Gemini 1.5 Pro連携**: システムプロンプトによる要件の構造化解析、Given-When-Then形式の受入基準生成。
- [x] **GitHub Issue自動起票**: カテゴリに応じたラベル付与、Slackメッセージへのトレーサビリティリンク付与。
- [x] **コンテキスト管理**: GitHub上の既存Issue（Snapshot）を読み込み、Geminiにコンテキストとして供給。
- [x] **ストーリーポイント集計**: GitHub Issueの `SP: <number>` ラベルを集計し、READMEに自動反映。

---

## 3. ユーザー側の準備事項 (User Preparation)

デプロイおよび利用開始にあたり、ユーザー側で以下の準備が必要です。

### 1. GitHubの準備
- **リポジトリの作成**: 本システムを動かすためのGitHubリポジトリ。
- **Personal Access Token (PAT) の発行**: `repo` スコープを持つトークンが必要です。
- **ラベルの作成**: 以下のラベルをリポジトリに作成しておくと、より見やすくなります（自動付与されます）。
    - `[Feature]`, `[Q]`, `[Dependency]`, `[Estimate]`, `[Out of Scope]`
    - `SP: 1`, `SP: 2`, `SP: 3`, `SP: 5`, `SP: 8` など（ストーリーポイント用）
    - `Type: <Value>`, `Status: <Value>`, `Priority: <Value>`

### 2. Slackの準備
- **Slack Appの作成**: [Slack API](https://api.slack.com/apps) から新規アプリを作成。
- **Socket Mode の有効化**: `Settings > Socket Mode` をオンにします。
- **権限 (Scopes) の設定**: `OAuth & Permissions` で以下の `Bot Token Scopes` を追加。
    - `app_mentions:read`
    - `chat:write`
    - `im:history`
    - `im:read`
    - `channels:read`
    - `groups:read`
    - `channels:join`
- **イベントの購読**: `Event Subscriptions` で以下を有効化。
    - `app_mention`
    - `message.im`
    - `member_joined_channel`

### 3. Gemini (Google AI) の準備
- **APIキーの取得**: [Google AI Studio](https://aistudio.google.com/) からGemini APIキーを取得。

---

## 4. プロジェクト進捗 (Project Progress)

<!-- TOTAL_SP_START --><!-- TOTAL_SP_END -->

---

## 5. 曖昧さを排除する「要件定義テンプレート」

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

## 6. セットアップと実行 (Setup & Usage)

### 環境変数の設定
`.env` ファイルを作成し、以下の値を設定します。

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
GITHUB_TOKEN=ghp_...
GITHUB_REPO=owner/repo
GEMINI_API_KEY=...
```

### インストールと起動
```bash
npm install
npm start
```

### ストーリーポイントの集計更新
GitHub上の `SP: <number>` ラベルを集計してREADMEを更新するには、以下のコマンドを実行します。
```bash
npm run aggregate-sp
```

---

## 7. システム構成

Slackをフロントエンド、Geminiをバックエンドロジック、GitHubを管理基盤とする構成です。

*   **Front**: Slack (お客様からの要望・連絡)
*   **Bridge**: Slack Bolt (Node.js) / Socket Mode
*   **Brain**: Gemini 2.5 Pro (API)
*   **Back**: GitHub API (Issues, Projects)
*   **Dev Env**: Google Jules (GitHub上のIssueを元に開発)

---

## 8. 処理フロー：曖昧さを排除する判定マトリクス

| 入力例 | 判定 | アクション | 返答/対応例 |
| :--- | :--- | :--- | :--- |
| 「ログイン機能を付けて」 | **Clarify** | Issueを作らず保留 | 「認証方法は？（SNS/メール？）」等の質問 |
| 「ログインはGoogle連携のみで」 | **[Feature]** | Issue起票（受入基準定義） | 「承知しました。Issue #12として登録しました」 |
| 「ロゴをいい感じに変えて」 | **DataRequest** | 資産待ちラベルのIssue起票 | 「ロゴの元データ（AI/PNG）を送ってください」 |
| 「やっぱりこれも追加で」 | **[Estimate]** | 見積もり加算ラベルのIssue起票 | 「工数が○h増加します。進めて良いですか？」 |
