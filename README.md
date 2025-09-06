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
- **IMO SMCP (Standard Marine Communication Phrases)** 準拠
- **VHFチャンネル管理** (Ch.8: 船舶間通信, Ch.10: 港内作業, Ch.12: 港務通信)
- **標準呼出手順** ("博多ポートラジオ、こちら[船舶名]")

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
- **OpenAI API Key**: GPT-4o Realtime Preview対応

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
- **Email**: support@your-org.com

---

**Built with ❤️ for the maritime industry** 🚢⚓