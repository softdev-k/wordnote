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

### フォルダ管理（folders.html）
- **フォルダ一覧表示** - 作成日順に表示、各フォルダのカード数を表示
- **フォルダ作成** - 新規フォルダを作成（重複名は禁止）
- **フォルダ削除** - フォルダを選択して削除（確認モーダル表示）
- **フォルダ名変更** - 左クリック選択後、モーダルで名前を編集

### カード学習（check.html）
- **カード確認表示** - グリッド表示で複数カードを一覧
- **フリップ機能** - カードをクリックして表/裏を切り替え

### 学習モーダル（check.html 内 study modal）
- **フリップカード学習** - モーダルで1枚ずつ大きく表示
- **前へ/次へ移動** - カード間のナビゲーション
- **表/裏ボタン** - 表示を明示的に切り替え

### 復習スケジュール（folders-check.html）
- **復習モード** - フォルダを選択してカレンダーから復習日を設定
- **カレンダー選択** - 月別ナビゲーション付きカレンダーから日付選択
- **自動スケジュール** - 選択日から1日、3日、7日、14日、30日後を自動登録
- **復習日表示** - フォルダの復習予定を一覧表示

### CSV機能（folders-check.html）
- **CSV出力** - フォルダのカード全件を CSV 形式でダウンロード（トグル型）
- **CSV入力** - CSVファイルから新規フォルダとカードを一括作成

### 復習管理（review.html）
- **今日の復習** - 本日の復習予定フォルダを一覧表示
- **復習回数表示** - 「X回目の復習」と表記
- **学習ボタン** - 復習フォルダのカードを学習モーダルで確認

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
└── README.md              # このファイル
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
