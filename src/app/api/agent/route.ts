import { NextRequest, NextResponse } from 'next/server';
import { getHakataPortRadioAgent } from '@/lib/agent/custom-volt-agent';

// Vercelサーバーレス環境での動的レンダリングを強制
export const dynamic = 'force-dynamic';

/**
 * 博多ポートラジオAIエージェントのAPI接続エンドポイント
 * POST /api/agent - エージェントとのやり取り
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'メッセージが必要です' }, 
        { status: 400 }
      );
    }

    // カスタムVoltAgentインスタンスの取得
    const agent = getHakataPortRadioAgent();
    
    // エージェントにメッセージを送信
    const response = await agent.generateText(message);

    return NextResponse.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'エージェントの処理中にエラーが発生しました',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent - エージェントの状態確認
 */
export async function GET() {
  try {
    const agent = getHakataPortRadioAgent();
    
    return NextResponse.json({
      status: 'active',
      agentName: 'hakata-port-radio-controller',
      timestamp: new Date().toISOString(),
      available: true
    });

  } catch (error) {
    console.error('Agent Status Check Error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        error: 'エージェントの状態確認に失敗しました'
      }, 
      { status: 500 }
    );
  }
}