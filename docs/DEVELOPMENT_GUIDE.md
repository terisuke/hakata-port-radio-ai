# 開発ガイド - 博多ポートラジオAI

## 概要

このガイドは、博多ポートラジオAIシステムの開発・メンテナンス・機能拡張を行う開発者向けの包括的な手引きです。

## 開発環境セットアップ

### システム要件
- **Node.js**: 20.0.0以上 (推奨: 20.15.1)
- **npm**: 10.0.0以上 (推奨: 10.8.2)
- **Git**: 2.30以上
- **VSCode**: 推奨エディタ

### 初回セットアップ
```bash
# リポジトリクローン
git clone <repository-url>
cd hakata-port-radio-ai

# 依存関係インストール
npm install

# 環境変数設定
cp .env.template .env.local

# VSCode推奨拡張機能インストール
# - TypeScript
# - Tailwind CSS IntelliSense
# - Prettier
# - ESLint
```

### 環境変数設定
```env
# .env.local
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-your-openai-api-key
```

## 開発ワークフロー

### Git ブランチ戦略
```
main          (プロダクション)
├── develop   (開発統合)
    ├── feature/ptt-improvement
    ├── feature/channel-management
    └── bugfix/audio-latency
```

### 開発サイクル
1. **機能ブランチ作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. **開発・テスト**
   ```bash
   npm run dev         # 開発サーバー起動
   npm run type-check  # 型チェック
   npm run lint        # コード品質チェック
   ```

3. **コミット・プッシュ**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature/new-feature
   ```

4. **プルリクエスト作成**
   - develop ブランチへのPR
   - レビュー後マージ

## プロジェクト構造

```
src/
├── components/           # Reactコンポーネント
│   ├── VoiceRadioOfficial.tsx    # メイン音声UI
│   └── VoiceRadio.tsx            # 旧版（参考用）
├── app/                  # Next.js App Router
│   ├── api/              # API Routes
│   │   └── realtime/session/     # OpenAI API連携
│   ├── globals.css       # グローバルスタイル
│   ├── layout.tsx        # アプリケーションレイアウト
│   └── page.tsx          # メインページ
└── lib/                  # ユーティリティ・設定
    └── agent/            # エージェント設定
        ├── custom-volt-agent.ts     # 旧VoltAgent（非使用）
        └── hakata-port-agent.ts     # ポートラジオ設定
```

## 主要コンポーネント解説

### VoiceRadioOfficial.tsx

メインの音声通信コンポーネント。以下の機能を統合：

#### 状態管理
```typescript
interface VoiceRadioState {
  isConnected: boolean;        // OpenAI接続状態
  isTransmitting: boolean;     // PTT送信状態
  connectionStatus: string;    // 接続ステータス表示
  isResponding: boolean;       // AI応答生成中
  audioPlaying: boolean;       // 音声再生中
  channelStatuses: ChannelStatus[];  // VHFチャンネル状態
}
```

#### PTT制御の実装
```typescript
// PTT開始（音声認識有効化）
const startTransmission = async () => {
  sessionRef.current.mute(false);  // ミュート解除
  setIsTransmitting(true);
  setConnectionStatus('送信中 - PTT ON');
};

// PTT終了（音声認識無効化）
const stopTransmission = async () => {
  sessionRef.current.mute(true);   // ミュート復帰
  setIsTransmitting(false);
  setConnectionStatus('PTT待機中（ミュート）');
};
```

#### Function Calling実装
```typescript
tools: [
  tool({
    name: 'assignVHFChannel',
    parameters: z.object({
      vesselName: z.string(),
      requestType: z.string(),
      priority: z.enum(['normal', 'urgent', 'emergency'])
    }),
    execute: async (params) => {
      const channel = assignChannel(params.vesselName);
      return JSON.stringify({
        success: channel > 0,
        assignedChannel: channel,
        ...params
      });
    }
  })
]
```

## 音声処理アーキテクチャ

### OpenAI Realtime API統合

#### エージェント設定
```typescript
const createPortRadioAgent = () => {
  return new RealtimeAgent({
    name: "博多ポートラジオ管制官",
    instructions: `
      IMO SMCP準拠の海事通信プロトコル実装
      PTTシステムでの1対1通信制御
    `,
    voice: "alloy",  // 管制官らしい落ち着いた声
    tools: [/* Function Calling定義 */]
  });
};
```

#### セッション管理
```typescript
const session = new RealtimeSession(agent);
await session.connect({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  model: "gpt-realtime"
});

// デフォルトミュート（PTT制御用）
session.mute(true);
```

### イベント処理フロー

```typescript
const setupSessionHandlers = (session) => {
  // 音声応答制御
  session.on('agent_start', handleAgentStart);
  session.on('agent_end', handleAgentEnd);
  
  // Function Call処理
  session.on('agent_tool_start', handleToolStart);
  session.on('agent_tool_end', handleToolEnd);
  
  // エラーハンドリング
  session.on('error', handleSessionError);
};
```

## テスト・品質管理

### 自動テスト
```bash
npm run test         # Jest単体テスト
npm run test:watch   # ウォッチモード
npm run test:coverage # カバレッジレポート
```

### 品質チェック
```bash
npm run type-check   # TypeScript型チェック
npm run lint         # ESLintチェック
npm run format       # Prettier整形
```

### マニュアルテスト項目

#### 基本機能テスト
1. **接続テスト**
   - [ ] 管制システム接続成功
   - [ ] 接続エラーハンドリング
   - [ ] 再接続機能

2. **PTT機能テスト**
   - [ ] ボタン押下で音声認識開始
   - [ ] ボタン解放で音声認識停止
   - [ ] ボタン未押下時は無反応

3. **音声通信テスト**
   - [ ] 基本呼出: "博多ポートラジオ、こちらさくら丸"
   - [ ] 応答確認: "こちら博多ポートラジオ、さくら丸どうぞ"
   - [ ] 音声品質確認

4. **チャンネル管理テスト**
   - [ ] 入港要請でチャンネル自動割当
   - [ ] UI状態の即座更新
   - [ ] チャンネル解放機能

## デバッグとトラブルシューティング

### よくある問題

#### 1. 音声認識が動作しない
```typescript
// デバッグ用ログ確認
console.log('セッション状態:', sessionRef.current);
console.log('ミュート状態:', isTransmitting ? 'OFF' : 'ON');
```

**解決策:**
- ブラウザのマイク権限確認
- HTTPS接続確認
- OpenAI APIキーの有効性確認

#### 2. Function Callingが実行されない
```typescript
// ツール実行ログ確認
session.on('agent_tool_start', (context, agent, tool, details) => {
  console.log('ツール実行開始:', tool.name, details);
});
```

**解決策:**
- プロンプトの明確化
- パラメータスキーマ確認
- 実行条件の見直し

#### 3. 音声応答が途切れる
```typescript
// 音声イベント監視
session.on('audio_start', () => console.log('音声開始'));
session.on('audio_stopped', () => console.log('音声終了'));
```

**解決策:**
- 応答タイムアウト設定調整
- 連続応答防止ロジック確認

### ログ分析

#### デバッグログの活用
```typescript
// 詳細ログ設定
const DEBUG = process.env.NODE_ENV === 'development';

const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[VoiceRadio] ${message}`, data);
  }
};
```

#### パフォーマンス監視
```typescript
// レスポンス時間測定
const startTime = performance.now();
await session.connect(options);
const connectionTime = performance.now() - startTime;
console.log(`接続時間: ${connectionTime}ms`);
```

## デプロイメント

### 本番ビルド
```bash
npm run build        # プロダクションビルド
npm start            # ローカル本番サーバー
```

### Vercelデプロイ
```bash
# 初回セットアップ
npx vercel login
npx vercel link

# デプロイ
npx vercel --prod
```

### 環境変数設定（Vercel）
```bash
vercel env add NEXT_PUBLIC_OPENAI_API_KEY
```

## パフォーマンス最適化

### バンドルサイズ最適化
```typescript
// 動的インポート使用
const VoiceRadioOfficial = dynamic(
  () => import('./components/VoiceRadioOfficial'),
  { loading: () => <p>Loading...</p> }
);
```

### メモリ使用量最適化
```typescript
// クリーンアップ処理
useEffect(() => {
  return () => {
    if (sessionRef.current) {
      sessionRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };
}, []);
```

## セキュリティ考慮事項

### API Key保護
- 環境変数での管理
- クライアント側での検証
- 本番環境での暗号化

### データ保護
- 音声データの一時保存のみ
- セッション終了時の完全削除
- HTTPS通信の強制

## 機能拡張ガイドライン

### 新機能追加の手順
1. **要件分析**
   - ユーザーストーリー作成
   - 技術仕様検討

2. **設計**
   - アーキテクチャ影響評価
   - インターフェース設計

3. **実装**
   - 段階的開発
   - テスト駆動開発

4. **テスト・検証**
   - 単体テスト作成
   - 統合テスト実行

### コーディング規約

#### TypeScript
```typescript
// インターフェース命名: PascalCase
interface VoiceRadioProps {
  className?: string;
}

// 関数命名: camelCase
const startTransmission = async () => {};

// 定数命名: UPPER_SNAKE_CASE
const DEFAULT_CHANNELS = [8, 10, 12];
```

#### React Hooks
```typescript
// カスタムフック
const useVoiceRadio = () => {
  const [isConnected, setIsConnected] = useState(false);
  // ...
  return { isConnected, startConnection };
};
```

## コントリビューション

### プルリクエストガイドライン
1. **ブランチ命名**: feature/issue-123-description
2. **コミットメッセージ**: Conventional Commits準拠
3. **テスト**: 新機能には必ずテスト追加
4. **ドキュメント**: APIの変更は文書も更新

### レビュープロセス
1. 自動チェック通過確認
2. コードレビュー実施
3. マニュアルテスト実行
4. 承認後マージ

---

このガイドは随時更新されます。不明な点があれば、開発チームまでお問い合わせください。
