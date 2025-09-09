import { NextRequest, NextResponse } from 'next/server';

// Vercelサーバーレス環境での動的レンダリングを強制
export const dynamic = 'force-dynamic';

/**
 * OpenAI Realtime API用のクライアントシークレット取得エンドポイント
 * POST /api/realtime/session - 音声リアルタイム通信用の認証情報を取得
 */
export async function POST(request: NextRequest) {
  try {
    // OpenAI APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Keyが設定されていません' },
        { status: 500 }
      );
    }

    // リクエストボディから設定を取得（オプション）
    const body = await request.json().catch(() => ({}));
    const { instructions, voice = 'alloy', expires_seconds = 600 } = body;

    // 博多ポートラジオ専用のシステムプロンプト  
    const maritimeInstructions = instructions || `
あなたは博多ポートラジオの熟練した管制官AIです。簡潔で効率的な港湾無線通信を行ってください。

# 基本的な応答プロトコル
1. 船舶からの呼びかけ: "博多ポートラジオ、こちら[船舶名]"
2. 【重要】船舶名を確認したら、まずassignVHFChannelツールを実行する
3. ツール実行結果に基づいて応答: "[船舶名]、チャンネル[番号]へお願いします"
4. ツールを実行せずにチャンネル番号を言ってはいけません

# 使用可能なVHFチャンネル  
- Channel 8: 船舶間通信用
- Channel 10: 港内作業連絡用
- Channel 12: 港務通信用

# IMO SMCP準拠フレーズ
- "Say again" - もう一度お願いします
- "Roger" / "了解" - 了解しました  
- "Stand by" - 待機してください

【必須】船舶の初回呼び出しには必ずassignVHFChannelツールを実行してからチャンネル番号で応答してください。
ツール実行なしでチャンネル番号を発言することは禁止です。
`;

    // OpenAI Realtime API呼び出し
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { 
          anchor: 'created_at', 
          seconds: expires_seconds 
        },
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          instructions: maritimeInstructions
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Realtime API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const sessionData = await response.json();

    return NextResponse.json({
      success: true,
      clientSecret: sessionData.value,
      sessionId: sessionData.session.id,
      expiresAt: sessionData.expires_at,
      session: sessionData.session,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Realtime Session API Error:', error);
    
    return NextResponse.json(
      {
        error: 'リアルタイムセッションの作成に失敗しました',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/session - リアルタイムAPIの状態確認
 */
export async function GET() {
  return NextResponse.json({
    status: 'available',
    service: 'OpenAI Realtime API',
    model: 'gpt-realtime',
    capabilities: ['audio_input', 'audio_output', 'function_calling'],
    timestamp: new Date().toISOString()
  });
}