# リスク対策ガイド

## 🚨 重要度レベル
- 🔴 **Critical**: プロジェクト失敗に直結
- 🟡 **High**: 大幅な遅延や品質低下の原因
- 🟢 **Medium**: 対処可能だが注意が必要

## 🔴 Critical リスク

### 1. WebSocket + Serverless環境の不安定性

**リスク内容**:
Vercel Serverless Functionsは本来ステートレスな設計で、長時間の接続維持に適していない。

**発生確率**: 高（70%）

**影響**:
- PTT音声通信の中断
- ユーザー体験の著しい低下
- システム全体の機能不全

**対策アクション**:

#### Plan A: Vercel内での最適化
```javascript
// 1. Edge Functionsの活用
// /app/api/websocket/route.ts をEdge Runtimeで実装
export const runtime = 'edge';

// 2. 接続プーリングの実装
const connections = new Map();

// 3. ハートビート実装
setInterval(() => {
  connections.forEach((conn) => {
    conn.ping();
  });
}, 30000); // 30秒ごと
```

#### Plan B: 外部サービスの活用（推奨）
1. **Ably** または **Pusher** の導入
   ```bash
   npm install ably
   ```
   
2. **実装例**:
   ```javascript
   import Ably from 'ably';
   
   const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
   const channel = ably.channels.get('voice-stream');
   ```

3. **切り替え判断基準**:
   - Day 8のWebSocket実装後、即座に安定性テスト実施
   - 5分以上の接続維持が3回中1回でも失敗したら即Plan B移行

**エスカレーション基準**:
- Day 9までに安定動作しない場合、PdMに報告

### 2. OpenAI APIレートリミット

**リスク内容**:
音声ストリーミングによる高頻度API呼び出しがレート制限に抵触。

**発生確率**: 中（40%）

**影響**:
- 429エラーによるサービス停止
- ユーザーセッションの強制終了

**対策アクション**:

#### 予防策
1. **Vercel AI Gateway設定**:
   ```javascript
   // vercel.json
   {
     "aiGateway": {
       "providers": {
         "openai": {
           "cache": true,
           "rateLimiting": {
             "maxRequests": 100,
             "windowMs": 60000
           }
         }
       }
     }
   }
   ```

2. **アプリケーション側の制御**:
   ```javascript
   // レート制限カウンター実装
   class RateLimiter {
     constructor(maxRequests = 50, windowMs = 60000) {
       this.requests = [];
       this.maxRequests = maxRequests;
       this.windowMs = windowMs;
     }
     
     canMakeRequest() {
       const now = Date.now();
       this.requests = this.requests.filter(
         time => now - time < this.windowMs
       );
       return this.requests.length < this.maxRequests;
     }
   }
   ```

#### リアクティブ対策
1. **Exponential Backoff実装**:
   ```javascript
   async function callWithRetry(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000;
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

**モニタリング**:
- Vercel AI Gatewayダッシュボードで15分ごとに確認
- 使用率が80%を超えたらアラート

## 🟡 High リスク

### 3. gpt-realtime応答遅延

**リスク内容**:
目標応答時間（<500ms）を達成できない可能性。

**発生確率**: 中（50%）

**対策**:
1. **ストリーミング最適化**:
   ```javascript
   // チャンクサイズの調整
   mediaRecorder.start(100); // 100msごと（250msから短縮）
   ```

2. **プロンプト最適化**:
   - システムプロンプトを簡潔に（500文字以内）
   - 不要な指示を削除

3. **キャッシュ活用**:
   - よくある応答パターンを事前定義

### 4. 海事専門用語の認識精度

**リスク内容**:
「〇〇丸」などの船舶名や専門用語の誤認識。

**発生確率**: 高（60%）

**対策**:
1. **カスタム語彙の登録**:
   ```javascript
   const customVocabulary = [
     "博多ポートラジオ",
     "入港許可",
     "チャンネル",
     // 船舶名パターン
     /.*丸$/,
   ];
   ```

2. **後処理フィルタ実装**:
   ```javascript
   function normalizeMaritimeTerms(text) {
     // 一般的な誤認識パターンの修正
     return text
       .replace(/ハカタ/g, "博多")
       .replace(/チャネル/g, "チャンネル");
   }
   ```

## 🟢 Medium リスク

### 5. データベース接続エラー

**対策**:
1. **接続プール設定**:
   ```javascript
   import { createPool } from '@vercel/postgres';
   
   const pool = createPool({
     connectionString: process.env.POSTGRES_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

2. **リトライロジック**:
   ```javascript
   async function queryWithRetry(query, params, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await pool.query(query, params);
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000));
       }
     }
   }
   ```

### 6. ブラウザ互換性問題

**対策**:
1. **対応ブラウザ明確化**:
   - Chrome 90+
   - Safari 14+
   - Firefox 88+
   - Edge 90+

2. **ポリフィル追加**:
   ```javascript
   // MediaRecorder非対応ブラウザ対策
   if (!window.MediaRecorder) {
     alert('お使いのブラウザは音声機能に対応していません');
   }
   ```

## 📊 リスクマトリクス

```
影響度
  高 │ [1]WebSocket  │ [2]RateLimit │
     │              │ [4]音声認識   │
  中 │              │ [3]遅延      │ [5]DB接続
     │              │              │
  低 │              │              │ [6]ブラウザ
     └──────────────┴──────────────┴────────────
       低            中            高
                  発生確率
```

## 🔄 リスク対応フロー

1. **デイリーチェック**（毎朝9:00）
   - VoltOpsダッシュボード確認
   - Vercel AI Gateway使用率確認
   - エラーログ確認

2. **問題検知時**
   1. リスクレベル判定
   2. 対策実施
   3. 30分以内に解決しない場合はエスカレーション
   4. 対策実施記録を残す

3. **週次レビュー**
   - リスク状況の再評価
   - 新規リスクの洗い出し
   - 対策の効果測定

## 📝 エスカレーションテンプレート

```
【緊急度】Critical / High / Medium
【発生日時】YYYY/MM/DD HH:MM
【影響範囲】
【現象】
【試みた対策】
【推定原因】
【提案する解決策】
【必要なリソース/判断】
```

## 🛠️ トラブルシューティングガイド

### 症状: WebSocket接続が頻繁に切断される
```bash
# 1. ログ確認
vercel logs --follow

# 2. 関数の実行時間確認
# Vercel Dashboard > Functions > Durations

# 3. 代替案への切り替え判断
# 10分間で3回以上切断 → Ably/Pusher導入
```

### 症状: 音声が途切れる
```javascript
// 1. バッファサイズ調整
mediaRecorder.start(50); // より小さいチャンク

// 2. 音声コーデック確認
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000
  }
});
```

### 症状: APIレート制限エラー
```bash
# 1. 使用状況確認
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage

# 2. 一時的な制限緩和申請
# OpenAI Platformから申請

# 3. バックオフ時間調整
RETRY_DELAY=5000 # 5秒に延長
```

## 📅 リスクレビュースケジュール

| タイミング | レビュー内容 | 参加者 |
|-----------|------------|--------|
| Day 1 | 初期リスク評価 | 全員 |
| Day 5 | Sprint 1完了時評価 | PdM + Tech Lead |
| Day 8 | WebSocket実装後評価 | Backend Team |
| Day 10 | Sprint 2完了時評価 | 全員 |
| Day 12 | 最終リスク評価 | 全員 |

---
最終更新: 2025年9月
作成者: プロダクトマネージャー
