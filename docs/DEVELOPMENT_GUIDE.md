# 開発ガイドライン

## 📋 はじめに
本ドキュメントは、博多ポートラジオAIシステムMVPの開発チーム向けガイドラインです。
技術仕様書をベースに、実装に必要な具体的な指示事項を記載しています。

## 🎯 開発フェーズと担当割り当て

### フェーズ1: 環境構築とプロジェクトセットアップ（1営業日）
**担当**: フルスタックエンジニア

#### タスクリスト
- [ ] Next.js 15プロジェクトの初期化
  ```bash
  npx create-next-app@latest hakata-port-radio-ai --typescript --app --tailwind
  ```
- [ ] 必要パッケージのインストール
  ```bash
  npm install @voltagent/core @voltagent/voice @voltagent/memory
  npm install @ai-sdk/openai @ai-sdk/react
  npm install @vercel/postgres zod
  ```
- [ ] Vercelプロジェクトのセットアップ
- [ ] Vercel Postgresのプロビジョニング

**成果物チェックリスト**:
- [ ] `package.json`に全ての依存関係が記載されている
- [ ] `.env.local`が正しく設定されている
- [ ] Vercelダッシュボードでプロジェクトが確認できる

### フェーズ2: コアエージェントの構築（3営業日）
**担当**: バックエンドエンジニア

#### 実装要件

1. **VoltAgent初期化** (`/app/api/agent/route.ts`)
   - Vercel AI Gateway経由でOpenAIに接続
   - システムプロンプトの実装
   - 音声プラグインの組み込み

2. **チャンネル割り当てツール実装**
   ```typescript
   // 必須スキーマ
   - vesselName: string
   - request: string
   - 返り値: { success: boolean, channel: number }
   ```

3. **テストケース作成**
   - [ ] 基本的な呼び出し・応答フロー
   - [ ] チャンネル割り当てロジック
   - [ ] エラーハンドリング

**レビューポイント**:
- システムプロンプトは海事通信の専門性を反映しているか
- ファンクションコールのスキーマは適切に定義されているか
- エラーハンドリングは実装されているか

### フェーズ3: フロントエンドUI実装（3営業日）
**担当**: フロントエンドエンジニア

#### コンポーネント仕様

1. **ChannelTable.tsx**
   - 列: チャンネル番号、船舶名、要件、ステータス、最終更新
   - リアルタイム更新対応（WebSocket経由）
   - レスポンシブデザイン

2. **PttButton.tsx**
   - onMouseDown/onMouseUp ハンドラー
   - モバイル対応（onTouchStart/onTouchEnd）
   - 録音状態の視覚的フィードバック

3. **メインページ統合** (`/app/page.tsx`)
   - Vercel AI SDK v5の`useChat`フック使用
   - WebSocket接続管理
   - エラー表示UI

**デザイン要件**:
- [ ] ダークモード対応を検討
- [ ] アクセシビリティ（WCAG 2.1 AA準拠）
- [ ] モバイルファーストアプローチ

### フェーズ4: バックエンドロジックとAPI連携（3営業日）
**担当**: フルスタックエンジニア

#### 実装項目

1. **WebRTC音声キャプチャ**
   - MediaRecorder API実装
   - チャンク送信（250ms間隔推奨）
   - ストリーム管理

2. **WebSocket通信**
   - `/api/voice/route.ts`でWebSocket待ち受け
   - 双方向通信の実装
   - 再接続ロジック

3. **セッション管理**
   - 5分タイムアウトの実装
   - 自動クリーンアップ
   - 状態の永続化

**注意事項**:
⚠️ **WebSocket + Serverless環境のリスク対策必須**（RISK_MITIGATION.md参照）

### フェーズ5: 統合テストとデバッグ（2営業日）
**担当**: QAエンジニア + 全チーム

#### テストシナリオ

1. **正常系テスト**
   - [ ] 完全な対話フロー（呼び出し→応答→チャンネル割り当て→確認）
   - [ ] 複数セッションの同時処理
   - [ ] UIテーブルのリアルタイム更新

2. **異常系テスト**
   - [ ] 不明瞭な音声入力
   - [ ] ネットワーク切断・再接続
   - [ ] タイムアウト処理
   - [ ] APIレート制限到達時

3. **パフォーマンステスト**
   - [ ] 応答遅延測定（目標: <500ms）
   - [ ] 同時接続数の限界確認
   - [ ] メモリリーク検査

**VoltOps監視設定**:
- [ ] エージェントトレースの有効化
- [ ] アラート設定
- [ ] ダッシュボード構成

### フェーズ6: Vercelデプロイと最終検証（1営業日）
**担当**: DevOpsエンジニア

#### デプロイ手順

1. **環境変数設定**
   ```
   OPENAI_API_KEY
   POSTGRES_URL
   VOLTOPS_API_KEY
   ```

2. **デプロイコマンド**
   ```bash
   vercel --prod
   ```

3. **動作確認項目**
   - [ ] HTTPS/WSS接続の確認
   - [ ] 本番環境での音声対話テスト
   - [ ] データベース接続確認
   - [ ] モニタリングツールの動作確認

## 🛠️ 技術スタック詳細

### 必須バージョン
- Next.js: 15.x
- Vercel AI SDK: 5.x
- VoltAgent: 最新版
- Node.js: 20.x以上

### APIエンドポイント設計

```
POST   /api/agent          # エージェント初期化
WS     /api/voice          # 音声ストリーミング
GET    /api/channels       # チャンネル状況取得
POST   /api/channels/:id   # チャンネル更新
```

## 📐 コーディング規約

### TypeScript
- 厳密な型定義（`strict: true`）
- インターフェース優先（typeよりinterface）
- エラーは必ずError型で扱う

### React/Next.js
- 関数コンポーネント使用
- Server Componentsを活用
- use clientは必要最小限に

### 命名規則
- コンポーネント: PascalCase
- 関数: camelCase
- 定数: UPPER_SNAKE_CASE
- ファイル: kebab-case（コンポーネントはPascalCase）

## 🔍 コードレビュー基準

### 必須チェック項目
- [ ] TypeScriptの型エラーがない
- [ ] ESLintエラーがない
- [ ] 適切なエラーハンドリング
- [ ] 機密情報のハードコーディングなし
- [ ] パフォーマンスの考慮

### 推奨チェック項目
- [ ] コードの可読性
- [ ] 適切なコメント
- [ ] テストカバレッジ
- [ ] アクセシビリティ

## 📊 進捗報告

### 日次スタンドアップ（必須）
- 完了したタスク
- 本日の作業予定
- ブロッカー/課題

### 週次レビュー
- デモ実施
- 次週の計画確認
- リスク評価更新

## ⚠️ エスカレーション

以下の場合は即座にPdMに報告:
- 技術的なブロッカーの発生
- 想定以上の遅延（半日以上）
- 仕様の不明点
- セキュリティ上の懸念

## 📚 参考資料

- [VoltAgent Documentation](https://voltagent.com/docs)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Vercel Documentation](https://vercel.com/docs)
- [IMO SMCP Reference](https://www.imo.org/en/OurWork/Safety/Pages/StandardMarineCommunicationPhrases.aspx)

---
最終更新: 2025年9月
