# Google Cloud Platform (GCP) デプロイガイド

本システムを Google Cloud Platform (GCP) のサーバーレスアーキテクチャ（Cloud Run + Firestore）にデプロイする手順を説明します。

## 1. Google Cloud プロジェクトの準備

1.  [Google Cloud Console](https://console.cloud.google.com/) にログインし、新しいプロジェクトを作成します。
2.  **課金の有効化**: プロジェクトに対して課金が有効であることを確認します。
3.  **APIの有効化**: 以下の API を有効にします。
    - Cloud Run API
    - Cloud Build API
    - Artifact Registry API
    - Firestore API
    - Secret Manager API

## 2. Firestore のセットアップ

1.  コンソールで **Firestore** に移動します。
2.  **データベースの作成** をクリックします。
3.  **ネイティブ モード** を選択します。
4.  リージョン（例: `asia-northeast1`）を選択して作成します。
    - データベース ID は `(default)` を使用します。
5.  コレクション `channel_mappings` は、アプリケーション実行時に自動的に作成されます。

## 3. シークレットの管理 (Secret Manager)

環境変数を安全に管理するために Secret Manager を使用することを推奨します。

1.  **Secret Manager** に移動し、以下のシークレットを作成します。
    - `SLACK_BOT_TOKEN`
    - `SLACK_SIGNING_SECRET`
    - `SLACK_APP_TOKEN` (Socket Mode を使用する場合のみ)
    - `GITHUB_TOKEN`
    - `GITHUB_REPO` (デフォルトのリポジトリ)
    - `GEMINI_API_KEY`

## 4. デプロイ手順

### 方法 1: Cloud Build を使用した自動ビルドとデプロイ

gcloud CLI がインストールされている環境で、プロジェクトのルートディレクトリで以下を実行します。

```bash
# 環境変数の設定
PROJECT_ID="your-project-id"
REGION="asia-northeast1"
SERVICE_NAME="sys-dev-automation"

# デプロイの実行
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars USE_FIRESTORE=true,SLACK_SOCKET_MODE=false \
  --update-secrets SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,SLACK_SIGNING_SECRET=SLACK_SIGNING_SECRET:latest,GITHUB_TOKEN=GITHUB_TOKEN:latest,GITHUB_REPO=GITHUB_REPO:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 注意点
- **HTTP Mode**: Cloud Run は通常 HTTP Mode で動作させるため、`SLACK_SOCKET_MODE=false` に設定します。
- **Slack 設定の変更**: HTTP Mode で動かす場合、Slack App 設定の `Event Subscriptions` で、Cloud Run の URL（例: `https://.../slack/events`）を Request URL として設定する必要があります。

## 5. Slack App の再設定 (HTTP Mode の場合)

1.  Cloud Run のデプロイ完了後に表示されるサービス URL をコピーします。
2.  [Slack App コンソール](https://api.slack.com/apps) に移動します。
3.  **Event Subscriptions**:
    - `Enable Events` をオンにします。
    - `Request URL` に `https://<YOUR_CLOUD_RUN_URL>/slack/events` を入力し、`Verified` になることを確認します。
4.  **Interactivity & Shortcuts** (オプション):
    - インタラクティブ機能を使用する場合は、Request URL に `https://<YOUR_CLOUD_RUN_URL>/slack/events` を設定します。

## 6. ローカル開発と検証

ローカルで Firestore を使用して動作確認をしたい場合は、以下の手順を踏みます。

1.  サービスアカウントキー (JSON) をダウンロードします。
2.  `GOOGLE_APPLICATION_CREDENTIALS` 環境変数にそのパスを設定します。
3.  `.env` に `USE_FIRESTORE=true` を設定します。
4.  `npm start` を実行します。
