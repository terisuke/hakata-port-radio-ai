'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RealtimeAgent, RealtimeSession, FunctionTool, tool } from '@openai/agents-realtime';
import { z } from 'zod';

/**
 * 博多ポートラジオ音声通信コンポーネント
 * 公式 @openai/agents-realtime ライブラリを使用
 */

interface VoiceRadioOfficialProps {
  className?: string;
}

// チャンネル状態の型定義
interface ChannelStatus {
  channel: number;
  status: 'available' | 'busy' | 'assigned';
  vesselName?: string;
  assignedAt?: string;
  usageCount?: number; // 使用回数統計
}

export default function VoiceRadioOfficial({ className = '' }: VoiceRadioOfficialProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('待機中');
  const [lastMessage, setLastMessage] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  // チャンネル管理状態
  const [channelStatuses, setChannelStatuses] = useState<ChannelStatus[]>([]);
  
  // localStorageキー
  const STORAGE_KEY = 'hakata-port-radio-channels';
  
  const sessionRef = useRef<RealtimeSession | null>(null);
  const agentRef = useRef<RealtimeAgent | null>(null);
  const lastResponseTimeRef = useRef<number>(0);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // チャンネル状態の永続化関数
  const saveChannelStatuses = (statuses: ChannelStatus[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch (error) {
      console.error('Failed to save channel statuses to localStorage:', error);
    }
  };

  const loadChannelStatuses = (): ChannelStatus[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load channel statuses from localStorage:', error);
    }
    // デフォルト状態を返す
    return [
      { channel: 8, status: 'available', usageCount: 0 },
      { channel: 10, status: 'available', usageCount: 0 },
      { channel: 12, status: 'available', usageCount: 0 }
    ];
  };

  const resetAllChannels = useCallback(() => {
    const defaultChannels = [
      { channel: 8, status: 'available' as const, usageCount: 0 },
      { channel: 10, status: 'available' as const, usageCount: 0 },
      { channel: 12, status: 'available' as const, usageCount: 0 }
    ];
    setChannelStatuses(defaultChannels);
    saveChannelStatuses(defaultChannels);
    console.log('🔄 全チャンネルをリセットしました');
  }, []);

  // コンポーネント初期化時にlocalStorageから読み込み
  useEffect(() => {
    const loaded = loadChannelStatuses();
    setChannelStatuses(loaded);
    console.log('📂 チャンネル状態をlocalStorageから復元:', loaded);
  }, []);

  // チャンネル割り当て機能（バランス型）- Race Condition対策済み
  const assignChannel = useCallback((vesselName: string): number => {
    let assignedChannel = 0;
    
    setChannelStatuses(prevStatuses => {
      // 利用可能なチャンネルを取得（原子的操作内で実行）
      const availableChannels = prevStatuses.filter(ch => ch.status === 'available');
      
      if (availableChannels.length === 0) {
        console.log('⚠️ 利用可能なチャンネルがありません');
        assignedChannel = 0;
        return prevStatuses; // 状態変更なし
      }

      // 最も使用回数の少ないチャンネルを選択（負荷分散）
      const selectedChannel = availableChannels.reduce((prev, current) => {
        const prevUsage = prev.usageCount || 0;
        const currentUsage = current.usageCount || 0;
        return prevUsage <= currentUsage ? prev : current;
      });

      assignedChannel = selectedChannel.channel;

      // 状態を更新（原子的操作）
      const updatedStatuses = prevStatuses.map(ch => 
        ch.channel === selectedChannel.channel 
          ? { 
              ...ch, 
              status: 'assigned' as const, 
              vesselName, 
              assignedAt: new Date().toLocaleTimeString('ja-JP'),
              usageCount: (ch.usageCount || 0) + 1
            }
          : ch
      );
      
      // localStorage保存（updater function内で実行）
      saveChannelStatuses(updatedStatuses);

      console.log(`📻 チャンネル${selectedChannel.channel}を${vesselName}に割り当て（使用回数: ${(selectedChannel.usageCount || 0) + 1}）`);
      return updatedStatuses;
    });

    return assignedChannel;
  }, []);

  // チャンネル解放機能 - Race Condition対策済み
  const releaseChannel = useCallback((channel: number) => {
    setChannelStatuses(prevStatuses => {
      // 原子的操作内でチャンネル解放
      const updatedStatuses = prevStatuses.map(ch => 
        ch.channel === channel 
          ? { channel, status: 'available' as const, usageCount: ch.usageCount || 0 }
          : ch
      );
      
      // localStorage保存（updater function内で実行）
      saveChannelStatuses(updatedStatuses);
      console.log(`📻 チャンネル${channel}を解放`);
      return updatedStatuses;
    });
  }, []);


  // 博多ポートラジオ専用エージェント作成
  const createPortRadioAgent = () => {
    const agent = new RealtimeAgent({
      name: "博多ポートラジオ管制官",
      instructions: `
あなたは博多ポートラジオの熟練した管制官AIです。PTT（Push-to-Talk）システムで簡潔かつ効率的な港湾無線通信を行ってください。

# PTTシステムの特徴  
- 船舶がボタンを押している間の音声のみが送信されます
- PTTボタンを離すと音声送信が完了し、あなたが応答する番になります
- 1回のPTT送信に対して1回のみ応答してください

# 基本的な応答プロトコル
1. 船舶からの呼びかけ: "博多ポートラジオ、こちら[船舶名]"
2. 【重要】船舶名が確認できたら、まずassignVHFChannelツールを実行してください
3. ツール実行後、その結果に基づいて応答: "[船舶名]、チャンネル[番号]へお願いします"
4. ツールを実行せずにチャンネル番号を言ってはいけません

# 使用可能なVHFチャンネル
- Channel 8: 船舶間通信用
- Channel 10: 港内作業連絡用
- Channel 12: 港務通信用  

# IMO SMCP準拠フレーズ
- "Say again" - もう一度お願いします
- "Roger" / "了解" - 了解しました
- "Stand by" - 待機してください

# 重要な行動原則
- 船舶から明確に呼びかけられた時のみ応答する
- 1回のPTT送信には1回のみ応答する  
- 応答は極めて簡潔にする（実際の港湾管制のように）
- 【必須】船舶の初回呼び出し時、まずassignVHFChannelツールを実行する
- ツール実行結果を待ってから、その結果のチャンネル番号で応答する
- ツール実行なしでチャンネル番号を発言することは禁止
- 船舶が「終了」「サインオフ」「通信終了」等を表明したらreleaseVHFChannelツールを使用する

実際の港湾管制のように、効率的で無駄のない通信を心がけてください。
      `,
      voice: "alloy", // 落ち着いた管制官の声
      tools: [
        tool({
          name: 'assignVHFChannel',
          description: 'VHFチャンネルを船舶に割り当てる関数。入港・出港要求があった際に利用可能なチャンネルを自動割り当てします。',
          parameters: z.object({
            vesselName: z.string().describe('船舶名（例：さくら丸、はやぶさ号）'),
            requestType: z.string().describe('要求種別（入港、出港、緊急等）'),
            priority: z.enum(['normal', 'urgent', 'emergency']).default('normal').describe('優先度')
          }),
          execute: async ({ vesselName, requestType, priority }) => {
            console.log(`🔧 Function Call実行: ${vesselName} - ${requestType} - ${priority}`);
            
            // チャンネル割り当て実行
            const assignedChannel = assignChannel(vesselName);
            
            if (assignedChannel > 0) {
              const result = {
                success: true,
                vesselName,
                assignedChannel,
                requestType,
                priority,
                timestamp: new Date().toISOString(),
                message: `チャンネル${assignedChannel}を${vesselName}に割り当てました`
              };
              
              console.log('📻 Function Call結果:', result);
              return JSON.stringify(result);
            } else {
              const result = {
                success: false,
                error: '利用可能なチャンネルがありません',
                vesselName,
                requestType
              };
              
              console.log('⚠️ Function Call失敗:', result);
              return JSON.stringify(result);
            }
          }
        }),
        tool({
          name: 'releaseVHFChannel',
          description: '船舶からの通信終了通知により、VHFチャンネルを解放する関数。船舶が「終了」「サインオフ」「通信終了」等を表明した際に使用します。',
          parameters: z.object({
            vesselName: z.string().describe('船舶名（例：さくら丸、はやぶさ号）'),
            message: z.string().describe('通信終了メッセージ（例：終了します、サインオフ等）')
          }),
          execute: async ({ vesselName, message }) => {
            console.log(`🔧 チャンネル解放実行: ${vesselName} - ${message}`);
            
            // 最新状態をlocalStorageから直接読み込み
            const currentStatuses = loadChannelStatuses();
            
            // 該当船舶のチャンネルを探して解放
            const assignedChannel = currentStatuses.find(ch => ch.vesselName === vesselName && ch.status === 'assigned');
            
            if (assignedChannel) {
              releaseChannel(assignedChannel.channel);
              
              const result = {
                success: true,
                vesselName,
                releasedChannel: assignedChannel.channel,
                message: `チャンネル${assignedChannel.channel}を解放しました`,
                timestamp: new Date().toISOString()
              };
              
              console.log('📻 チャンネル解放結果:', result);
              return JSON.stringify(result);
            } else {
              const result = {
                success: false,
                error: `${vesselName}に割り当てられたチャンネルが見つかりません`,
                vesselName,
                message
              };
              
              console.log('⚠️ チャンネル解放失敗:', result);
              return JSON.stringify(result);
            }
          }
        })
      ]
    });

    agentRef.current = agent;
    return agent;
  };

  // 音声通信セッション開始
  const startConnection = async () => {
    try {
      setConnectionStatus('接続準備中...');
      
      // エージェント作成 - Push-to-Talk専用設定
      const agent = createPortRadioAgent();
      
      // セッション作成 - PTT専用モード
      const session = new RealtimeSession(agent);
      sessionRef.current = session;
      
      setConnectionStatus('OpenAI接続中...');
      
      // OpenAI APIキーで接続
      await session.connect({
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || await getClientApiKey(),
        model: "gpt-realtime"
      });
      
      // セッションを完全にミュート（PTT使用時のみ有効化）
      session.mute(true);
      
      setIsConnected(true);
      setConnectionStatus('接続済み - PTT待機中（ミュート）');
      
      // セッションイベントハンドラー設定
      setupSessionHandlers(session);
      
      console.log('🎙️ 博多ポートラジオ管制システム接続完了 (PTTモード・完全ミュート)');
      
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus(`接続エラー: ${(error as Error).message}`);
      setIsConnected(false);
    }
  };

  // クライアント用APIキー取得（必要に応じて）
  const getClientApiKey = async (): Promise<string> => {
    try {
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('APIキー取得に失敗しました');
      }
      
      const data = await response.json();
      return data.clientSecret;
      
    } catch (error) {
      throw new Error(`APIキー取得エラー: ${(error as Error).message}`);
    }
  };

  // セッションイベントハンドラー設定
  const setupSessionHandlers = (session: RealtimeSession) => {
    // 履歴更新（音声認識結果を含む）
    session.on('history_updated', (history) => {
      console.log('📋 履歴更新:', history.length, 'items');
    });

    // 履歴追加（リアルタイム更新）
    session.on('history_added', (item) => {
      console.log('📋 履歴追加:', item.type);
    });

    // エラーハンドリング
    session.on('error', (error) => {
      console.error('❌ セッションエラー:', error);
      const errorMsg = error?.error || (error as any)?.message || JSON.stringify(error) || '不明なエラー';
      setConnectionStatus(`エラー: ${errorMsg}`);
    });

    // ツール実行要求（Function Call）
    session.on('agent_tool_start', (context, agent, tool, details) => {
      console.log('🔧 Function Call開始:', tool.name, (details as any)?.toolCall?.args || details);
      
      // デバッグ：チャンネル状態表示
      if (tool.name === 'assignVHFChannel') {
        console.log('📊 現在のチャンネル状態（ツール開始時）:', channelStatuses);
        console.log('📊 localStorage状態:', loadChannelStatuses());
      }
    });

    // ツール実行完了（Function Call結果）
    session.on('agent_tool_end', (context, agent, tool, result, details) => {
      console.log('✅ Function Call完了:', tool.name, result);
      
      // Function Call結果をUIに反映
      if (tool.name === 'assignVHFChannel') {
        try {
          const parsedResult = JSON.parse(result);
          console.log('📊 assignVHFChannel結果:', parsedResult);
          
          if (parsedResult.success) {
            setLastMessage(`✅ チャンネル割り当て成功: ${parsedResult.vesselName} → チャンネル${parsedResult.assignedChannel}`);
            
            // デバッグ：更新後の状態確認
            setTimeout(() => {
              console.log('📊 更新後のチャンネル状態:', loadChannelStatuses());
            }, 100);
          } else {
            setLastMessage(`❌ チャンネル割り当て失敗: ${parsedResult.error}`);
          }
        } catch (error) {
          console.error('❌ Function Call結果パース失敗:', error, 'Raw result:', result);
        }
      } else if (tool.name === 'releaseVHFChannel') {
        try {
          const parsedResult = JSON.parse(result);
          console.log('📊 releaseVHFChannel結果:', parsedResult);
          
          if (parsedResult.success) {
            setLastMessage(`✅ チャンネル解放成功: ${parsedResult.vesselName} チャンネル${parsedResult.releasedChannel}解放`);
          } else {
            setLastMessage(`❌ チャンネル解放失敗: ${parsedResult.error}`);
          }
        } catch (error) {
          console.error('❌ Function Call結果パース失敗:', error, 'Raw result:', result);
        }
      }
    });

    // エージェント開始 - 応答制御付き
    session.on('agent_start', (context, agent) => {
      const now = Date.now();
      const timeSinceLastResponse = now - lastResponseTimeRef.current;
      
      // 連続応答を防ぐ（3秒以内の応答は無視）
      if (timeSinceLastResponse < 3000 && lastResponseTimeRef.current > 0) {
        console.log('⏸️ 連続応答を防止 - 前回の応答から', timeSinceLastResponse, 'ms');
        return;
      }
      
      setIsResponding(true);
      lastResponseTimeRef.current = now;
      console.log('🤖 エージェント応答開始:', agent.name);
      
      // 応答タイムアウトを設定（10秒で強制終了）
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      responseTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ 応答タイムアウト - 強制終了');
        setIsResponding(false);
        setAudioPlaying(false);
      }, 10000);
    });

    // エージェント終了 - 完了確認付き
    session.on('agent_end', (context, agent, output) => {
      console.log('🤖 エージェント応答終了:', output);
      
      if (output && output.trim()) {
        setLastMessage(`応答: ${output}`);
        
        // 音声再生完了まで待つ
        setTimeout(() => {
          setIsResponding(false);
          console.log('✅ 応答処理完了');
        }, 1000);
      } else {
        // 空の応答の場合はすぐに終了
        setIsResponding(false);
      }
      
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
    });

    // 音声開始 - 詳細ログ付き
    session.on('audio_start', (context, agent) => {
      setAudioPlaying(true);
      console.log('🔊 音声応答開始 - 再生中');
    });

    // 音声停止 - 完了確認付き  
    session.on('audio_stopped', (context, agent) => {
      setAudioPlaying(false);
      console.log('🔊 音声応答終了 - 再生完了');
    });
  };

  // セッション切断 - メモ化とクリーンアップ強化
  const disconnect = useCallback(async () => {
    // 全てのタイムアウトをクリア
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    // セッション切断
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
        sessionRef.current = null;
        agentRef.current = null;
        setIsConnected(false);
        setConnectionStatus('切断完了');
        console.log('📴 博多ポートラジオ切断完了');
      } catch (error) {
        console.error('切断エラー:', error);
      }
    }
  }, []);

  // マイクストリーム用のref（使用しないが残しておく）
  const streamRef = useRef<MediaStream | null>(null);

  // PTT（Push-to-Talk）開始 - セッション制御版
  const startTransmission = async () => {
    if (!sessionRef.current || !isConnected) {
      alert('接続が確立されていません');
      return;
    }

    try {
      setIsTransmitting(true);
      
      // セッションのミュートを解除（PTT開始）
      sessionRef.current.mute(false);
      setConnectionStatus('送信中 - PTT ON');
      
      console.log('🎤 送信開始 - PTT ON（セッション有効化）');
      
    } catch (error) {
      console.error('送信開始エラー:', error);
      setIsTransmitting(false);
      // エラー時は再度ミュートする
      if (sessionRef.current) {
        sessionRef.current.mute(true);
        setConnectionStatus('接続済み - PTT待機中（ミュート）');
      }
    }
  };

  // PTT終了 - セッション制御版
  const stopTransmission = async () => {
    if (!sessionRef.current) return;
    
    try {
      setIsTransmitting(false);
      
      // セッションを再度ミュート（PTT終了）
      sessionRef.current.mute(true);
      setConnectionStatus('接続済み - PTT待機中（ミュート）');
      
      console.log('🎤 送信終了完了 - PTT OFF（セッションミュート）');
      
    } catch (error) {
      console.error('送信終了エラー:', error);
    }
  };

  // クリーンアップ - Memory Leak対策強化
  useEffect(() => {
    return () => {
      // 全ての非同期処理とリソースをクリーンアップ
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
      
      // MediaStreamのクリーンアップ
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // セッション切断（非同期処理だが、クリーンアップ時は呼び出す）
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className={`p-6 bg-gray-900 text-white rounded-lg ${className}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">🏔️ 博多ポートラジオ</h2>
        <p className="text-sm text-gray-300">海上交通管制 - 公式OpenAI Agents音声通信</p>
      </div>
      
      <div className="mb-4 p-3 bg-gray-800 rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">接続状態:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {connectionStatus}
          </span>
        </div>
        
        {agentRef.current && (
          <div className="text-xs text-gray-400">
            Agent: {agentRef.current.name}
          </div>
        )}
        
        {/* 応答状態インジケーター */}
        {(isResponding || audioPlaying) && (
          <div className="mt-2 flex items-center space-x-2">
            {isResponding && (
              <span className="flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded animate-pulse">
                🤖 応答生成中
              </span>
            )}
            {audioPlaying && (
              <span className="flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded animate-pulse">
                🔊 音声再生中
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-4">
        {!isConnected ? (
          <button
            onClick={startConnection}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            📡 管制システム接続開始
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
          >
            📴 切断
          </button>
        )}
      </div>

      {isConnected && (
        <div className="mb-4">
          <button
            onMouseDown={startTransmission}
            onMouseUp={stopTransmission}
            onTouchStart={startTransmission}
            onTouchEnd={stopTransmission}
            className={`w-full py-6 rounded-lg font-bold text-lg transition-all ${
              isTransmitting 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={!isConnected}
          >
            {isTransmitting ? '🔴 送信中 - PTT ON' : '🎤 長押しで送信 - PTT'}
          </button>
          <p className="text-xs text-center text-gray-400 mt-1">
            PTTモード：ボタンを押している間のみ音声が有効化されます<br/>
            "博多ポートラジオ、こちら○○丸"で呼び出してください
          </p>
        </div>
      )}

      {lastMessage && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="text-sm font-semibold mb-1">最新の通信:</div>
          <div className="text-sm text-gray-300">{lastMessage}</div>
        </div>
      )}

      {/* チャンネル状況パネル */}
      <div className="mt-4 p-4 bg-gray-800 rounded">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold flex items-center">
            📻 VHFチャンネル管制状況
            <span className="ml-2 text-xs text-gray-400">リアルタイム更新</span>
          </h3>
          <button
            onClick={resetAllChannels}
            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded font-medium"
            title="全チャンネルをリセット（永続化データもクリア）"
          >
            🔄 管制リセット
          </button>
        </div>
        
        <div className="space-y-2">
          {channelStatuses.map((channel) => (
            <div 
              key={channel.channel}
              className={`flex justify-between items-center p-3 rounded transition-all ${
                channel.status === 'available' 
                  ? 'bg-green-900/30 border border-green-600/30' 
                  : 'bg-yellow-900/30 border border-yellow-600/30'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-lg">Ch.{channel.channel}</span>
                <div className="text-sm">
                  <div className="font-medium">
                    {channel.channel === 8 && '船舶間通信'}
                    {channel.channel === 10 && '港内作業'}  
                    {channel.channel === 12 && '港務通信'}
                  </div>
                  {channel.vesselName && (
                    <div className="text-gray-400">
                      割当先: {channel.vesselName}
                    </div>
                  )}
                  {channel.assignedAt && (
                    <div className="text-gray-500 text-xs">
                      {channel.assignedAt}割当
                    </div>
                  )}
                  <div className="text-gray-400 text-xs">
                    使用回数: {channel.usageCount || 0}回
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  channel.status === 'available'
                    ? 'bg-green-600 text-white'
                    : 'bg-yellow-600 text-white'
                }`}>
                  {channel.status === 'available' ? '空き' : '使用中'}
                </span>
                
                {channel.status === 'assigned' && (
                  <button
                    onClick={() => releaseChannel(channel.channel)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                    title="チャンネル解放"
                  >
                    解放
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* テスト用コントロール */}
        <div className="mt-3 p-3 bg-gray-700 rounded">
          <div className="text-sm font-semibold mb-2">テスト機能:</div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => assignChannel('さくら丸')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              さくら丸 割り当て
            </button>
            <button
              onClick={() => assignChannel('はやぶさ号')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              はやぶさ号 割り当て
            </button>
            <button
              onClick={resetAllChannels}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
            >
              全チャンネル解放
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-400 text-center">
          IMO SMCP準拠 | 博多港VHF管制システム | リアルタイム更新対応
        </div>
      </div>
    </div>
  );
}