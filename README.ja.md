# 単語帳 / 単語ノート - システム仕様書

Node.js + Express + Prisma で動作するローカル向け学習アプリケーションです。ルートのメニュー画面から「単語帳」と「単語ノート」の 2 系統に分かれ、各画面は HTML / JavaScript / CSS だけで構成されています。

## 目次
1. [システム概要](#システム概要)
2. [機能一覧](#機能一覧)
3. [アーキテクチャ](#アーキテクチャ)
4. [データモデル](#データモデル)
5. [API仕様](#api仕様)
6. [ページ構成](#ページ構成)
7. [セットアップ手順](#セットアップ手順)
8. [開発ガイド](#開発ガイド)

---

## システム概要

**技術スタック:**
- **バックエンド:** Node.js + Express.js
- **データベース:** SQLite + Prisma ORM
- **フロントエンド:** HTML5 + JavaScript + CSS3
- **起動ページ:** `home_t.html`（アプリ選択メニュー）

**主な特徴:**
- マルチフォルダ対応（複数の学習セットを管理）
- スペーシング学習スケジュール（1日、3日、7日、14日、30日後の自動復習予定）
- CSV出入力機能（データのバックアップ・移行対応）
- レスポンシブUI（モバイルフレンドリー）
- ローカル永続化（ブラウザ LocalStorage + SQLite）

---

## 機能一覧

### wordbook

`wordbook/` はフォルダ単位でカードを管理するフラッシュカード機能です。トップの [wordbook/home.html](wordbook/home.html) から各画面へ遷移します。

#### フォルダ管理（folders.html）
- **一覧表示** - 作成日順にフォルダを表示し、各フォルダに登録済みカード数を表示します。
- **フォルダ作成** - 新規フォルダを作成できます。重複名は [server.js](server.js) 側で拒否されます。
- **フォルダ削除** - 選択したフォルダを削除できます。カードと復習スケジュールはカスケード削除されます。
- **フォルダ名変更** - 選択中のフォルダ名をモーダルで編集できます。

#### カード管理・確認（index.html / check.html）
- **カード作成・編集・削除** - [wordbook/static/app.js](wordbook/static/app.js) で表・裏を入力し、カードを追加・更新・削除できます。
- **カード一覧表示** - 選択中フォルダのカードを一覧表示します。
- **カードフリップ** - [wordbook/static/check.js](wordbook/static/check.js) でカードをクリックすると表裏を切り替えられます。
- **学習モーダル** - 1枚ずつ大きく表示し、前へ・次へ移動、表/裏切り替えができます。
- **review 連携** - 復習画面経由で開いた場合は、学習開始ボタンが表示されます。

#### 復習スケジュール（folders-check.html / review.html）
- **復習日設定** - カレンダーから日付を選び、選択日から 1日後・3日後・7日後・14日後・30日後の復習予定を自動登録します。
- **復習日一覧表示** - フォルダごとの復習予定を一覧で確認できます。
- **今日の復習一覧** - [wordbook/static/review.js](wordbook/static/review.js) で本日の復習対象フォルダを集計し、一覧表示します。
- **復習回数表示** - 各フォルダに「X回目の復習」と表示されます。

#### CSV機能（folders-check.html）
- **CSV出力** - 選択したフォルダのカードを CSV 形式でダウンロードできます。
- **CSV入力** - CSV ファイルから新規フォルダとカードを一括作成できます。
- **フォルダ名の自動解決** - CSV 取り込み時に同名フォルダがある場合は、名前を調整して取り込みます。

### wordnote

`wordnote/` は「単語本」を単位に、詳細な学習状態と情報追加を扱う学習アプリです。トップの [wordnote/index.html](wordnote/index.html) から学習・入力・設定に入ります。

#### 単語本管理（index.html）
- **単語本一覧** - 作成済みの単語本を一覧表示し、各本のカード数や状態を確認できます。
- **単語本の作成・変更・削除** - 新しい単語本を作成し、名前変更や削除もできます。
- **設定変更** - 単語本ごとに最大サイズ、復習係数、難易度関連の設定を保存できます。
- **CSV出力 / CSV入力** - 単語本の内容を CSV に書き出したり、CSV から取り込んだりできます。

#### 学習メニュー（study/）
- **今日の学習** - 復習日や学習履歴をもとに、今日学ぶべき単語を抽出します。
- **難易度別学習** - 初級・中級・上級・完成の各段階に応じて出題します。
- **ランダム学習** - 単語の進捗に応じてランダムな段階を選び、学習します。
- **カスタマイズ学習** - 条件を指定して学習対象を絞り込めます。
- **共通学習UI** - 音声読み上げ、評価ボタン、次のカードへの遷移、学習履歴保存を行います。

#### 初級フロー（初級/）
- **表示画面** - 単語カードを見開きで表示し、閲覧しながら操作できます。
- **入力画面** - 単語、発音、品詞、意味、派生語、類義語、対義語、例文、チャンク例文、よく使う表現、英訳、画像、メモを入力できます。
- **情報追加** - 学習評価や進捗に応じて、追加できる情報を段階的に増やします。
- **初級用 CSS** - カード表示や入力フォームのレイアウトは初級用のスタイルで構成されています。

#### データと API
- **学習履歴** - 各単語の学習履歴を保存し、復習計算に使います。
- **進捗管理** - difficulty、currentLevel、infoPlusProgress、reviewDate などをカード単位で管理します。
- **単語本ごとの制約** - 最大カード数や復習設定を単語本単位で保持します。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     ブラウザ（クライアント）                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  home_t.html                                              │
│     ↓                                                     │
│  [アプリ選択メニュー]                                        │
│     ├─ wordbook/home.html                                 │
│     │    ├─ folders.html                                  │
│     │    ├─ folders-check.html                            │
│     │    ├─ check.html                                    │
│     │    └─ review.html                                   │
│     └─ wordnote/index.html                                │
│          ├─ study/                                        │
│          └─ 初級/                                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  wordbook/static/                                   │   │
│  │   app.js, folders.js, check.js, review.js           │   │
│  │   folders-check.js, csv-export.js, csv-import.js    │   │
│  │   style.css                                          │   │
│  │                                                      │   │
│  │  wordnote/                                           │   │
│  │   index.js, import.js, export.js                    │   │
│  │   study/*.js, 初級/*.js                              │   │
│  │   index.css, study/study.css, 初級/*.css            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│             localStorage: current_folder_id                │
│             localStorage: from_review                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         AJAX / fetch()
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Node.js + Express Server                  │
│                      (server.js)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  GET  /api/folders                                         │
│  POST /api/folders                                         │
│  PUT  /api/folders/:id                                     │
│  DELETE /api/folders/:id                                   │
│                                                              │
│  GET  /api/cards                                           │
│  POST /api/cards                                           │
│  PUT  /api/cards/:id                                       │
│  DELETE /api/cards/:id                                     │
│                                                              │
│  GET  /api/review-schedules                                │
│  POST /api/review-schedules                                │
│  DELETE /api/review-schedules/folder/:folderId             │
│                                                              │
│  Static File Serve: / (HTML, CSS, JS)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                     Prisma ORM
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 SQLite Database                              │
│                 (prisma/dev.db)                              │
│                                                              │
│  Tables:                                                    │
│  - Folder                                                   │
│  - Card                                                     │
│  - ReviewSchedule                                           │
│  - WordnoteBook                                             │
│  - WordnoteCard                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## データモデル

### Folder テーブル
```
id (Int, Primary Key, Auto Increment)
name (String, Unique)
createdAt (DateTime, Default: now())
↓
Relations: cards[], reviewSchedules[]
```

### Card テーブル
```
id (Int, Primary Key, Auto Increment)
front (String)          # カード表面
back (String)           # カード裏面
folderId (Int, Nullable)
↓
Relations: folder (Folder)
Cascade Delete: Yes (フォルダ削除時にカードも削除)
```

### ReviewSchedule テーブル
```
id (Int, Primary Key, Auto Increment)
folderId (Int)
reviewDate (DateTime)   # 復習予定日
reviewCount (Int, Default: 0)  # N回目の復習か
createdAt (DateTime, Default: now())
↓
Relations: folder (Folder)
Cascade Delete: Yes
```

---

## API仕様

### Folder APIs

#### GET /api/folders
フォルダ一覧を取得（作成日順）

**レスポンス:**
```json
[
  {
    "id": 1,
    "name": "English",
    "createdAt": "2025-12-04T10:00:00.000Z"
  }
]
```

#### POST /api/folders
新規フォルダを作成

**リクエストボディ:**
```json
{ "name": "新しいフォルダ" }
```

**レスポンス:**
```json
{
  "id": 2,
  "name": "新しいフォルダ",
  "createdAt": "2025-12-04T10:30:00.000Z"
}
```

**エラー:**
- `400` - name が空または未指定
- `409` - 重複する名前が既に存在

#### PUT /api/folders/:id
フォルダ名を変更

**リクエストボディ:**
```json
{ "name": "変更後の名前" }
```

**レスポンス:**
```json
{
  "id": 1,
  "name": "変更後の名前",
  "createdAt": "2025-12-04T10:00:00.000Z"
}
```

**エラー:**
- `404` - フォルダが見つからない
- `409` - 同名フォルダが存在

#### DELETE /api/folders/:id
フォルダを削除（カスケード削除：関連カード・スケジュールも削除）

**レスポンス:**
```json
{ "ok": true }
```

**エラー:**
- `404` - フォルダが見つからない

---

### Card APIs

#### GET /api/cards
カード一覧を取得（オプション: folderId フィルタ）

**クエリパラメータ:**
- `folderId` (integer, optional) - フォルダIDで絞り込み

**レスポンス:**
```json
[
  {
    "id": 1,
    "front": "Apple",
    "back": "リンゴ",
    "folderId": 1
  }
]
```

#### POST /api/cards
新規カードを作成

**リクエストボディ:**
```json
{
  "front": "cat",
  "back": "猫",
  "folderId": 1
}
```

**レスポンス:**
```json
{
  "id": 10,
  "front": "cat",
  "back": "猫",
  "folderId": 1
}
```

**エラー:**
- `400` - front または back が未指定

#### PUT /api/cards/:id
カードを編集

**リクエストボディ:**
```json
{
  "front": "updated front",
  "back": "更新後の裏"
}
```

**レスポンス:**
```json
{
  "id": 10,
  "front": "updated front",
  "back": "更新後の裏",
  "folderId": 1
}
```

#### DELETE /api/cards/:id
カードを削除

**レスポンス:**
```json
{ "ok": true }
```

---

### ReviewSchedule APIs

#### GET /api/review-schedules
復習スケジュール一覧を取得（オプション: folderId フィルタ）

**クエリパラメータ:**
- `folderId` (integer, optional)

**レスポンス:**
```json
[
  {
    "id": 1,
    "folderId": 1,
    "reviewDate": "2025-12-05T00:00:00.000Z",
    "reviewCount": 1,
    "createdAt": "2025-12-04T10:00:00.000Z"
  }
]
```

#### POST /api/review-schedules
新規復習スケジュールを作成

**リクエストボディ:**
```json
{
  "folderId": 1,
  "reviewDate": "2025-12-05T00:00:00.000Z",
  "reviewCount": 1
}
```

**レスポンス:**
```json
{
  "id": 1,
  "folderId": 1,
  "reviewDate": "2025-12-05T00:00:00.000Z",
  "reviewCount": 1,
  "createdAt": "2025-12-04T10:00:00.000Z"
}
```

**エラー:**
- `400` - folderId または reviewDate が未指定

#### DELETE /api/review-schedules/folder/:folderId
フォルダの全復習スケジュールを削除

**レスポンス:**
```json
{ "ok": true }
```

---

## ページ構成

### home_t.html
**目的:** アプリ選択メニュー  
**URL:** http://localhost:3000/

- 「単語帳」ボタン → wordbook/home.html へ遷移
- 「単語ノート」ボタン → wordnote/index.html へ遷移

---

### wordbook/home.html
**目的:** 単語帳メニュー  
**URL:** http://localhost:3000/wordbook/home.html

- 「作成」ボタン → folders.html へ遷移
- 「確認」ボタン → folders-check.html へ遷移
- 「復習」ボタン → review.html へ遷移

---

### folders.html
**目的:** フォルダ一覧・管理  
**URL:** http://localhost:3000/wordbook/folders.html

**UI要素:**
- フォルダ一覧（グリッド表示）
- 「作成」ボタン（モーダル）
- 「削除」ボタン（トグル + モーダル確認）
- 「名前変更」ボタン（トグル + モーダル編集）

**状態管理:** フォルダオブジェクト配列 `folders`

---

### index.html
**目的:** 選択フォルダのカード学習  
**URL:** http://localhost:3000/wordbook/index.html

**UI要素:**
- ヘッダー: フォルダ名 + カード件数
- カードグリッド
- 「追加」「削除」「変更」ボタン

**状態管理:**
- `current_folder_id` (localStorage)
- `cards` (メモリ配列)
- `deleteMode`, `editMode` フラグ

**依存スクリプト:** `static/app.js`

---

### check.html
**目的:** フォルダのカード確認・学習  
**URL:** http://localhost:3000/wordbook/check.html

**UI要素:**
- ヘッダー: フォルダ名 + カード件数 + 学習ボタン（from review のみ）
- カードグリッド（小さいサイズ）
- 学習モーダル（大型フリップカード + ナビボタン）

**スクリプト依存:**
- `static/check.js`

---

### folders-check.html
**目的:** 復習スケジュール設定 + CSV 入出力  
**URL:** http://localhost:3000/wordbook/folders-check.html

**UI要素:**
- フォルダ一覧
- 「復習」ボタン（カレンダーモーダル）
- 「復習日表示」ボタン（スケジュール表示）
- 「csvに出力」ボタン（トグル + CSV ダウンロード）
- 「csvからの入力」ボタン（ファイル選択モーダル）

**スクリプト依存:**
- `static/csv-export.js`
- `static/csv-import.js`
- `static/folders-check.js`

---

### review.html
**目的:** 本日の復習フォルダ表示  
**URL:** http://localhost:3000/wordbook/review.html

**UI要素:**
- 本日の復習予定フォルダ一覧
- 各フォルダに「X回目の復習」と表記
- フォルダをクリック → check.html + `from_review` フラグ

**スクリプト依存:**
- `static/review.js`

---

### wordnote/index.html
**目的:** 単語本一覧・学習メニュー  
**URL:** http://localhost:3000/wordnote/index.html

**UI要素:**
- 単語本一覧
- 単語本の作成・名前変更・削除
- 今日の学習への遷移
- 設定ダイアログ

**スクリプト依存:**
- `wordnote/index.js`
- `wordnote/import.js`
- `wordnote/export.js`

---

### wordnote/study/study.html
**目的:** 単語本の学習画面  
**URL:** http://localhost:3000/wordnote/study/study.html

**UI要素:**
- 学習モード切り替え
- カード表示・回答操作
- 学習完了時の遷移

**スクリプト依存:**
- `wordnote/study/study.js`
- `wordnote/study/study-core.js`
- `wordnote/study/study-basic.js`
- `wordnote/study/study-intermediate.js`
- `wordnote/study/study-advanced.js`
- `wordnote/study/study-custom.js`
- `wordnote/study/study-random.js`
- `wordnote/study/study-today.js`
- `wordnote/study/study-completion.js`

---

### wordnote/初級/
**目的:** 初級カードの表示・入力・情報追加  

- `display.html` - 単語カードの表示画面
- `input.html` - 単語入力画面
- `info_plus/info_plus.html` - 情報追加画面

**スクリプト依存:**
- `wordnote/初級/display.js`
- `wordnote/初級/input.js`
- `wordnote/初級/select.js`
- `wordnote/初級/info_plus/info_plus.js`

---

## セットアップ手順

### 前提条件
- Node.js 18.18+
- npm
- Windows PowerShell 5.1+（推奨）

### インストール

1. **リポジトリのルートへ移動**

```powershell
cd wordnote
```

この README が置かれているディレクトリがプロジェクトルートなら、この手順は不要です。

2. **依存関係をインストール**

```powershell
npm install
```

3. **Prisma クライアント生成・DB初期化**

```powershell
npx prisma generate
npx prisma db push
```

> **注:** `prisma/dev.db` が既に存在する場合、スキーマが適用されます。  
> `npx prisma db push` を実行すると、SQLite データベース `prisma/dev.db` が作成されます。  
> リセットする場合は `Remove-Item prisma/dev.db` の後に再実行してください。

4. **サーバー起動**

```powershell
npm start
```

> **出力例:**
> ```
> Server listening on http://localhost:3000
> ```

5. **ブラウザで開く**

```
http://localhost:3000/
```

### トラブルシューティング

**エラー: `Cannot find module '@prisma/client'`**

```powershell
npm install
npx prisma generate
```

**エラー: Port 3000 already in use**

別のアプリケーションが使用中です。  
`server.js` の `PORT` を変更するか、プロセスを終了してください。

```powershell
# 別のポートで起動
$env:PORT = 3001
npm start
```

---

## 開発ガイド

### ファイル構成

```
wordnote/
├── home_t.html            # アプリ選択メニュー
├── server.js              # Express サーバー（API実装）
├── package.json
├── package-lock.json
├── prisma/
│   ├── schema.prisma      # DB スキーマ
│   └── migrations/        # マイグレーション履歴
├── data/
│   └── cards.json         # 移行・参照用データ
├── wordbook/
│   ├── home.html          # 単語帳メニュー
│   ├── index.html         # フォルダ別のカード学習
│   ├── check.html         # カード確認・学習モーダル
│   ├── folders.html       # フォルダ管理
│   ├── folders-check.html # スケジュール・CSV
│   ├── review.html        # 復習管理
│   └── static/
│       ├── app.js
│       ├── check.js
│       ├── csv-export.js
│       ├── csv-import.js
│       ├── folders-check.js
│       ├── folders.js
│       ├── review.js
│       └── style.css
├── wordnote/
│   ├── index.html         # 単語本一覧・学習メニュー
│   ├── index.js
│   ├── import.js
│   ├── export.js
│   ├── study/
│   │   ├── study.html
│   │   ├── study.js
│   │   ├── study.css
│   │   ├── study-core.js
│   │   ├── study-basic.js
│   │   ├── study-intermediate.js
│   │   ├── study-advanced.js
│   │   ├── study-custom.js
│   │   ├── study-random.js
│   │   ├── study-today.js
│   │   └── study-completion.js
│   └── 初級/
│       ├── display.html
│       ├── display.js
│       ├── input.html
│       ├── input.js
│       ├── select.css
│       ├── select.js
│       ├── style.css
│       └── info_plus/
│           ├── info_plus.html
│           ├── info_plus.js
│           └── info_plus.css
└── README.ja.md          # 日本語版 README
```

### コーディング規約

- **JavaScript:** ES6+ 対応、`const/let` を使用、アロー関数を活用
- **HTML:** セマンティック HTML5、ID/クラスは kebab-case
- **CSS:** モバイルファースト、Flexbox/Grid を活用
- **API レスポンス:** JSON 形式、HTTPステータスコード厳密運用

### データベース操作

**スキーマ変更時:**

```powershell
# schema.prisma を編集後
npx prisma db push

# マイグレーション記録が必要な場合
npx prisma migrate dev --name <migration_name>
```

**DB リセット（開発用）:**

```powershell
Remove-Item prisma/dev.db
npx prisma db push
```

### デバッグ

**ブラウザ開発者ツール（F12）**
- Console タブで `console.log()` を確認
- Network タブで API リクエスト/レスポンスを確認

**サーバーログ**

```javascript
// server.js
console.error(err);  // エラーは標準出力
```

---

## セキュリティに関する注意

このプロジェクトは **ローカル開発用** です。本番環境での利用は以下の対策が必須です：

- [ ] 認証・認可の実装（JWT / OAuth 等）
- [ ] HTTPS/TLS の設定
- [ ] CORS の制限
- [ ] SQL インジェクション対策（Prisma で自動保護）
- [ ] Rate limiting
- [ ] 入力値バリデーション強化

---

## ライセンス

未定（必要に応じて追加）

---

## 変更履歴

**v1.0.0 (2025-12-10)**
- 初版リリース
- フォルダ・カード CRUD
- スペーシング学習スケジュール
- CSV 入出力機能
- 学習モーダル
- 復習管理ページ