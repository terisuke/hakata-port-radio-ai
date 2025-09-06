# 博多ポートラジオAI - Maritime VHF Voice Agent

<img alt="博多ポートラジオAI" src="https://img.shields.io/badge/Status-Production_Ready-brightgreen" />
<img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.5.2-black" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.0+-blue" />
<img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-Realtime_API-orange" />

博多港における海上交通管制を模擬した、リアルタイム音声AI システムです。IMO SMCP準拠のVHF無線通信プロトコルを実装し、船舶との音声対話、チャンネル管理、入出港管制を自動化します。

## 🎯 プロジェクトの特徴

### 技術的ハイライト

#### 1. **真のPTT (Push-to-Talk) 実装**
```typescript
// セッション制御によるPTT実現
session.mute(true);   // 待機時：完全ミュート
session.mute(false);  // PTT押下：音声認識有効
```
- ボタンを押している間のみ音声認識が有効
- リアルなVHF無線機の動作を忠実に再現

#### 2. **OpenAI Realtime API + Function Calling**
```typescript
tools: [
  tool({
    name: 'assignVHFChannel',
    parameters: z.object({
      vesselName: z.string(),
      requestType: z.string(),
      priority: z.enum(['normal', 'urgent', 'emergency'])
    }),
    execute: async ({ vesselName, requestType, priority }) => {
      return assignChannel(vesselName);
    }
  })
]
```
- 公式`@openai/agents-realtime`ライブラリ使用
- リアルタイム音声処理とFunction Callingの統合

#### 3. **海事VHF通信プロトコル**
**IMO SMCP (Standard Marine Communication Phrases)** 準拠の詳細実装

📍 **実装場所**: `src/components/VoiceRadioOfficial.tsx:84-123`

##### 3.1 標準通信プロトコル (92-96行目)
```typescript
# 基本的な応答プロトコル
1. 船舶からの呼びかけ形式: "博多ポートラジオ、こちら[船舶名]"
2. 標準応答: "こちら博多ポートラジオ、[船舶名]どうぞ"  
3. 入港/出港要求時は必ずassignVHFChannelツールを使用してチャンネルを割り当て
4. チャンネル割り当て後: "チャンネル[番号]でお願いいたします。準備ができましたらどうぞ"
```

##### 3.2 VHFチャンネル規格 (103-106行目)
```typescript
# 使用可能なVHFチャンネル
- Channel 8: 船舶間通信用
- Channel 10: 港内作業連絡用  
- Channel 12: 港務通信用
```

##### 3.3 SMCP標準フレーズ (108-112行目)
```typescript
# IMO SMCP準拠フレーズ
- "Say again" - もう一度お願いします
- "Roger" / "了解" - 了解しました  
- "Stand by" - 待機してください
- "Over" / "どうぞ" - 送信終了、返信待ち
```

##### 3.4 海事安全原則 (115-122行目)
```typescript
# 重要な行動原則
- 船舶から明確に呼びかけられた時のみ応答する
- 1回のPTT送信には1回のみ応答する
- 応答は簡潔かつ明確にする
- 常に冷静で明確な口調を保つ
- 安全を最優先に判断する
- 入港/出港要求があったら必ずassignVHFChannelツールを使用する
```

これらの規則がOpenAI Realtime APIの**システムプロンプト**として実装され、AI管制官が国際海事機関の標準通信規則に従って応答するよう制御しています。

## 🚀 技術スタック

| 分野 | 技術 | バージョン | 採用理由 |
|-----|------|-----------|---------|
| **フレームワーク** | Next.js | 15.5.2 | App Router、サーバー/クライアント統合 |
| **言語** | TypeScript | 5.0+ | 型安全性、開発生産性向上 |
| **音声AI** | OpenAI Realtime API | Latest | リアルタイム双方向音声通信 |
| **AI SDK** | @openai/agents-realtime | 0.1.0 | 公式エージェントライブラリ |
| **UI** | TailwindCSS | 4.0 | モダンなユーティリティファースト |
| **スキーマ** | Zod | 3.23+ | ランタイム型検証 |
| **デプロイ** | Vercel | Latest | Next.js最適化、エッジ配信 |

## 📋 システム要件

- **Node.js**: >=20.0.0
- **npm**: >=10.0.0
- **ブラウザ**: Chrome 88+, Firefox 90+, Safari 14+
- **OpenAI API Key**: gpt-realtime モデル対応

## ⚡ クイックスタート

### 1. 環境セットアップ
```bash
git clone https://github.com/your-org/hakata-port-radio-ai.git
cd hakata-port-radio-ai

npm install
```

### 2. 環境変数設定
```bash
cp .env.template .env.local
```

`.env.local`を編集：
```env
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-your-openai-api-key
```

### 3. 開発サーバー起動
```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

### 4. 使用方法
1. **「📡 管制システム接続開始」** をクリック
2. **「🎤 長押しで送信 - PTT」** ボタンを長押し
3. **「博多ポートラジオ、こちらさくら丸」** と発話
4. ボタンを離すとAI管制官が応答

## 🏗️ アーキテクチャ

### システム構成
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ブラウザ       │    │   Next.js App    │    │  OpenAI API     │
│   (PTT UI)      │◄──►│   (API Routes)   │◄──►│  (Realtime)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
    WebRTC Audio            Function Calls           Audio Processing
    ↓ Push-to-Talk          ↓ Channel Mgmt           ↓ Voice Response
```

### コア実装ファイル

```
src/
├── components/
│   └── VoiceRadioOfficial.tsx    # メイン音声通信コンポーネント
├── app/
│   ├── api/
│   │   └── realtime/session/     # OpenAI API連携
│   └── page.tsx                  # アプリケーション UI
└── lib/
    └── agent/                    # エージェント設定
```

### 主要な実装パターン

#### PTT制御フロー
```typescript
const startTransmission = async () => {
  setIsTransmitting(true);
  sessionRef.current.mute(false);      // 音声認識開始
  setConnectionStatus('送信中 - PTT ON');
};

const stopTransmission = async () => {
  setIsTransmitting(false);
  sessionRef.current.mute(true);       // 音声認識停止
  setConnectionStatus('PTT待機中（ミュート）');
  // この時点でAIが音声を処理・応答
};
```

#### Function Calling統合
```typescript
const assignChannel = (vesselName: string): number => {
  const availableChannel = channelStatuses.find(ch => ch.status === 'available');
  
  setChannelStatuses(prev => prev.map(ch => 
    ch.channel === availableChannel.channel 
      ? { ...ch, status: 'assigned', vesselName, assignedAt: new Date().toLocaleTimeString() }
      : ch
  ));
  
  return availableChannel.channel;
};
```

## 📐 実装アーキテクチャの進化

### コンポーネント構成と役割

本プロジェクトには2つの主要な音声通信コンポーネントがあります。これは技術選択の進化を反映した意図的な構成です。

#### `src/components/VoiceRadioOfficial.tsx` 【現行・推奨】
**技術アプローチ**: 公式SDK + 高レベル抽象化
- **使用技術**: `@openai/agents-realtime` 公式ライブラリ
- **実装方式**: RealtimeAgent + RealtimeSession
- **PTT制御**: `session.mute(false/true)` による制御
- **機能**: Function Calling, チャンネル管理, IMO SMCP準拠
- **音声処理**: SDK内蔵の最適化された処理

```typescript
// シンプルで信頼性の高い実装
const session = new RealtimeSession(agent);
session.mute(true);   // PTT待機中
session.mute(false);  // PTT送信中
```

#### `src/components/VoiceRadio.tsx` 【参考・非推奨】
**技術アプローチ**: 低レベルWebSocket + 手動音声処理
- **使用技術**: 直接WebSocket接続 + MediaRecorder
- **実装方式**: 手動WebSocket操作 + AudioContext制御
- **PTT制御**: MediaStream開始/停止による制御
- **機能**: 基本的な音声通信のみ
- **音声処理**: 手動PCM16処理が必要

```typescript
// 複雑で保守が困難な実装
const wsUrl = `wss://api.openai.com/v1/realtime?auth=${clientSecret}`;
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
```

### 実装進化の3段階

| 段階 | 期間 | 技術スタック | 状態 | 主要課題 |
|------|------|-------------|------|----------|
| **Phase 1** | 初期設計 | VoltAgent + Vercel AI SDK | 計画段階 | VoltAgent音声制限 |
| **Phase 2** | プロトタイプ | 手動WebSocket + MediaRecorder | 参考実装 | 複雑性・保守性 |  
| **Phase 3** | プロダクション | @openai/agents-realtime | 現行実装 | - |

### 技術選択の判断理由

#### なぜ公式SDKに移行したか
1. **開発効率**: 手動WebSocket実装 vs 高レベルAPI
2. **信頼性**: 公式サポート vs 自前実装
3. **機能完成度**: Function Calling等の統合機能
4. **保守性**: SDKアップデート追従 vs 個別メンテナンス

#### 比較表：実装方式の違い

| 項目 | VoiceRadio.tsx | VoiceRadioOfficial.tsx | 採用理由 |
|------|---------------|----------------------|---------|
| **開発工数** | 大（手動実装多数） | 小（SDK活用） | ⭐⭐⭐ |
| **音声品質** | 要調整 | SDK最適化済み | ⭐⭐⭐ |
| **エラー処理** | 自前実装 | SDK内蔵 | ⭐⭐⭐ |
| **Function Call** | 未対応 | 完全統合 | ⭐⭐⭐ |
| **保守性** | 困難 | 容易 | ⭐⭐⭐ |

### ファイル使用推奨

- **メインページ**: `VoiceRadioOfficial.tsx`を使用
- **プロダクション**: 完全に`VoiceRadioOfficial.tsx`に依存
- **VoiceRadio.tsx**: 技術参考用（削除予定）

### コード例：進化の対比

#### 旧実装（VoiceRadio.tsx）
```typescript
// 複雑な手動WebSocket制御
ws.send(JSON.stringify({
  type: 'input_audio_buffer.append',
  audio: base64AudioData
}));

// 手動PCM16音声処理
const binaryData = atob(deltaData);
const bytes = new Uint8Array(binaryData.length);
```

#### 現行実装（VoiceRadioOfficial.tsx）
```typescript
// シンプルなSDK利用
const agent = new RealtimeAgent({
  tools: [assignVHFChannel],
  instructions: IMO_SMCP_PROTOCOL
});

// 直感的なPTT制御
session.mute(!isTransmitting);
```

## 🛠️ 開発とテスト

### 開発コマンド
```bash
npm run dev         # 開発サーバー起動
npm run build       # プロダクションビルド
npm run type-check  # TypeScript型チェック
npm run lint        # ESLint実行
npm run format      # Prettier実行
```

### テストシナリオ
1. **基本呼出**: "博多ポートラジオ、こちらさくら丸"
2. **入港要請**: "入港を要請します"
3. **チャンネル割当**: Function Callによる自動チャンネル割当確認
4. **PTT動作**: ボタンを押していない時は一切反応しないことを確認

## 🎨 技術的な挑戦と解決策

### 1. **連続音声認識の制御**
**課題**: WebベースのVHF無線でPTT機能を実現
**解決**: `session.mute()`によるセッション制御

### 2. **リアルタイム双方向音声**
**課題**: ブラウザでの低遅延音声通信
**解決**: OpenAI Realtime APIとWebRTC統合

### 3. **Function Calling統合**
**課題**: 音声認識結果からの構造化データ抽出
**解決**: `@openai/agents-realtime`のtoolラッパー

### 4. **海事プロトコル準拠**
**課題**: 専門的な海上交通管制用語の実装
**解決**: IMO SMCP準拠のプロンプトエンジニアリング

## 📈 性能とスケーリング

- **音声遅延**: ~200ms (OpenAI Realtime API)
- **同時接続**: Vercel Serverless制限内
- **チャンネル管理**: インメモリ状態管理 (デモ用)

## 🔧 本番環境対応

### 環境変数
```env
NEXT_PUBLIC_OPENAI_API_KEY=     # OpenAI API Key
VERCEL_URL=                     # デプロイURL (自動設定)
```

### Vercelデプロイ
```bash
vercel --prod
```

## 📚 技術背景・設計判断

### VoltAgent → OpenAI Agents移行
- **初期計画**: VoltAgent + OpenAI Realtime API
- **課題発見**: VoltAgentの音声処理制限
- **最終判断**: 公式`@openai/agents-realtime`ライブラリ採用
- **結果**: より安定したリアルタイム音声処理を実現

### PTT実装の技術的進化
1. **第1段階**: MediaRecorder + 手動音声送信
2. **第2段階**: AudioContext + バッファリング  
3. **最終実装**: session.mute()による制御 ← **最適解**

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 ライセンス

このプロジェクトは私的開発用です。商用利用の場合は事前にご相談ください。

## 🙋‍♂️ サポート

- **Issues**: [GitHub Issues](https://github.com/your-org/hakata-port-radio-ai/issues)
- **Discussion**: プロジェクト Discord
- **Email**: company@cor-jp.com

---

**Built with ❤️ for the maritime industry** 🚢⚓