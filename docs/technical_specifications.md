# 技術仕様書 (Technical Specifications)

## 1. テクノロジースタック (Technology Stack)
本システムは、TypeScript をベースとした Node.js アプリケーションです。

- **Runtime**: Node.js (Latest LTS)
- **Language**: TypeScript (ESM)
- **AI Framework**: `@google/generative-ai`
- **Slack Framework**: `@slack/bolt`
- **GitHub SDK**: `octokit`
- **Persistence**:
  - Google Cloud Firestore (推奨)
  - ローカル JSON ファイル (開発・デバッグ用)
- **Hosting**: Google Cloud Run
- **Infrastructure**: Docker, Google Cloud Build, Google Cloud Artifact Registry
- **CI/CD**: GitHub Actions

## 2. システムアーキテクチャ (Architecture)

### 2.1 コンポーネント構成
1.  **Slack (Front-end)**:
    - ユーザーからの入力を受信（Mentions, IMs）。
    - 処理結果をスレッド返信として送信。
2.  **App Engine (Bolt for Node.js)**:
    - Slack イベントの受信・フィルタリング（ボット自身の発言除外、スレッド履歴取得）。
    - チャンネルと GitHub リポジトリのマッピング管理（Firestore/Local）。
3.  **Gemini Engine (Brain)**:
    - 抽出されたコンテキスト（GitHub Issue 一覧、スレッド履歴）とともに、`gemini-3-flash-preview` モデルに要望を送信。
    - 構造化された JSON レスポンスを受信。
4.  **GitHub Client (Back-end/Storage)**:
    - リポジトリの自動作成、ラベル管理、Issue の作成・更新・検索。

### 2.2 データフロー (Data Flow)
1.  **Input**: `Slack User -> Bolt App`
2.  **Context Enrichment**: `Bolt App -> GitHub (Issue Snapshot) + Slack (Thread History)`
3.  **Analysis**: `Rich Context -> Gemini Engine -> Structured JSON`
4.  **Action**: `Gemini JSON -> GitHub Client (Create/Update Issue)`
5.  **Feedback**: `Action Result -> Bolt App -> Slack User`

## 3. AI エンジン構成 (AI Engine)

### 3.1 モデル
- **Model ID**: `gemini-3-flash-preview`
- **Role**: 一流のITプロジェクトマネージャー兼システムアナリスト

### 3.2 AI ツール (Function Calling)
AI が必要に応じて外部情報を取得するためのツールが定義されています。
- `get_issue(issue_number)`: 指定された番号の GitHub Issue 内容（タイトルと本文）をフェッチします。

### 3.3 コンテキスト管理
AI に以下の情報を供給し、継続的なプロジェクト管理を実現しています。
- **Project Context (GitHub Snapshot)**: 全オープン Issue の YAML 形式スナップショット（タイトル、ラベル、Issue番号、本文）。
- **Thread History**: Slack のスレッド内での直近20件のやり取り。

## 4. データ永続化 (Persistence)
Slack チャンネル ID と GitHub リポジトリ名（`owner/repo`）のマッピングを保持します。

- **IStorage インターフェース**:
  - `getRepo(channelId)`: リポジトリ名を取得。
  - `setRepo(channelId, repoName)`: リポジトリ名を保存。
- **Firestore 実装**: `USE_FIRESTORE=true` の場合に有効化。
- **File 実装**: `data/channel_mapping.json` に保存（フォールバック用）。

## 5. デプロイメント (Deployment)

### 5.1 Docker 化
- マルチステージビルドを採用。
- ビルドステージで TypeScript を JavaScript にコンパイル。
- ランタイムステージで軽量なベースイメージを使用し、`dist/` 下の成果物を実行。

### 5.2 インフラストラクチャ
- **Google Cloud Run**: サーバーレス実行環境。
- **Secret Manager**: 環境変数（APIキー、トークン）を安全に保持。
- **Workload Identity Federation**: GitHub Actions から GCP へのセキュアな認証。

## 6. セキュリティ
- **環境変数のトリミング**: Slack のヘッダーエラーを避けるため、起動時に `getEnv` ヘルパーが自動的に改行や空白を削除します。
- **ラベル管理**: `ensureLabelsExist` により、必要なラベル（`assign-to-jules` 等）をリポジトリごとに冪等に管理します。
