# 🚀 プロジェクト開始手順書

## 開発チームの皆様へ

博多ポートラジオAIシステムMVPプロジェクトへようこそ。
本ドキュメントは、プロジェクトを開始するための具体的な手順を記載しています。

## 📋 事前準備チェックリスト

開発を開始する前に、以下の項目を確認してください：

### 必須要件
- [ ] Node.js 20.0.0以上がインストールされている
- [ ] Git がインストールされている
- [ ] Vercelアカウントを持っている
- [ ] OpenAIアカウントとAPIキーを取得済み
- [ ] VSCode または適切なコードエディタがセットアップ済み

### 推奨要件
- [ ] Vercel CLIがインストールされている (`npm i -g vercel`)
- [ ] Chrome DevToolsの使用経験がある
- [ ] TypeScriptの基本知識がある

## 🏃 クイックスタート

### 1. リポジトリのセットアップ

```bash
# リポジトリをクローン
cd /Users/teradakousuke/Developer/hakata-port-radio-ai

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.template .env.local
```

### 2. 環境変数の設定

`.env.local`ファイルを開き、以下の必須項目を設定：

```bash
# OpenAI APIキー（必須）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 後でVercelダッシュボードから自動設定されます
# POSTGRES_URL=
# POSTGRES_PRISMA_URL=
```

### 3. Vercelプロジェクトの連携

```bash
# Vercel CLIでログイン
vercel login

# プロジェクトをVercelにリンク
vercel link

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開いて確認。

## 📚 必読ドキュメント

開発を始める前に、以下のドキュメントを必ず読んでください：

1. **[技術仕様書](./TECHNICAL_SPECIFICATION.md)** - プロジェクトの全体像を理解
2. **[開発ガイドライン](./DEVELOPMENT_GUIDE.md)** - 開発規約とフェーズ別タスク
3. **[リスク対策ガイド](./RISK_MITIGATION.md)** - 重要なリスクと対策方法
4. **[API仕様書](./API_REFERENCE.md)** - APIエンドポイントの詳細

## 🎯 最初のタスク割り当て

### フェーズ1（Day 1）の担当者へ

以下のタスクを本日中に完了させてください：

1. **プロジェクト初期化** (1時間)
   ```bash
   npx create-next-app@latest . --typescript --app --tailwind
   ```

2. **依存関係インストール** (30分)
   ```bash
   npm install @voltagent/core @voltagent/voice @voltagent/memory
   npm install @ai-sdk/openai @ai-sdk/react
   npm install @vercel/postgres zod
   ```

3. **Vercel連携** (30分)
   - Vercelダッシュボードでプロジェクト作成
   - GitHubリポジトリと連携

4. **データベース設定** (1時間)
   - Vercel Postgresをプロビジョニング
   - 環境変数を同期

完了後、[タスク管理表](./TASK_TRACKING.md)のステータスを更新してください。

## 💬 コミュニケーション

### 日次スタンドアップ（毎朝9:30）
以下をSlack #hakata-port-radioチャンネルで共有：
- 昨日の完了タスク
- 今日の予定タスク
- ブロッカーや質問

### 質問・相談
- **技術的な質問**: #tech-questions チャンネル
- **仕様の確認**: PdMに直接連絡
- **緊急事項**: @channel でメンション

## 🔧 開発環境のトラブルシューティング

### npm install でエラーが出る場合
```bash
# キャッシュをクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### Vercel CLI が動作しない場合
```bash
# グローバルに再インストール
npm uninstall -g vercel
npm install -g vercel@latest
```

### TypeScriptエラーが出る場合
```bash
# 型チェックを実行
npm run type-check

# VSCodeを再起動
# Command + Shift + P → "TypeScript: Restart TS Server"
```

## 📝 コード提出前のチェックリスト

PRを作成する前に確認：

- [ ] `npm run lint` でエラーがない
- [ ] `npm run type-check` でエラーがない
- [ ] `npm run format` でコードを整形済み
- [ ] 新しい環境変数は`.env.template`に追加済み
- [ ] APIキーなどの秘密情報がコードに含まれていない
- [ ] コミットメッセージが規約に従っている

## 🎉 開発開始！

準備が整ったら、[タスク管理表](./TASK_TRACKING.md)から自分のタスクを確認し、開発を開始してください。

困ったことがあれば、遠慮なくPdMまたはチームメンバーに相談してください。

**一緒に素晴らしいMVPを作りましょう！**

---
プロダクトマネージャーより
