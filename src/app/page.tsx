import VoiceRadio from '@/components/VoiceRadio';
import VoiceRadioOfficial from '@/components/VoiceRadioOfficial';
import ErrorBoundary from '@/components/ErrorBoundary';

/**
 * 博多ポートラジオAIシステム - メインページ
 * Next.js 15 App Router + OpenAI Realtime API
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            🏔️ 博多ポートラジオ
          </h1>
          <p className="text-xl text-blue-100 mb-2">
            海上交通管制システム - AI音声通信
          </p>
          <p className="text-sm text-blue-200">
            Maritime Traffic Control - AI Voice Communication System
          </p>
        </header>

        {/* メインコンテンツ */}
        <main className="max-w-4xl mx-auto">
          <div className="max-w-3xl mx-auto">
            {/* 音声通信パネル（フル幅） */}
            <ErrorBoundary>
              <VoiceRadioOfficial className="w-full" />
            </ErrorBoundary>
          </div>

          {/* 使用方法説明 */}
          <div className="mt-8 bg-white/10 backdrop-blur rounded-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-4">📖 使用方法</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl mb-2">1️⃣</div>
                <h4 className="font-semibold mb-2">接続</h4>
                <p className="text-sm text-gray-200">
                  「📡 接続開始」ボタンでOpenAI Realtime APIに接続
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">2️⃣</div>
                <h4 className="font-semibold mb-2">通信</h4>
                <p className="text-sm text-gray-200">
                  PTTボタンを長押しして「博多ポートラジオ、こちら〇〇丸」で呼び出し
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">3️⃣</div>
                <h4 className="font-semibold mb-2">応答</h4>
                <p className="text-sm text-gray-200">
                  AI管制官が適切なVHFチャンネルを割り当て、音声で応答
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* フッター */}
        <footer className="text-center mt-12 text-blue-200">
          <p className="text-sm">
            Powered by OpenAI Realtime API + VoltAgent + Next.js 15
          </p>
          <p className="text-xs mt-2">
            海上交通管制訓練システム - Maritime Traffic Control Training System
          </p>
        </footer>
      </div>
    </div>
  );
}