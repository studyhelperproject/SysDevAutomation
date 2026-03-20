# ファイルマップ (File Map)

## ディレクトリ構造

```text
.
├── .github/             # GitHub Actions ワークフロー定義
│   └── workflows/
│       └── deploy.yml   # Google Cloud Run へのデプロイパイプライン
├── data/                # ローカル永続化データ（開発用）
│   └── channel_mapping.json  # SlackチャンネルとGitHubリポジトリのマッピング
├── docs/                # ドキュメント（仕様書、セットアップガイド）
│   ├── deployment.md    # GCP デプロイガイド
│   ├── file_map.md      # 本ファイル
│   ├── functional_specifications.md  # 機能仕様書
│   ├── github_actions_setup.md       # CI/CD セットアップ
│   ├── github_setup.md  # GitHub 連携セットアップ
│   ├── issues.md        # 初期の Issue テンプレート
│   ├── slack_app_setup.md            # Slack App セットアップ
│   └── technical_specifications.md   # 技術仕様書
├── prompts/             # Gemini 用のシステムプロンプト説明（参考用）
├── src/                 # ソースコード (TypeScript)
│   ├── aggregate_sp.ts  # SP 集計スクリプト
│   ├── gemini.ts        # Gemini AI エンジンロジック
│   ├── github.ts        # GitHub API クライアント
│   ├── index.ts         # メインエントリーポイント（Slack イベントハンドラ）
│   ├── list_models.ts   # Gemini モデル一覧取得ユーティリティ
│   ├── storage.ts       # データ永続化（File/Firestore）
│   ├── types.ts         # 型定義
│   ├── verify_gemini.ts # Gemini 疎通確認スクリプト
│   └── verify_github.ts # GitHub 疎通確認スクリプト
├── templates/           # 要件定義用テンプレート（参考用）
├── tests/               # 自動テスト (TypeScript)
│   ├── test_context_management.ts # コンテキスト管理のテスト
│   ├── test_gemini_mock.ts        # Gemini モックテスト
│   ├── test_github_client.ts      # GitHub クライアントのテスト
│   ├── test_read_tool.ts          # AI ツール実行のテスト
│   ├── test_slack_challenge.ts    # Slack チャレンジ応答のテスト
│   ├── test_slack_feedback.ts     # Slack フィードバック形式のテスト
│   ├── test_sp_aggregation.ts     # SP 集計のテスト
│   └── test_thread_history.ts     # スレッド履歴取得のテスト
├── .dockerignore        # Docker ビルドから除外するファイル
├── .env.example         # 環境変数のサンプル
├── .gitignore           # Git 管理から除外するファイル
├── Dockerfile           # 本番用 Docker イメージ定義
├── README.md            # プロジェクト概要とクイックスタート
├── package-lock.json    # 依存関係のロックファイル
├── package.json         # プロジェクト構成とスクリプト定義
└── tsconfig.json        # TypeScript コンパイル設定
```

## 主要ファイルの役割

- **`src/index.ts`**: アプリケーションの心臓部。Slack Bolt フレームワークを使用し、メッセージイベントを処理して AI 解析パイプラインを起動します。
- **`src/gemini.ts`**: Google Generative AI SDK をラップし、システムプロンプトの注入、関数呼び出し（get_issue）、およびレスポンスのパースを行います。
- **`src/github.ts`**: Octokit を使用して GitHub と通信。Issue の CRUD 操作、リポジトリ作成、ラベル管理を担当します。
- **`src/storage.ts`**: チャンネルとリポジトリの紐付けを管理。環境変数に応じてローカルファイルと Firestore を切り替えます。
- **`src/aggregate_sp.ts`**: プロジェクト進捗を可視化するため、GitHub Label からストーリーポイントを集計して README を更新します。
