# フォスターシティのピックルボールコート予約ボット

## セットアップ(ローカル環境)
ローカル環境での実行手順です。Windowsでも動くと思いますが、Macでしか動作確認していません。GitHub Actionsを使用してリモート環境で予約実行する場合は[こちら](#セットアップgithub-actions)を参照してください。

### 事前にインストールしておくもの
* [git](https://github.com/git-guides/install-git)
* [Node.js](https://nodejs.org/en)

### リポジトリのクローン
```
git clone https://github.com/shinichy/pickleball-bot.git
cd pickleball-bot
```

### 依存ソフトウェアのインストール
```
npm install
npx playwright install chromium
```

### 実行
以下の環境変数を必要に応じて設定してから、`pickleball_reservation.js`を実行します。
```
RESERVATION_TIME='4:00 pm' FAMILY_MEMBER='First Last' WEBTRAC_USERNAME=<username> WEBTRAC_PASSWORD=<password> node pickleball_reservation.js
```

### 環境変数
* `WEBTRAC_USERNAME`: 予約サイトのユーザー名
* `WEBTRAC_PASSWORD`: 予約サイトのパスワード
* `DAYS_AHEAD`: 何日先の予約をするか (14なら2週間後のコートを予約。デフォルトは14)
* `COURT`: コート番号(デフォルトは6)
* `RESERVATION_TIME`: 予約するコートの時間(開始時間のみ。例えば4:00 pm - 5:00 pmの場合:`4:00 pm`)
* `FAMILY_MEMBER`: 予約する家族の名前(予約サイトに家族を登録している場合は予約するメンバーの選択画面が出るため必須)
* `MAX_WARNING_RETRIES`: 予約時間になっていない等の警告メッセージが表示された場合の最大リロード回数(デフォルトは200)
* `RELOAD_INTERVAL`: 警告メッセージが表示された場合のブラウザのリロード間隔 (ミリ秒。デフォルトは500)
* `NO_RESERVATION`: `true`の場合、予約フローの最後のページで予約を行わずに終了する(動作確認用)
* `HEADLESS`: `true`の場合、ブラウザを非表示で実行する

## セットアップ(Github Actions)
GitHub Actionsを使用してプログラムを予約実行する手順です。

### 必要な準備
1. リポジトリをフォーク

   https://github.com/shinichy/pickleball-bot のページに移動し、右上の「Fork」ボタンをクリックしてリポジトリをフォークします。

2. Environment secrets/variablesの設定

   https://github.com/shinichy/pickleball-bot では2つのアカウントを使って別々のコートを予約するため、`[shinichi, pickle]`の2つのEnvironmentが`.github/workflows/reserve-pickleball.yml`に設定されています。1つのコートを予約する場合は`pickle`というEnvironment1つだけ作成します。

   - フォークしたリポジトリの`Settings > Environments`に移動
   - `pickle`という名前のEnvironmentを作成
   - 以下のEnvironment secretsを追加:
     - `WEBTRAC_USERNAME`
     - `WEBTRAC_PASSWORD`
     - `FAMILY_MEMBER` (予約サイトに家族を登録している場合のみ)
   - 以下のEnvironment variablesも追加:
     - `COURT`

3. Repository variablesの設定

   Repository varialbesは、実行されるEnvironmentに関わらずリポジトリ全体で使用される変数です。複数のEnvironmennを作成して個別に設定する場合は、必要に応じてEnvironment variablesの方に設定してください。
   - フォークしたリポジトリの`Settings > Secrets and variables > Actions`に移動。  
   - `Variables`タブを選択
   - 以下の環境変数を追加:
     - `DAYS_AHEAD`
     - `RESERVATION_TIME`

### ワークフローファイルの設定
`.github/workflows/reserve-pickleball.yml`を編集し、[GitHub Actions workflows](https://docs.github.com/en/actions/writing-workflows)の設定を行います。

1. スケジュールの設定

    `cron`の部分を編集して、プログラムを起動する曜日と時間を**UTC**時間で設定します。起動してからコート選択画面に辿り着くまで1分ほど時間がかかるので、コート予約開始時刻(朝8時)の2分前に起動するようにスケジュールしておくと、予約開始時刻までリロードして待機し続けるのでちょうど良いです。Daylight Saving Timeによる時刻の変更に対処するため、PDTとPSTの両方の時間をUTC時間に変換して設定し、どちらか1つが成功するようにしておくと良いです。

    例: 毎週金曜日の午前7時58分と8時58分に起動するように設定する場合:
    ```yaml
    on:
      schedule:
        - cron: "58 14,15 * * 5"
    ```

2. Environmentの設定

   https://github.com/shinichy/pickleball-bot では2つのアカウントを使って別々のコートを予約するため、`[shinichi, pickle]`の2つのEnvironmentが設定されています。1つのコートを予約する場合は`shinichi`を削除して上記ステップで作成した`[pickle]`のみを残して下さい。
   ```yaml
   strategy:
     matrix:
       environment: [pickle]
   ```

### 実行
GitHub Actionsの`Actions`タブに移動し、`reserve-pickleball.yml`が正しく設定されていることを確認してください。スケジュールされたジョブが動作しているか、または手動でジョブをトリガーして動作を確認できます。ジョブの実行をテストする際は、`NO_RESERVATION`を`true`に設定しておくと、予約フローの最後のページで予約を行わずに終了します。これにより、実際の予約を行うことなく、プログラムが正しく動作するかどうかを確認できます。
