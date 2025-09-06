# PdM技術判断書

**日付**: 2025年9月X日 14:45  
**発行者**: プロダクトマネージャー

## 技術スタック最終決定

### 採用技術：@openai/agents-realtime + Function Call

リサーチャー報告と開発状況を総合的に評価し、以下の理由により本技術スタックを正式採用します。

## 判断根拠

### 1. 遅延性能の優位性

| アーキテクチャ | 推定遅延 | 評価 |
|-------------|---------|------|
| Realtime API (現行) | 200-300ms | ⭐⭐⭐ 最適 |
| Whisper + GPT-4 + TTS | 600-900ms | ⭐ 不適 |
| Vercel AI SDK | 400-600ms | ⭐⭐ 可 |

**結論**: 海上無線通信には即応性が必須。Realtime APIの低遅延は譲れない。

### 2. 実装状況の現実

- 音声通信：✅ 完全動作
- UI表示：✅ 実装済み
- Function Call：⚠️ 要確認（手動オーケストレーション必要）
- ワークフロー：⚠️ 追加実装必要

**判断**: 既に70%完成。残り30%の実装で完成可能。

### 3. コスト・複雑性分析

```
現行案（Realtime + Function）
├─ API呼び出し: 1回
├─ 複雑性: 中
└─ 追加工数: 2-3時間

代替案（Whisper + TTS）
├─ API呼び出し: 3回
├─ 複雑性: 高
└─ 再実装工数: 8-10時間
```

## 実装指示

### 15:00-17:00 集中実装タイム

#### 必須実装項目（2時間で完了可能）

1. **Function Call オーケストレーション** (1時間)
```javascript
// 必須実装コード
const handleToolCall = async (toolCall) => {
  if (toolCall.name === 'assignVHFChannel') {
    // チャンネル割り当てロジック
    const channel = await findAvailableChannel();
    const result = {
      channel: channel,
      vessel: toolCall.args.vesselName,
      message: `チャンネル${channel}番でお願いします`
    };
    
    // UIを更新
    updateChannelTable(result);
    
    // 結果を返す
    session.sendToolOutput(toolCall.id, result);
  }
};

session.on('tool_call', handleToolCall);
```

2. **状態管理の実装** (30分)
```javascript
enum WorkflowState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING', 
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED'
}

const [state, setState] = useState<WorkflowState>(WorkflowState.IDLE);
```

3. **UIリアルタイム更新の確認** (30分)
- tool_call実行後の自動更新
- チャンネルステータス変更
- 船舶名表示

### 妥協可能項目（後日実装）

- 5分タイムアウト
- データベース永続化
- VoltOps監視
- 複雑なエラーハンドリング

## タイムライン

| 時刻 | アクション | 担当 | 成果物 |
|------|-----------|------|--------|
| 14:45 | 実装確認 | 開発チーム | 現状報告 |
| 15:00 | Function Call実装 | Backend | オーケストレーション |
| 16:00 | 状態管理実装 | Frontend | ワークフロー制御 |
| 16:30 | 統合テスト | QA | 動作確認 |
| 17:00 | 最終調整 | 全員 | バグ修正 |
| 17:30 | デモ準備 | PM | シナリオ確認 |
| 18:00 | **MVP完成デモ** | 全員 | 🎯 |

## リスクと対策

### リスク1: Function Callが動作しない
**対策**: 最悪の場合、固定チャンネル（Ch.10）を返すダミー実装でデモ

### リスク2: UI更新が間に合わない
**対策**: 手動更新ボタンを追加（デモでは手動クリック）

### リスク3: 音声認識が不安定
**対策**: テキスト入力フォールバックを準備

## 成功基準

### 最低限（MUST HAVE）
- [ ] 音声で「博多ポートラジオ、こちら○○丸」
- [ ] AIが「チャンネルX番でお願いします」と応答
- [ ] UIにチャンネル番号が表示される

### 理想（NICE TO HAVE）
- [ ] 完全自動のUI更新
- [ ] 複数船舶の同時管理
- [ ] エラー時の優雅な処理

## 最終メッセージ

開発チームの皆様、

**あと3時間で完成です。**

難しい理論は忘れて、動くものを作りましょう。
Function Callの手動処理？問題ありません。2-3時間で実装可能です。

Whisper+TTSへの変更は絶対に避けてください。遅延が致命的です。

現在のRealtime API実装を活かし、不足部分を補完すれば完成です。

18:00に動作デモを見せてください。
完璧でなくても構いません。**動くMVP**が重要です。

頑張りましょう！

---
プロダクトマネージャー
