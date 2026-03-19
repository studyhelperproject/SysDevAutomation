# Slack App セットアップ詳細手順

本プロジェクトで使用する Slack App (Bot) の作成と設定の詳細手順です。

## 1. Slack App の新規作成
1. [Slack API Control Panel](https://api.slack.com/apps) にアクセスします。
2. **"Create New App"** ボタンをクリックします。
3. **"From scratch"** を選択します。
4. **App Name** (例: `SysDev-Bot`) を入力し、導入先の **Development Slack Workspace** を選択して **"Create App"** をクリックします。

## 2. Socket Mode の有効化
1. 左サイドバーの **"Settings" > "Socket Mode"** をクリックします。
2. **"Enable Socket Mode"** をオンに切り替えます。
3. トークンの詳細設定ダイアログが表示されるので、**Token Name** (例: `SocketToken`) を入力し、**"Generate"** をクリックします。
4. 生成された `xapp-...` で始まるトークンをコピーして控えておきます。これが環境変数の `SLACK_APP_TOKEN` になります。

## 3. OAuth & Permissions (権限) の設定
1. 左サイドバーの **"Features" > "OAuth & Permissions"** をクリックします。
2. **"Scopes"** セクションまでスクロールし、**"Bot Token Scopes"** に以下の権限 (Scopes) を追加します：
   - `app_mentions:read`: Botへのメンションを取得するために必要です。
   - `chat:write`: Botがメッセージを送信するために必要です。
   - `im:history`: ダイレクトメッセージ(IM)の内容を取得するために必要です。
   - `im:read`: (任意) IMの情報を読み取るために使用します。
   - `channels:history`: 公開チャンネルのメッセージ履歴を取得するために必要です（スレッド履歴の取得に使用）。
   - `groups:history`: プライベートチャンネルのメッセージ履歴を取得するために必要です（スレッド履歴の取得に使用）。
   - `mpim:history`: グループダイレクトメッセージのメッセージ履歴を取得するために必要です。
   - `channels:read`: 公開チャンネルの情報を取得するために必要です。
   - `groups:read`: プライベートチャンネルの情報を取得するために必要です。
   - `channels:join`: チャンネルに自動参加するために必要です。
3. ページ上部の **"Install to Workspace"** をクリックし、表示される確認画面で **"Allow" (許可)** をクリックします。
4. インストール完了後、生成された `xoxb-...` で始まる **"Bot User OAuth Token"** をコピーして控えておきます。これが環境変数の `SLACK_BOT_TOKEN` になります。

## 4. Event Subscriptions (イベント購読) の設定
1. 左サイドバーの **"Features" > "Event Subscriptions"** をクリックします。
2. **"Enable Events"** を **"On"** に切り替えます。
3. **"Subscribe to bot events"** セクションを展開し、**"Add Bot User Event"** をクリックして以下のイベントを追加します：
   - `app_mention`: メンションされた時に通知を受け取ります。
   - `message.im`: ダイレクトメッセージを受け取った時に通知を受け取ります。
   - `member_joined_channel`: Botがチャンネルに追加されたことを検知するために必要です。
4. 右下の **"Save Changes"** ボタンをクリックして保存します。

## 5. Signing Secret の取得
1. 左サイドバーの **"Settings" > "Basic Information"** をクリックします。
2. **"App Credentials"** セクションまでスクロールし、**"Signing Secret"** を表示してコピーし、控えておきます。これが環境変数の `SLACK_SIGNING_SECRET` になります。

## 6. App Home の設定 (1対1チャットの有効化)
1. 左サイドバーの **"Features" > "App Home"** をクリックします。
2. **"Show Tabs"** セクションの **"Messages Tab"** に移動します。
3. **"Allow users to send Slash commands and messages from the messages tab"** にチェックを入れます。これにより、Botとの1対1のチャットが可能になります。

---

## 収集した情報のまとめ

`.env` ファイルに設定が必要な項目は以下の通りです：

| 環境変数名 | 取得場所 | 形式の例 |
| :--- | :--- | :--- |
| `SLACK_BOT_TOKEN` | OAuth & Permissions | `xoxb-...` |
| `SLACK_APP_TOKEN` | Basic Information (or Socket Mode) | `xapp-...` |
| `SLACK_SIGNING_SECRET` | Basic Information | `(英数字の文字列)` |
