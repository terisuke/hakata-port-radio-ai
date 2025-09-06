import { openai } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';

/**
 * VoltAgent互換のカスタムエージェント実装
 * 実装ガイド Option 2 に基づく実装
 */

// チャンネル割り当て結果の型定義
interface ChannelAssignmentResult {
  success: boolean;
  channel: number;
  vessel: string;
  request: string;
  assignedAt: string;
}

// ファンクション実行結果の型定義
interface FunctionCallResult {
  name: string;
  arguments: any;
  result: any;
}

// 利用可能なVHFチャンネル
const AVAILABLE_CHANNELS = [8, 10, 12];

/**
 * チャンネル割り当て機能（ツール実装）
 */
async function assignVHFChannelTool(vesselName: string, request: string): Promise<ChannelAssignmentResult> {
  // 簡易実装: 最初の利用可能チャンネルを割り当て
  // 本番環境では適切なデータベース検索が必要
  const assignedChannel = AVAILABLE_CHANNELS[0];
  
  console.log(`📻 VHFチャンネル割り当て: ${vesselName} → チャンネル${assignedChannel}`);
  
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
- 船舶からの要請に応じてassignVHFChannel機能を使用する

船舶の安全な航行と港内の秩序維持が最重要目標です。
`;

/**
 * VoltAgent互換のカスタムエージェント実装クラス
 */
export class CustomVoltAgent {
  private systemPrompt: string;
  private model: any;
  
  constructor(config: {
    systemPrompt: string;
    model?: string;
  }) {
    this.systemPrompt = config.systemPrompt;
    this.model = openai(config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini');
  }

  /**
   * テキスト生成（VoltAgent.Agent.generateText互換）
   */
  async generateText(input: string): Promise<{
    text: string;
    usage?: any;
    finishReason?: string;
    toolCalls?: FunctionCallResult[];
  }> {
    try {
      const result = await generateText({
        model: this.model,
        system: this.systemPrompt,
        prompt: input,
        tools: {
          assignVHFChannel: {
            description: 'VHFチャンネルを船舶に割り当てる',
            parameters: z.object({
              vesselName: z.string().describe('船舶名（例：MARU丸、VESSEL号）'),
              request: z.string().describe('船舶からの要求内容（例：入港希望、離港申請等）')
            }),
            execute: async (args: { vesselName: string; request: string }) => {
              return await assignVHFChannelTool(args.vesselName, args.request);
            }
          }
        },
        toolChoice: 'auto',
        maxTokens: 1000
      });

      // ツール実行結果を処理
      const toolCalls: FunctionCallResult[] = [];
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          toolCalls.push({
            name: toolCall.toolName,
            arguments: toolCall.args,
            result: 'executed' // ツールは既に実行済みで結果はテキストに反映されている
          });
        }
      }

      return {
        text: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
        toolCalls: toolCalls
      };

    } catch (error) {
      console.error('CustomVoltAgent generateText error:', error);
      throw new Error(`エージェント処理エラー: ${(error as Error).message}`);
    }
  }

  /**
   * ストリーミングテキスト生成（将来の拡張用）
   */
  async streamText(input: string) {
    // 将来の実装用プレースホルダー
    throw new Error('streamText は現在実装中です');
  }

  /**
   * 構造化オブジェクト生成（将来の拡張用）
   */
  async generateObject<T>(input: string, schema: z.ZodType<T>) {
    // 将来の実装用プレースホルダー
    throw new Error('generateObject は現在実装中です');
  }
}

/**
 * 博多ポートラジオ専用エージェントファクトリー
 */
export function createHakataPortRadioAgent(): CustomVoltAgent {
  return new CustomVoltAgent({
    systemPrompt: MARITIME_SYSTEM_PROMPT,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  });
}

/**
 * エージェントのシングルトンインスタンス管理
 */
let agentInstance: CustomVoltAgent | null = null;

export function getHakataPortRadioAgent(): CustomVoltAgent {
  if (!agentInstance) {
    agentInstance = createHakataPortRadioAgent();
    console.log('🤖 博多ポートラジオAIエージェント初期化完了');
  }
  return agentInstance;
}

// 型エクスポート
export type { ChannelAssignmentResult, FunctionCallResult };