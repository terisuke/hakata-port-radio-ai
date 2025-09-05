# VoltAgent実装ガイド - 緊急技術サポート

## 🚨 重要: VoltAgentパッケージについて

### 状況確認と対応方針

VoltAgentは高度なAIエージェントフレームワークですが、パッケージの入手に問題がある場合があります。
以下の手順で対応してください。

## Option 1: VoltAgent実装（推奨）

### インストール試行手順

```bash
# 1. まず通常のnpmインストールを試行
npm install voltagent@latest

# 2. もし失敗した場合、個別パッケージを試行
npm install @voltagent/core
npm install @voltagent/voice
npm install @voltagent/memory

# 3. それでも失敗する場合、GitHubから直接インストール
npm install github:voltagent/voltagent

# 4. プライベートレジストリの可能性も確認
npm config set registry https://registry.npmjs.org/
npm install voltagent
```

### VoltAgent基本実装パターン

もしVoltAgentが利用可能な場合の実装例：

```typescript
// /src/lib/agent/volt-agent-setup.ts
import { VoltAgent } from 'voltagent';
// または
import { createAgent } from '@voltagent/core';
import { voicePlugin } from '@voltagent/voice';

export const setupVoltAgent = async () => {
  const agent = createAgent({
    name: 'hakata-port-radio',
    provider: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-realtime' // または利用可能なモデル
    },
    plugins: [
      voicePlugin({
        inputFormat: 'pcm16',
        outputFormat: 'pcm16',
        sampleRate: 16000
      })
    ]
  });

  // システムプロンプトの設定
  agent.setSystemPrompt(`
    あなたは博多ポートラジオの管制官AIです。
    船舶からのVHF通信に対して、冷静かつ的確に応答してください。
    
    応答ルール：
    1. 船舶からの「博多ポートラジオ、こちら〇〇丸」という呼びかけに対し、
       「こちら博多ポートラジオ、〇〇丸どうぞ」と応答
    2. 要件を聞き取り、適切なVHFチャンネル（8, 10, 12）を割り当て
    3. IMO SMCPに準拠した標準的なフレーズを使用
  `);

  return agent;
};
```

## Option 2: カスタム実装（代替案）

VoltAgentが利用できない場合の、同等機能を持つカスタム実装：

### 必要パッケージ

```bash
npm install openai @ai-sdk/openai ai ws
```

### VoltAgent互換レイヤーの実装

```typescript
// /src/lib/agent/custom-agent.ts
import { OpenAI } from 'openai';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

/**
 * VoltAgent互換のカスタムエージェント実装
 * VoltAgentと同じインターフェースを提供
 */
export class CustomVoltAgent {
  private openai: OpenAI;
  private systemPrompt: string;
  private tools: Map<string, Function>;
  
  constructor(config: {
    apiKey: string;
    model: string;
    systemPrompt: string;
  }) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.systemPrompt = config.systemPrompt;
    this.tools = new Map();
  }

  /**
   * VoltAgentのvoiceプラグインを模倣
   */
  async processVoiceStream(audioStream: ReadableStream) {
    // OpenAI Whisperで音声認識
    const transcription = await this.transcribeAudio(audioStream);
    
    // GPTで応答生成
    const response = await this.generateResponse(transcription);
    
    // TTSで音声合成
    const audioResponse = await this.synthesizeSpeech(response);
    
    return audioResponse;
  }

  /**
   * ツール（Function）の登録
   */
  registerTool(name: string, handler: Function, schema: any) {
    this.tools.set(name, handler);
  }

  /**
   * チャンネル割り当てツールの実装例
   */
  async assignChannel(vesselName: string, request: string) {
    // データベースから空きチャンネルを検索
    const availableChannels = [8, 10, 12];
    const assigned = availableChannels[0]; // 簡易実装
    
    return {
      success: true,
      channel: assigned,
      vessel: vesselName,
      request: request
    };
  }

  private async transcribeAudio(audioStream: ReadableStream): Promise<string> {
    // Whisper APIを使用した音声認識
    // 実装詳細...
    return "transcribed text";
  }

  private async generateResponse(input: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: input }
      ],
      tools: this.getToolsSchema(),
      tool_choice: "auto"
    });

    return completion.choices[0].message.content || "";
  }

  private async synthesizeSpeech(text: string): Promise<ArrayBuffer> {
    const response = await this.openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text
    });

    return response.arrayBuffer();
  }

  private getToolsSchema() {
    return [
      {
        type: "function",
        function: {
          name: "assignChannel",
          description: "Assign a VHF channel to a vessel",
          parameters: {
            type: "object",
            properties: {
              vesselName: { type: "string" },
              request: { type: "string" }
            },
            required: ["vesselName", "request"]
          }
        }
      }
    ];
  }
}

// VoltAgent風のファクトリー関数
export function createAgent(config: any) {
  return new CustomVoltAgent(config);
}
```

### WebSocketハンドラーの実装

```typescript
// /src/app/api/voice/route.ts
import { CustomVoltAgent } from '@/lib/agent/custom-agent';

export const dynamic = 'force-dynamic';

let agent: CustomVoltAgent;

export async function GET(request: Request) {
  // WebSocketアップグレード処理
  const upgradeHeader = request.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new Response('WebSocket connection required', { status: 426 });
  }

  // エージェント初期化（シングルトン）
  if (!agent) {
    agent = new CustomVoltAgent({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview',
      systemPrompt: getMaritime SystemPrompt()
    });
  }

  // WebSocket接続処理...
  // 詳細実装は Phase 4で
}

function getMaritimeSystemPrompt(): string {
  return `
    あなたは博多ポートラジオの熟練した管制官AIです。
    
    # 基本的な応答プロトコル
    1. 船舶からの呼びかけ形式: "博多ポートラジオ、こちら[船舶名]"
    2. 標準応答: "こちら博多ポートラジオ、[船舶名]どうぞ"
    3. チャンネル割り当て: "チャンネル[番号]でお願いいたします"
    
    # 使用可能なVHFチャンネル
    - Channel 8: 船舶間通信
    - Channel 10: 港内作業
    - Channel 12: 港務通信
    
    # IMO SMCP準拠フレーズ
    - "Say again" - もう一度お願いします
    - "Roger" / "了解" - 了解しました
    - "Stand by" - 待機してください
    - "Over" / "どうぞ" - 送信終了、返信待ち
    
    常に冷静で明確な口調を保ち、安全を最優先に判断してください。
  `;
}
```

## 📊 実装判断フローチャート

```
VoltAgentインストール試行
    ↓
成功した? → Yes → VoltAgent実装を進める
    ↓
    No
    ↓
GitHub/プライベートレジストリ確認
    ↓
利用可能? → Yes → VoltAgent実装を進める
    ↓
    No
    ↓
カスタム実装（Option 2）を採用
    ↓
PdMに状況報告
```

## ⏰ タイムボックス

- **VoltAgentインストール試行**: 最大30分
- **代替実装の判断**: 30分経過時点で判断
- **カスタム実装**: 2-3時間で基本実装完了

## 🆘 エスカレーションポイント

以下の場合は即座にPdMに連絡：
1. VoltAgentが30分以内にインストールできない
2. OpenAI Realtime APIが利用できない
3. WebSocket実装に重大な制約が判明した

## 📝 報告テンプレート

```
【VoltAgent実装状況報告】
実施日時: YYYY-MM-DD HH:MM
試行内容: [実施した内容]
結果: [成功/失敗]
採用方針: [VoltAgent/カスタム実装]
次のアクション: [具体的な作業内容]
完了予定: [時刻]
```

---
技術サポート担当: プロダクトマネージャー
