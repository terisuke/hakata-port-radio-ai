#!/usr/bin/env python3
"""
OpenAI API Key Test Script
博多ポートラジオAI - APIキー動作確認用
"""

import os
from openai import OpenAI

# .envファイルから環境変数を読み込み
def load_env_file():
    env_vars = {}
    try:
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    except FileNotFoundError:
        print("❌ .envファイルが見つかりません")
        return None
    return env_vars

def test_openai_api():
    print("🤖 OpenAI API Key テスト開始...")
    
    # .envファイルから環境変数を読み込み
    env_vars = load_env_file()
    if not env_vars:
        return False
        
    api_key = env_vars.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEYが.envファイルに設定されていません")
        return False
    
    print(f"🔑 APIキー確認: {api_key[:20]}...{api_key[-8:]}")
    
    try:
        # OpenAIクライアントを初期化
        client = OpenAI(api_key=api_key)
        
        print("📡 API接続テスト中...")
        
        # テストリクエスト送信
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "あなたは博多ポートラジオの管制官AIです。簡潔に応答してください。"
                },
                {
                    "role": "user", 
                    "content": "博多ポートラジオ、こちらテスト丸です。接続テストを実施します。"
                }
            ],
            max_tokens=100
        )
        
        # 結果表示
        print("✅ API接続成功！")
        print(f"📝 応答: {completion.choices[0].message.content}")
        print(f"📊 使用トークン数: {completion.usage.total_tokens}")
        print(f"💰 モデル: {completion.model}")
        
        return True
        
    except Exception as e:
        print(f"❌ API接続エラー: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_openai_api()
    if success:
        print("\n🎉 OpenAI APIキーは正常に動作しています！")
        print("Next.js実装での問題は他の要因によるものです。")
    else:
        print("\n⚠️ OpenAI APIキーに問題があります。")
        print("新しいAPIキーの取得が必要です。")