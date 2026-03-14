# GitHub セットアップ詳細手順

本プロジェクトで使用する GitHub 連携のための設定手順です。

## 1. Personal Access Token (PAT) の取得

本システムが GitHub API を操作するために必要なトークンを取得します。現在、推奨されるのは **Tokens (classic)** です。

1. GitHub にログインし、右上のプロフィールアイコンをクリックして **"Settings"** を選択します。
2. 左サイドバーの最下部にある **"Developer settings"** をクリックします。
3. **"Personal access tokens"** > **"Tokens (classic)"** を選択します。
4. **"Generate new token"** ボタンをクリックし、**"Generate new token (classic)"** を選択します。
5. **Note** に用途（例: `SysDevAutomation`）を入力します。
6. **Expiration** (有効期限) を設定します（推奨: 90日程度、または組織のポリシーに従ってください）。
7. **Select scopes** で以下のスコープにチェックを入れます：
   - `repo`: すべてのチェックボックス（リポジトリの作成、Issueの操作などに必要です）。
8. ページ最下部の **"Generate token"** をクリックします。
9. 生成された `ghp_` で始まるトークンをコピーして控えておきます。**一度ページを離れると二度と表示されません。** これが環境変数の `GITHUB_TOKEN` になります。

## 2. ターゲットリポジトリの確認

本システムがベースとして使用するリポジトリを指定します。

1. 本システムのベースとなるリポジトリ（または管理用リポジトリ）の URL を確認します。
2. URL が `https://github.com/my-org/my-project` の場合、設定値は `my-org/my-project` になります。
3. これを環境変数の `GITHUB_REPO` に設定します。

---

## 収集した情報のまとめ

`.env` ファイルに設定が必要な項目は以下の通りです：

| 環境変数名 | 取得場所 | 形式の例 |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | Settings > Developer settings > PAT (classic) | `ghp_...` |
| `GITHUB_REPO` | リポジトリのURLから抽出 | `owner/repo` |
