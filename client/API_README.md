# Group Payment Management API

グループ内の支払い管理を行うためのバックエンド API。Google OAuth2 認証、グループ管理、支払い追跡機能を提供します。

## API エンドポイント

### 認証関連

#### 1. Google ログイン

Google ID Token を使用してログインします。初回ログイン時はユーザーが自動作成されます。

```http
POST /auth/google
Content-Type: application/json

{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
}
```

**リクエスト:**

- `id_token` (string, required): Google から発行された ID Token

**レスポンス (201 Created - 新規ユーザー):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "john_doe",
  "email": "john@example.com",
  "icon": "👤",
  "is_new": true
}
```

**レスポンス (200 OK - 既存ユーザー):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nickname": "john_doe",
  "email": "john@example.com",
  "icon": "👤",
  "is_new": false
}
```

**エラーレスポンス:**

```json
{
  "error": "Invalid Google Token" // 401
}
```

---

#### 2. セッション情報取得

現在ログインしているユーザーのセッション情報を取得します。

```http
GET /auth/session
```

**レスポンス (認証済み):**

```json
{
  "authenticated": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "john_doe",
    "email": "john@example.com",
    "icon": "👤"
  }
}
```

**レスポンス (未認証):**

```json
{
  "authenticated": false,
  "user": null
}
```

---

#### 3. ログアウト

セッションを削除してログアウトします。

```http
POST /auth/logout
```

**レスポンス:**

```json
{
  "ok": true
}
```

---

### グループ関連

#### 1. グループ作成

新しいグループを作成します。初期メンバーを指定できます。

```http
POST /g/new
Content-Type: application/json

{
  "name": "Summer Trip 2026",
  "description": "Expenses for summer vacation",
  "icon": "✈️",
  "currency": "JPY",
  "timezone": "Asia/Tokyo",
  "start_at": "2026-06-01T00:00:00Z",
  "end_at": "2026-08-31T23:59:59Z",
  "members": [
    { "name": "Alice", "icon": "👩" },
    { "name": "Bob", "icon": "👨" },
    { "name": "Charlie", "icon": "👦" }
  ]
}
```

**リクエスト:**

- `name` (string, required): グループ名 (最大256文字)
- `description` (string, optional): グループの説明
- `icon` (string, optional): グループアイコン (emoji推奨)
- `currency` (string, required): 通貨コード (例: JPY, USD, EUR)
- `timezone` (string, required): タイムゾーン (例: Asia/Tokyo, UTC)
- `start_at` (ISO8601 datetime, required): グループの開始日時
- `end_at` (ISO8601 datetime, required): グループの終了日時
- `members` (array, optional): 初期メンバー
  - `name` (string): メンバー名
  - `icon` (string): メンバーアイコン

**レスポンス (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

#### 2. グループ情報取得

グループの詳細情報（メンバー、サブグループ、カテゴリを含む）を取得します。

```http
GET /g/{groupId}/info
```

**パラメータ:**

- `groupId` (path parameter): グループの一意のID

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Summer Trip 2026",
  "description": "Expenses for summer vacation",
  "icon": "✈️",
  "currency": "JPY",
  "timezone": "Asia/Tokyo",
  "start_at": "2026-06-01T00:00:00Z",
  "end_at": "2026-08-31T23:59:59Z",
  "members": [
    {
      "id": 1,
      "name": "Alice",
      "icon": "👩"
    },
    {
      "id": 2,
      "name": "Bob",
      "icon": "👨"
    }
  ],
  "sub_groups": [
    {
      "id": 1,
      "name": "Transport",
      "members": [1, 2]
    },
    {
      "id": 2,
      "name": "Accommodation",
      "members": [1, 2, 3]
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Flight"
    },
    {
      "id": 2,
      "name": "Hotel"
    }
  ]
}
```

---

#### 3. グループの基本情報更新

グループの基本情報（名前、説明、通貨など）を更新します。

```http
PATCH /g/{groupId}/basic
Content-Type: application/json

{
  "name": "Summer Trip 2026 - Updated",
  "description": "Updated description",
  "icon": "🏖️",
  "currency": "JPY",
  "timezone": "Asia/Tokyo",
  "start_at": "2026-06-01T00:00:00Z",
  "end_at": "2026-08-31T23:59:59Z"
}
```

**リクエスト:**
すべてのフィールドの更新が必須です。

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

#### 4. メンバー管理

メンバーの追加、削除、名前変更を行います。

```http
PATCH /g/{groupId}/members
Content-Type: application/json

{
  "add": [
    { "name": "David", "icon": "👱" },
    { "name": "Eve", "icon": "👩‍🦰" }
  ],
  "rename": [
    { "id": 1, "name": "Alice Updated", "icon": "👩" }
  ],
  "remove": [3]
}
```

**リクエスト:**

- `add` (array, optional): 追加するメンバー
  - `name` (string): メンバー名
  - `icon` (string): メンバーアイコン
- `rename` (array, optional): 名前変更するメンバー
  - `id` (number): メンバーID
  - `name` (string): 新しい名前
  - `icon` (string): 新しいアイコン
- `remove` (array, optional): 削除するメンバーのIDリスト

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "members": [
    {
      "id": 1,
      "name": "Alice Updated",
      "icon": "👩"
    },
    {
      "id": 2,
      "name": "Bob",
      "icon": "👨"
    },
    {
      "id": 4,
      "name": "David",
      "icon": "👱"
    }
  ]
}
```

---

#### 5. サブグループ管理

サブグループ（グループ内のグループ）を追加、削除、更新します。

```http
PATCH /g/{groupId}/sub-groups
Content-Type: application/json

{
  "add": [
    {
      "name": "Transport",
      "members": [1, 2]
    },
    {
      "name": "Accommodation",
      "members": [1, 2, 3]
    }
  ],
  "names": [
    { "id": 1, "name": "Flight & Transport" }
  ],
  "members": [
    { "id": 1, "members": [1, 3] }
  ],
  "remove": [2]
}
```

**リクエスト:**

- `add` (array, optional): 追加するサブグループ
  - `name` (string): サブグループ名
  - `members` (array): メンバーIDのリスト
- `names` (array, optional): 名前変更するサブグループ
  - `id` (number): サブグループID
  - `name` (string): 新しい名前
- `members` (array, optional): メンバー割当を変更するサブグループ
  - `id` (number): サブグループID
  - `members` (array): 新しいメンバーIDのリスト
- `remove` (array, optional): 削除するサブグループのIDリスト

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "sub_groups": [
    {
      "id": 1,
      "name": "Flight & Transport",
      "members": [1, 3]
    }
  ]
}
```

---

#### 6. カテゴリ管理

支払いカテゴリを追加、削除、名前変更します。

```http
PATCH /g/{groupId}/categories
Content-Type: application/json

{
  "add": [
    { "name": "Flight" },
    { "name": "Hotel" },
    { "name": "Food" }
  ],
  "rename": [
    { "id": 1, "name": "Airfare" }
  ],
  "remove": [2]
}
```

**リクエスト:**

- `add` (array, optional): 追加するカテゴリ
  - `name` (string): カテゴリ名
- `rename` (array, optional): 名前変更するカテゴリ
  - `id` (number): カテゴリID
  - `name` (string): 新しい名前
- `remove` (array, optional): 削除するカテゴリのIDリスト

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "categories": [
    {
      "id": 1,
      "name": "Airfare"
    },
    {
      "id": 3,
      "name": "Food"
    }
  ]
}
```

---

#### 7. グループ削除

グループを論理削除します（復元不可）。

```http
DELETE /g/{groupId}
```

**レスポンス:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

### 支払い関連

#### 1. 支払い作成

グループに新しい支払いを作成します。

```http
POST /g/{groupId}/new
Content-Type: application/json

{
  "name": "Flight tickets",
  "description": "Round-trip flights for all",
  "amount": 150000,
  "paid_at": "2026-06-01T10:30:00Z",
  "currency": "JPY",
  "exchange_rate": 1.0,
  "type": "expense",
  "payer": 1,
  "payees": [1, 2, 3]
}
```

**リクエスト:**

- `name` (string, required): 支払いの名前
- `description` (string, optional): 説明
- `amount` (number, required): 支払い金額
- `paid_at` (ISO8601 datetime, required): 支払い日時
- `currency` (string, required): 通貨コード
- `exchange_rate` (number, optional): 為替レート
- `type` (string, required): 支払いタイプ (例: "expense", "reimbursement")
- `payer` (number, required): 支払者のメンバーID
- `payees` (array, required): 受取者のメンバーIDリスト

**レスポンス (201 Created):**

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "id": 1,
  "name": "Flight tickets",
  "description": "Round-trip flights for all",
  "amount": 150000,
  "paid_at": "2026-06-01T10:30:00Z",
  "currency": "JPY",
  "exchange_rate": 1.0,
  "type": "expense",
  "payer": 1,
  "payees": [1, 2, 3]
}
```

---

#### 2. 支払い一覧取得

グループの支払いをページネーション付きで取得します。

```http
GET /g/{groupId}/payments/{page}
```

**パラメータ:**

- `groupId` (path parameter): グループID
- `page` (path parameter): ページ番号 (1から開始、デフォルト: 1)

**レスポンス:**

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "payments": [
    {
      "id": 1,
      "name": "Flight tickets",
      "description": "Round-trip flights for all",
      "amount": 150000,
      "paid_at": "2026-06-01T10:30:00Z",
      "currency": "JPY",
      "exchange_rate": 1.0,
      "type": "expense",
      "payer": 1,
      "payees": [1, 2, 3]
    },
    {
      "id": 2,
      "name": "Hotel booking",
      "description": "3 nights accommodation",
      "amount": 90000,
      "paid_at": "2026-06-02T14:00:00Z",
      "currency": "JPY",
      "exchange_rate": 1.0,
      "type": "expense",
      "payer": 2,
      "payees": [1, 2, 3]
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 30
}
```

---

#### 3. 支払い更新

既存の支払い情報を更新します。

```http
PATCH /g/{groupId}/{paymentId}
Content-Type: application/json

{
  "name": "Flight tickets - Updated",
  "description": "Round-trip flights updated",
  "amount": 160000,
  "paid_at": "2026-06-01T10:30:00Z",
  "currency": "JPY",
  "exchange_rate": 1.0,
  "type": "expense",
  "payer": 1,
  "payees": [1, 2]
}
```

**リクエスト:**
すべてのフィールドの更新が必須です。

**レスポンス:**

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "id": 1,
  "name": "Flight tickets - Updated",
  "description": "Round-trip flights updated",
  "amount": 160000,
  "paid_at": "2026-06-01T10:30:00Z",
  "currency": "JPY",
  "exchange_rate": 1.0,
  "type": "expense",
  "payer": 1,
  "payees": [1, 2]
}
```

---

#### 4. 支払い削除

支払いを論理削除します。

```http
DELETE /g/{groupId}/{paymentId}
```

**レスポンス:**

```json
{
  "group_id": "550e8400-e29b-41d4-a716-446655440001",
  "id": 1
}
```

---

## エラーハンドリング

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ"
}
```

### 一般的なエラーコード

| ステータス | メッセージ                     | 説明                         |
| ---------- | ------------------------------ | ---------------------------- |
| 400        | `id_token is required`         | id_tokenが指定されていません |
| 401        | `Invalid Google Token`         | Google トークンが無効です    |
| 401        | `Invalid Google Token Payload` | トークンペイロードが無効です |
| 404        | `Group Not Found`              | グループが見つかりません     |
| 500        | `Internal Server Error`        | サーバーエラーが発生しました |

---

## 認証について

すべてのエンドポイント（`/auth/google` を除く）には、有効なセッションが必要です。

- セッションは Cookie として自動的に管理されます
- HttpOnly、Secure フラグが設定されています
- デフォルトの有効期限：
  - 絶対期限：7日間
  - 非アクティブ期限：24時間

---

## CORS設定

CORS は環境変数 `CORS_ORIGIN_BASE_URL` で制御されます。デフォルトでは `http://localhost:3000` です。

フロントエンド側での認証情報送信時は、以下のように設定してください：

```javascript
fetch('/auth/google', {
  method: 'POST',
  credentials: 'include', // Cookie を含める
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ id_token: token }),
});
```

---

## 開発時の注意事項

### リクエストへのタイムアウト

- デフォルトタイムアウト：なし
- データベース接続プール：最大10接続

### ページネーション

支払い一覧は 1 ページあたり 30 件の固定制限があります。

---

## ライセンス

MIT
