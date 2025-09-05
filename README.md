# 博多ポートラジオAIシステム MVP

## プロジェクト概要
実際の博多ポートラジオの通信を模倣し、海上交通管制のドメインに特化した音声AIエージェントのMVP開発プロジェクト。

**開発期間**: 2025年9月〜（約2.5週間）  
**技術スタック**: VoltAgent + OpenAI Realtime API + Vercel Platform

## クイックスタート

### 1. 環境構築
```bash
# リポジトリのクローン
git clone [repository-url]
cd hakata-port-radio-ai

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.template .env.local
# .env.localを編集し、必要なAPIキーを設定
```

### 2. 開発サーバーの起動
```bash
npm run dev
```

### 3. デプロイ
```bash
vercel
```

## プロジェクト構造
```
hakata-port-radio-ai/
├── docs/                    # プロジェクトドキュメント
│   ├── DEVELOPMENT_GUIDE.md # 開発ガイドライン
│   ├── TASK_TRACKING.md     # タスク管理表
│   ├── API_REFERENCE.md     # API仕様
│   └── RISK_MITIGATION.md   # リスク対策ガイド
├── src/                     # ソースコード（開発チームが作成）
├── .env.template            # 環境変数テンプレート
└── README.md               # このファイル

## チームメンバーの役割

### プロダクトマネージャー
- プロジェクト全体の進行管理
- 技術仕様の明確化
- レビューとフィードバック

### 開発チーム
- 実装作業
- テスト実行
- ドキュメント更新

## 重要なリンク

- [開発ガイドライン](./docs/DEVELOPMENT_GUIDE.md)
- [タスク管理表](./docs/TASK_TRACKING.md)
- [リスク対策ガイド](./docs/RISK_MITIGATION.md)
- [技術仕様書（オリジナル）](./docs/TECHNICAL_SPECIFICATION.md)

## お問い合わせ
プロジェクトに関する質問は、PdMまでお願いします。
