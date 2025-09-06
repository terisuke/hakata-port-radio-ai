import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

/**
 * 博多ポートラジオAIエージェントの設定
 * 海上交通管制に特化したVoltAgent実装
 */

// VHFチャンネル管理用の型定義
interface ChannelAssignment {
  success: boolean;
  channel: number;
  vessel: string;
  request: string;
  assignedAt: string;
}

// 利用可能なVHFチャンネル
const AVAILABLE_CHANNELS = [8, 10, 12];

/**
 * チャンネル割り当て機能（ファンクションコール）
 */
async function assignVHFChannel(vesselName: string, request: string): Promise<ChannelAssignment> {
  // 簡易実装: 最初の利用可能チャンネルを割り当て
  // 実際のプロダクションではデータベースから空きチャンネルを検索
  const assignedChannel = AVAILABLE_CHANNELS[0];
  
  return {
    success: true,
    channel: assignedChannel,
    vessel: vesselName,
    request: request,
    assignedAt: new Date().toISOString()
  };
}

/**
 * 海事ドメイン専用システムプロンプト
 */
const MARITIME_SYSTEM_PROMPT = `
あなたは博多ポートラジオの熟練した管制官AIです。船舶からのVHF通信に対して、冷静かつ的確に応答してください。

# 基本的な応答プロトコル
1. 船舶からの呼びかけ形式: "博多ポートラジオ、こちら[船舶名]"
2. 標準応答: "こちら博多ポートラジオ、[船舶名]どうぞ"
3. チャンネル割り当て後: "チャンネル[番号]でお願いいたします"

# 使用可能なVHFチャンネル
- Channel 8: 船舶間通信用
- Channel 10: 港内作業連絡用  
- Channel 12: 港務通信用

# IMO SMCP準拠フレーズ
- "Say again" - もう一度お願いします
- "Roger" / "了解" - 了解しました
- "Stand by" - 待機してください
- "Over" / "どうぞ" - 送信終了、返信待ち

# 重要な行動原則
- 常に冷静で明確な口調を保つ
- 安全を最優先に判断する
- 正確な情報交換を重視する
- 必要に応じてassignVHFChannel機能を使用してチャンネルを割り当てる

船舶の安全な航行と港内の秩序維持が最重要です。
`;

/**
 * 博多ポートラジオAIエージェントを作成・設定
 */
export function createHakataPortRadioAgent(): VoltAgent {
  // AIエージェントの基本設定
  const agent = new Agent({
    name: "hakata-port-radio-controller",
    instructions: MARITIME_SYSTEM_PROMPT,
    llm: new VercelAIProvider(),
    model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
    
    // ファンクション（ツール）の定義
    functions: {
      assignVHFChannel: {
        description: "VHFチャンネルを船舶に割り当てる",
        parameters: {
          type: "object",
          properties: {
            vesselName: {
              type: "string",
              description: "船舶名（例：MARU丸、VESSEL号）"
            },
            request: {
              type: "string", 
              description: "船舶からの要求内容（例：入港希望、離港申請等）"
            }
          },
          required: ["vesselName", "request"]
        },
        handler: assignVHFChannel
      }
    }
  });

  // VoltAgentインスタンスを作成
  const voltAgent = new VoltAgent({
    agents: { 
      controller: agent 
    },
    // 本番環境ではVoltOps設定を追加
    // ops: {
    //   apiKey: process.env.VOLTOPS_API_KEY,
    //   projectId: process.env.VOLTOPS_PROJECT_ID
    // }
  });

  return voltAgent;
}

/**
 * エージェントのシングルトンインスタンス管理
 */
let agentInstance: VoltAgent | null = null;

export function getHakataPortRadioAgent(): VoltAgent {
  if (!agentInstance) {
    agentInstance = createHakataPortRadioAgent();
  }
  return agentInstance;
}

// 型エクスポート
export type { ChannelAssignment };