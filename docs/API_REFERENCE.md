# API仕様書

## 概要
博多ポートラジオAIシステムのAPI仕様を定義します。
すべてのAPIはNext.js App RouterのRoute Handlersとして実装されます。

## ベースURL
- 開発環境: `http://localhost:3000/api`
- 本番環境: `https://[your-project].vercel.app/api`

## 認証
MVPでは認証機能は実装しません。将来的にはJWT認証を検討。

## エンドポイント一覧

### 1. エージェント初期化
VoltAgentの初期化と設定を行います。

**エンドポイント**: `POST /api/agent`

**リクエスト**:
```json
{
  "sessionId": "string (optional)",
  "config": {
    "language": "ja",
    "voicePreset": "alloy"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "sessionId": "uuid-v4",
  "agentId": "hakata-port-radio-agent",
  "config": {
    "language": "ja",
    "voicePreset": "alloy",
    "model": "gpt-realtime"
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "AGENT_INIT_FAILED",
    "message": "Failed to initialize agent",
    "details": {}
  }
}
```

### 2. 音声ストリーミング（WebSocket）
リアルタイム音声通信用のWebSocketエンドポイント。

**エンドポイント**: `WS /api/voice`

**接続確立**:
```javascript
const ws = new WebSocket('ws://localhost:3000/api/voice');
```

**メッセージフォーマット**:

クライアント → サーバー:
```json
{
  "type": "audio",
  "data": "base64_encoded_audio_chunk",
  "timestamp": 1234567890,
  "sessionId": "uuid-v4"
}
```

サーバー → クライアント:
```json
{
  "type": "response_audio",
  "data": "base64_encoded_audio_chunk",
  "timestamp": 1234567890
}
```

**制御メッセージ**:
```json
{
  "type": "control",
  "action": "start_recording" | "stop_recording" | "ping" | "pong",
  "sessionId": "uuid-v4"
}
```

**UI更新通知**:
```json
{
  "type": "ui_update",
  "action": "channel_assigned",
  "data": {
    "channel": 10,
    "vesselName": "さくら丸",
    "request": "入港許可",
    "timestamp": "2025-09-01T10:30:00Z"
  }
}
```

**エラー通知**:
```json
{
  "type": "error",
  "code": "CONNECTION_LOST",
  "message": "WebSocket connection lost",
  "recoverable": true
}
```

### 3. チャンネル状況取得
現在のチャンネル使用状況を取得します。

**エンドポイント**: `GET /api/channels`

**クエリパラメータ**:
- `status`: `available` | `occupied` | `all` (デフォルト: `all`)

**レスポンス**:
```json
{
  "success": true,
  "channels": [
    {
      "id": 8,
      "status": "available",
      "vessel": null,
      "request": null,
      "lastUpdated": null
    },
    {
      "id": 10,
      "status": "occupied",
      "vessel": "はやぶさ丸",
      "request": "航路情報",
      "lastUpdated": "2025-09-01T10:25:00Z"
    },
    {
      "id": 12,
      "status": "occupied",
      "vessel": "みらい丸",
      "request": "入港許可",
      "lastUpdated": "2025-09-01T10:20:00Z"
    }
  ],
  "summary": {
    "total": 3,
    "available": 1,
    "occupied": 2
  }
}
```

### 4. チャンネル更新
特定チャンネルの状態を更新します。

**エンドポイント**: `POST /api/channels/:id`

**パスパラメータ**:
- `id`: チャンネル番号 (8, 10, 12)

**リクエスト**:
```json
{
  "action": "assign" | "release",
  "vessel": "さくら丸",
  "request": "入港許可",
  "sessionId": "uuid-v4"
}
```

**レスポンス**:
```json
{
  "success": true,
  "channel": {
    "id": 10,
    "status": "occupied",
    "vessel": "さくら丸",
    "request": "入港許可",
    "assignedAt": "2025-09-01T10:30:00Z",
    "sessionId": "uuid-v4"
  }
}
```

### 5. 海事用語検索
ナレッジベースから海事用語を検索します。

**エンドポイント**: `GET /api/maritime/search`

**クエリパラメータ**:
- `q`: 検索クエリ（必須）
- `category`: カテゴリーフィルタ（オプション）
- `limit`: 結果数制限（デフォルト: 10）

**レスポンス**:
```json
{
  "success": true,
  "results": [
    {
      "id": "SMCP-A1-1-1",
      "phrase_jp": "了解",
      "phrase_en": "Roger",
      "category": "Basic Communications",
      "context": "相手の通信内容を理解したことを示す",
      "metadata": {
        "imo_smcp_code": "A1/1.1",
        "message_marker": "ACKNOWLEDGMENT"
      }
    }
  ],
  "count": 1,
  "query": "了解"
}
```

### 6. セッション管理
アクティブなセッションの管理を行います。

**エンドポイント**: `GET /api/sessions`

**レスポンス**:
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid-v4",
      "vessel": "さくら丸",
      "channel": 10,
      "startedAt": "2025-09-01T10:25:00Z",
      "lastActivity": "2025-09-01T10:29:30Z",
      "status": "active"
    }
  ],
  "activeSessions": 1
}
```

**エンドポイント**: `DELETE /api/sessions/:id`

**レスポンス**:
```json
{
  "success": true,
  "message": "Session terminated",
  "sessionId": "uuid-v4"
}
```

## HTTPステータスコード

| コード | 説明 | 使用場面 |
|-------|------|---------|
| 200 | OK | 正常なレスポンス |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | リクエスト形式エラー |
| 404 | Not Found | リソースが見つからない |
| 429 | Too Many Requests | レート制限超過 |
| 500 | Internal Server Error | サーバーエラー |
| 503 | Service Unavailable | 一時的にサービス利用不可 |

## エラーコード一覧

| コード | 説明 | 対処法 |
|-------|------|--------|
| AGENT_INIT_FAILED | エージェント初期化失敗 | APIキー確認 |
| CHANNEL_NOT_AVAILABLE | チャンネル利用不可 | 別チャンネル選択 |
| SESSION_EXPIRED | セッション期限切れ | 新規セッション作成 |
| WEBSOCKET_ERROR | WebSocket通信エラー | 再接続実施 |
| RATE_LIMIT_EXCEEDED | レート制限超過 | リトライ実施 |
| INVALID_AUDIO_FORMAT | 音声形式エラー | 音声設定確認 |
| DATABASE_ERROR | データベースエラー | 管理者連絡 |
| OPENAI_API_ERROR | OpenAI APIエラー | ログ確認 |

## レート制限

| エンドポイント | 制限 | ウィンドウ |
|--------------|------|-----------|
| /api/agent | 10回 | 1分 |
| /api/voice | 100メッセージ | 1分 |
| /api/channels | 30回 | 1分 |
| /api/maritime/search | 20回 | 1分 |

## WebSocket通信仕様

### 接続フロー
1. クライアントがWebSocket接続を開始
2. サーバーが接続を承認し、セッションIDを返送
3. クライアントがPTT操作で音声送信開始
4. サーバーが音声を処理し、応答を返送
5. UIアップデート通知を必要に応じて送信

### 切断処理
- 正常切断: closeコード1000
- タイムアウト: closeコード1001
- エラー切断: closeコード1006

### 再接続ポリシー
- 初回: 即座に再接続
- 2回目: 1秒後
- 3回目: 2秒後
- 4回目以降: 5秒後（最大）

## データ形式

### 音声データ
- フォーマット: PCM 16bit
- サンプリングレート: 16kHz
- チャンネル: モノラル
- エンコーディング: Base64

### タイムスタンプ
- フォーマット: ISO 8601
- タイムゾーン: UTC
- 例: `2025-09-01T10:30:00Z`

## 実装上の注意事項

### CORS設定
```javascript
// /app/api/[route]/route.ts
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
```

### エラーハンドリング
```typescript
try {
  // API処理
} catch (error) {
  console.error('[API Error]', error);
  
  if (error instanceof ZodError) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    }, { status: 400 });
  }
  
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 });
}
```

### ログ出力
```typescript
// 構造化ログの使用を推奨
console.log({
  level: 'info',
  endpoint: '/api/agent',
  method: 'POST',
  sessionId: sessionId,
  timestamp: new Date().toISOString(),
  message: 'Agent initialized successfully'
});
```

---
最終更新: 2025年9月
