'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * 博多ポートラジオ音声通信コンポーネント
 * OpenAI Realtime API を使用した音声入出力
 */

interface VoiceRadioProps {
  className?: string;
}

interface SessionData {
  clientSecret: string;
  sessionId: string;
  expiresAt: number;
  session: any;
}

export default function VoiceRadio({ className = '' }: VoiceRadioProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [lastMessage, setLastMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('待機中');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // リアルタイムセッション初期化
  const initializeSession = async () => {
    try {
      setConnectionStatus('セッション初期化中...');
      
      const response = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('セッション初期化に失敗しました');
      }

      const data: SessionData = await response.json();
      setSessionData(data);
      setConnectionStatus('セッション準備完了');
      
      return data;
    } catch (error) {
      console.error('Session initialization error:', error);
      setConnectionStatus(`エラー: ${(error as Error).message}`);
      return null;
    }
  };

  // WebSocket接続
  const connectWebSocket = async (sessionData: SessionData) => {
    try {
      setConnectionStatus('WebSocket接続中...');
      
      // OpenAI Realtime WebSocket接続
      // client_secretを認証として使用
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-realtime&auth=${sessionData.clientSecret}`;
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔊 WebSocket接続成功');
        
        // 最初に認証メッセージを送信
        ws.send(JSON.stringify({
          type: 'session.create',
          session: sessionData.session
        }));
        
        setIsConnected(true);
        setConnectionStatus('接続済み - 通信可能');
        
        console.log('📤 セッション作成メッセージ送信完了');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 受信メッセージ:', message.type);
          
          switch (message.type) {
            case 'session.created':
              console.log('✅ セッション作成完了');
              break;
              
            case 'conversation.item.input_audio_transcription.completed':
              setLastMessage(`送信: ${message.transcription}`);
              break;
              
            case 'response.audio.delta':
              // 音声データの再生処理
              if (message.delta && audioContextRef.current) {
                playAudioDelta(message.delta);
              }
              break;
              
            case 'response.text.delta':
              setLastMessage(prev => prev + (message.delta || ''));
              break;
              
            case 'error':
              console.error('❌ WebSocketエラー:', message.error);
              setConnectionStatus(`エラー: ${message.error.message}`);
              break;
          }
        } catch (error) {
          console.error('メッセージ解析エラー:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket切断');
        setIsConnected(false);
        setConnectionStatus('切断');
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocketエラー:', error);
        setIsConnected(false);
        setConnectionStatus('エラー発生');
      };

      wsRef.current = ws;
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus(`接続エラー: ${(error as Error).message}`);
    }
  };

  // 音声データ再生
  const playAudioDelta = (deltaData: string) => {
    try {
      if (!audioContextRef.current) return;
      
      // Base64デコードしてPCM16データを取得
      const binaryData = atob(deltaData);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      // PCM16データをAudioBufferに変換して再生
      // 実装の詳細は簡略化
      console.log('🔊 音声データ再生:', bytes.length, 'バイト');
      
    } catch (error) {
      console.error('音声再生エラー:', error);
    }
  };

  // PTT（Push-to-Talk）開始
  const startTransmission = async () => {
    if (!isConnected || !wsRef.current) {
      alert('接続が確立されていません');
      return;
    }

    try {
      setIsTransmitting(true);
      
      // マイクへのアクセス
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      // 音声ストリーミング開始をWebSocketに通知
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: '' // 実際の音声データは別途送信
      }));
      
      console.log('🎤 送信開始');
      
    } catch (error) {
      console.error('送信開始エラー:', error);
      setIsTransmitting(false);
    }
  };

  // PTT終了
  const stopTransmission = () => {
    if (!wsRef.current) return;
    
    setIsTransmitting(false);
    
    // ストリーム停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 音声入力完了をWebSocketに通知
    wsRef.current.send(JSON.stringify({
      type: 'input_audio_buffer.commit'
    }));
    
    // レスポンス生成を要求
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    }));
    
    console.log('🎤 送信終了');
  };

  // 接続開始
  const handleConnect = async () => {
    const session = await initializeSession();
    if (session) {
      // AudioContext初期化
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      await connectWebSocket(session);
    }
  };

  // 切断
  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setSessionData(null);
    setConnectionStatus('切断');
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, []);

  return (
    <div className={`p-6 bg-gray-900 text-white rounded-lg ${className}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">🏔️ 博多ポートラジオ</h2>
        <p className="text-sm text-gray-300">海上交通管制 - 音声通信システム</p>
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
        
        {sessionData && (
          <div className="text-xs text-gray-400">
            セッション: {sessionData.sessionId.substring(0, 12)}...
          </div>
        )}
      </div>

      <div className="mb-4">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
          >
            📡 接続開始
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
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
            {isTransmitting ? '🔴 送信中 - PTT' : '🎤 長押しで送信 - PTT'}
          </button>
          <p className="text-xs text-center text-gray-400 mt-1">
            Push-to-Talk: ボタンを長押ししている間送信されます
          </p>
        </div>
      )}

      {lastMessage && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="text-sm font-semibold mb-1">最新の通信:</div>
          <div className="text-sm text-gray-300">{lastMessage}</div>
        </div>
      )}
    </div>
  );
}