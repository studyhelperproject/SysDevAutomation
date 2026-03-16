# GitHub Actions デプロイ設定ガイド

GitHub Actions を使用して、Google Cloud Run への自動デプロイを構成するための手順を説明します。

## 1. Google Cloud 側の設定

### 1.1 APIs の有効化
以下の API が有効であることを確認してください：
- IAM Service Account Credentials API
- Security Token Service API

### 1.2 サービスアカウントの作成
デプロイ用のサービスアカウントを作成し、必要な権限を付与します。

```bash
# サービスアカウントの作成
gcloud iam service-accounts create github-actions-deployer \
    --display-name="GitHub Actions Deployer"

# 権限の付与 (Cloud Run 管理者, ストレージ管理者, アーティファクトレジストリ管理者, Cloud Build 編集者, サービスアカウントユーザー)
PROJECT_ID="se-auto-agent-20251222"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.viewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 1.3 Workload Identity Federation の設定
鍵（JSON）を発行せずに GitHub Actions から認証するための推奨設定です。

```bash
# プールの作成
gcloud iam workload-identity-pools create "github-actions-pool" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# プロバイダーの作成
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="github-actions-pool" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# サービスアカウントへのバインディング
# REPO="owner/repo" の形式で指定
REPO="studyhelperproject/SysDevAutomation"

gcloud iam service-accounts add-iam-policy-binding "github-actions-deployer@${PROJECT_ID}.iam.gserviceaccount.com" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${REPO}"
```

## 2. GitHub 側の設定

GitHub リポジトリの `Settings > Secrets and variables > Actions` に以下の **Secrets** を追加してください。

- `WIF_PROVIDER`: Workload Identity Provider の ID
  - 形式: `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider`
- `WIF_SERVICE_ACCOUNT`: 作成したサービスアカウントのメールアドレス
  - 例: `github-actions-deployer@se-auto-agent-20251222.iam.gserviceaccount.com`

## 3. シークレットの準備 (Secret Manager)

以下のシークレットが Secret Manager に登録されている必要があります：
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `GEMINI_API_KEY`

これらはデプロイコマンドの `--update-secrets` フラグによって参照されます。
