# Git初期化スクリプト
# このスクリプトを実行してGitリポジトリを初期化してください

echo "🚀 博多ポートラジオAIシステム - Git初期化"

# Gitリポジトリの初期化
git init

# 初回コミット用のファイルをステージング
git add .

# 初回コミット
git commit -m "feat: 博多ポートラジオAIシステムMVPプロジェクト初期設定

- プロジェクト構造とドキュメントの整備
- 開発ガイドライン、タスク管理表、リスク対策ガイドの作成
- API仕様書と技術仕様書の配置
- 環境変数テンプレートとpackage.json設定
- Gitignoreファイルの設定

プロジェクトの基盤となる全てのドキュメントと設定ファイルを配置完了。"

# ブランチ戦略の説明
echo ""
echo "✅ Gitリポジトリの初期化が完了しました"
echo ""
echo "📌 ブランチ戦略:"
echo "  main         - 本番環境用ブランチ"
echo "  develop      - 開発統合ブランチ"
echo "  feature/*    - 機能開発ブランチ"
echo "  hotfix/*     - 緊急修正ブランチ"
echo ""
echo "開発を始める際は、developブランチから機能ブランチを作成してください:"
echo "  git checkout -b develop"
echo "  git checkout -b feature/phase1-setup"
echo ""
echo "🎯 次のステップ: npm install を実行して依存関係をインストールしてください"
