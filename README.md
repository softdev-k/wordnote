# 単語帳（wordbook）- システム仕様書

シンプルなフラッシュカード学習アプリケーション。複数フォルダの管理、スペーシング学習スケジュール、CSV入出力機能を備えています。

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
- **フロントエンド:** HTML5 + Vanilla JavaScript + CSS3
- **実行環境:** Windows PowerShell 5.1+

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
│  home.html           folders.html          index.html      │
│     ↓                    ↓                     ↓            │
│  [Menu]          [Folder List]        [Card Management]    │
│                                                              │
│  review.html         check.html       folders-check.html   │
│     ↓                    ↓                    ↓             │
│  [Today's]         [Card Learn]       [Schedule & CSV]     │
│  [Review]                                                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           JavaScript Modules (static/)              │   │
│  │ ┌────────────────────────────────────────────────┐  │   │
│  │ │ app.js, folders.js, check.js, review.js      │  │   │
│  │ │ folders-check.js, csv-export.js, csv-import.js│  │   │
│  │ │ style.css                                      │  │   │
│  │ └────────────────────────────────────────────────┘  │   │
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

### home.html
**目的:** メニューページ  
**URL:** http://localhost:3000/home.html

- 「フォルダ」ボタン → folders.html へ遷移
- 「復習」ボタン → review.html へ遷移
- 「学習」ボタン → folders-check.html へ遷移

---

### folders.html
**目的:** フォルダ一覧・管理  
**URL:** http://localhost:3000/folders.html

**UI要素:**
- フォルダ一覧（グリッド表示）
- 「作成」ボタン（モーダル）
- 「削除」ボタン（トグル + モーダル確認）
- 「名前変更」ボタン（トグル + モーダル編集）

**状態管理:** フォルダオブジェクト配列 `folders`

---

### index.html
**目的:** 選択フォルダのカード学習  
**URL:** http://localhost:3000/index.html

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
**URL:** http://localhost:3000/check.html

**UI要素:**
- ヘッダー: フォルダ名 + カード件数 + 学習ボタン（from review のみ）
- カードグリッド（小さいサイズ）
- 学習モーダル（大型フリップカード + ナビボタン）

**スクリプト依存:**
- `static/check.js`

---

### folders-check.html
**目的:** 復習スケジュール設定 + CSV 入出力  
**URL:** http://localhost:3000/folders-check.html

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
**URL:** http://localhost:3000/review.html

**UI要素:**
- 本日の復習予定フォルダ一覧
- 各フォルダに「X回目の復習」と表記
- フォルダをクリック → check.html + `from_review` フラグ

**スクリプト依存:**
- `static/review.js`

---

## セットアップ手順

### 前提条件
- Node.js 16+
- npm
- Windows PowerShell 5.1+（推奨）

### インストール

1. **リポジトリをクローン（または ZIP を解凍）**

```powershell
# すでにディレクトリ内の場合はスキップ
cd wordbook
```

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
> リセットする場合は `rm prisma/dev.db` 後に再実行してください。

4. **サーバー起動**

```powershell
npm start
```

> **出力例:**
> ```
> Server running at http://localhost:3000
> ```

5. **ブラウザで開く**

```
http://localhost:3000/home.html
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
wordbook/
├── server.js              # Express サーバー（API実装）
├── home.html              # メニュー画面
├── index.html             # カード学習
├── check.html             # カード確認・学習モーダル
├── folders.html           # フォルダ管理
├── folders-check.html     # スケジュール・CSV
├── review.html            # 復習管理
├── package.json
├── prisma/
│   ├── schema.prisma      # DB スキーマ
│   └── dev.db             # SQLite データベース
├── static/
│   ├── style.css          # グローバルスタイル
│   ├── app.js             # index.html の JS
│   ├── check.js           # check.html の JS
│   ├── folders.js         # folders.html の JS
│   ├── folders-check.js   # folders-check.html の JS
│   ├── review.js          # review.html の JS
│   ├── csv-export.js      # CSV 出力機能
│   └── csv-import.js      # CSV 入力機能
├── .gitignore
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
rm prisma/dev.db
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
