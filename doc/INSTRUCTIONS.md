# プロジェクト開発計画書

## プロジェクト概要

### プロジェクト名

home-lab-rotten-next

### 目的

React Server Components (RSC) の脆弱性（CVE-2025-55182、別名React2Shell）を安全な環境で検証し、セキュリティ対策の理解を深めることを目的とします。このプロジェクトは、防御的セキュリティ研究および教育目的に限定されます。

### 背景

- Next.js 15.xおよび16.xで使用されるRSCのデシリアライズ処理に脆弱性が発見されました
- この脆弱性のメカニズムを理解することで、より安全なアプリケーション開発に役立てます
- セキュリティ対策の学習と、開発チームの技術力向上を目的としています
- すべてのテストはローカル環境（WSL）で実施され、外部システムへの影響はありません

## 技術スタック

### フロントエンド

- Next.js 15.0.0（脆弱性検証のため意図的に脆弱バージョンを使用）
- React 19.0.0
- React DOM 19.0.0

### バックエンド

- Node.js v25.x
- react-server-dom-webpack 19.0.0（脆弱性の対象パッケージ）
- App Router（React Server Componentsを有効化）
- Server Actions（脆弱性の露出点）

### インフラ・デプロイ

- WSL (Windows Subsystem for Linux)
- ローカル開発環境のみ（http://localhost:3000）
- 外部デプロイは行わない（セキュリティ上の理由）

### 開発ツール

- pnpm（パッケージマネージャー）
- nvm（Node.jsバージョン管理）
- Git（バージョン管理）
- curl（エクスプロイトテスト用）

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────┐
│  検証者（テスト実行者）                    │
│  - exploit-sample.js                     │
│  - FormDataでペイロード送信               │
└──────────────┬──────────────────────────┘
               │ HTTP POST
               │ (検証用Flight payload)
               ▼
┌─────────────────────────────────────────┐
│  Next.js アプリケーション                 │
│  - App Router (localhost:3000)          │
│  - Server Actions 有効                   │
│  - RSC デシリアライズ処理                 │
└──────────────┬──────────────────────────┘
               │ 脆弱性のメカニズムにより
               │ コード実行が可能
               ▼
┌─────────────────────────────────────────┐
│  サーバー環境                             │
│  - child_process.execSync()             │
│  - コマンド実行のデモンストレーション       │
└─────────────────────────────────────────┘
```

### ディレクトリ構成

```
/
├── doc/                    # ドキュメント
│   ├── README.md          # ドキュメント一覧
│   ├── INSTRUCTIONS.md    # プロジェクト開発計画書（本ファイル）
│   ├── DRAFT.md           # RSC脆弱性PoC提案書
│   └── exploit-sample.js  # エクスプロイトコード（検証用）
├── proof/                 # 検証・実証用ファイル（実行結果やログを保存）
├── app/                   # Next.js App Router（作成予定）
│   ├── page.js           # 脆弱なサーバーコンポーネント
│   └── api/              # APIルート
├── next.config.js         # Next.js設定（作成予定）
├── package.json           # 依存関係定義（作成予定）
├── .gitignore            # Git除外設定
└── README.md             # プロジェクト概要
```

## 開発計画

### フェーズ1: 初期セットアップ

- [x] プロジェクトリポジトリの作成
- [x] ドキュメント構造の構築（doc/、proof/ディレクトリ）
- [x] INSTRUCTIONS.mdおよびDRAFT.mdの作成
- [ ] Node.js v25とpnpmのインストール（nvmを使用）
- [ ] Next.js 15.0.0プロジェクトの初期化
- [ ] 脆弱バージョンの依存関係固定

### フェーズ2: 脆弱なアプリケーションの実装

- [ ] next.config.jsの作成（App Router、Server Actions有効化）
- [ ] app/page.jsの作成（脆弱なサーバーコンポーネント実装）
- [ ] 最小限の脆弱エンドポイント露出
- [ ] ローカルサーバーの起動確認（localhost:3000）

### フェーズ3: エクスプロイトの検証

- [ ] exploit-sample.jsの動作確認
- [ ] 既存PoCの解析と理解
- [ ] オリジナルエクスプロイトコードの実装（理解深化のため）
- [ ] 各種コマンドでのテスト実行（例: id, whoami, echo）
- [ ] 検証結果のログ保存（proof/ディレクトリ）

### フェーズ4: 緩和策の実装と文書化

- [ ] パッチバージョンへのアップグレード（react-server-dom-webpack 19.3.0+）
- [ ] 緩和策実装後の再テスト（脆弱性が修正されたことを確認）
- [ ] 検証レポートの作成（メカニズム、影響範囲、対策）
- [ ] チーム向けプレゼンテーション資料の作成
- [ ] ドキュメントの最終整備

## セキュリティ考慮事項

### 脆弱性の詳細

**CVE-2025-55182（React2Shell）**

- 影響範囲: react-server-dom-webpack 19.0.0〜19.2.0
- Next.js 15.x、16.x（一部14.x canary版）が該当
- Flightプロトコルのデシリアライズ処理における入力検証の学習ポイント
- `.constructor`や`.prototype`経由でのオブジェクトアクセスのメカニズム
- デシリアライズの適切な実装方法を学ぶための教材として活用

### 対策方法

1. **即座のアップグレード**: react-server-dom-webpack 19.3.0以降にアップデート
2. **Next.jsのアップデート**: 最新の安定版を使用
3. **入力検証の強化**: カスタムミドルウェアでペイロード検査を実施
4. **最小権限原則**: サーバープロセスの実行権限を制限
5. **依存関係の監視**: npm audit、Snykなどで定期的にスキャン

### 研究目的の注意事項

**本プロジェクトの学習方針**

- このプロジェクトは防御的セキュリティ研究および教育目的で設計されています
- 責任ある研究者として、学んだ知識を建設的に活用することを推奨します
- すべてのテストは隔離されたローカル環境（WSL）で実施します
- 学習成果は適切な範囲で共有し、セキュリティコミュニティに貢献します
- 自己所有のシステムでのみテストを行い、倫理的な研究を心がけます

### 倫理ガイドライン

- OWASP倫理ガイドラインに準拠
- NIST SP 800-115（セキュリティテストガイドライン）に従う
- テストは自己所有のシステムに対してのみ実施
- 発見した脆弱性は責任を持って開示（Responsible Disclosure）

### 実施環境の設計

- ローカル環境での安全な検証（localhost:3000）
- 隔離された環境で完結する設計
- 検証用の安全なコマンド（例: id, whoami, echo）を使用
- 学習に焦点を当てた最小限の実装

## AI エージェントへの指示

### コーディング規約

- JavaScriptを使用（TypeScriptは不要、最小構成を維持）
- コメントは日本語で記述し、コードの意図を明確にする
- セキュリティ上の問題がある場合は必ず指摘し、警告を表示する
- エクスプロイトコードには必ず「研究目的のみ」のコメントを付ける
- 変数名は英語で記述し、意味が明確になるようにする

### タスク実行時の注意点

1. **学習重視**: セキュリティメカニズムの理解を深めることを最優先する
2. **変更前の確認**: 既存のコードを読み、影響範囲を理解してから変更する
3. **最小限の実装**: 過剰な機能追加は避け、検証に必要な最小構成を維持する
4. **環境の隔離**: localhostでの安全な検証環境を維持する
5. **安全なコマンド**: 情報取得コマンド（id、whoami、echo等）を使用する
6. **学習記録**: 検証結果と学びをproof/ディレクトリに保存する

### ドキュメント管理

- コード変更時は関連ドキュメント（本ファイル）も更新する
- 新機能追加時は開発計画のチェックリストを更新する
- `proof/` ディレクトリには検証結果、ログ、スクリーンショットを配置する
- 重要な発見や問題はDRAFT.mdに追記する
- 各フェーズ完了時は更新履歴に記録する

### 実装時の特記事項

- Next.js 15.0.0を意図的に使用（脆弱バージョン）
- パッケージバージョンは厳密に固定（package.jsonで`=`を使用）
- Server Actionsは意図的に入力検証なしで実装（脆弱性再現のため）
- エクスプロイトコードは教育目的であることを明記

## 参考資料

### 外部リンク

- [CVE-2025-55182 GitHub PoC](https://github.com/dwisiswant0/CVE-2025-55182) - 参考実装
- [React Server Components Documentation](https://react.dev/reference/rsc/server-components)
- [Next.js App Router](https://nextjs.org/docs/app)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final) - セキュリティテストガイドライン

### セキュリティ関連

- [React Security Advisory](https://github.com/facebook/react/security/advisories)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Snyk Vulnerability Database](https://security.snyk.io/)

### 関連ドキュメント

- [README.md](../README.md) - プロジェクト概要
- [doc/README.md](./README.md) - ドキュメント一覧
- [doc/DRAFT.md](./DRAFT.md) - RSC脆弱性PoC提案書（詳細版）
- [doc/exploit-sample.js](./exploit-sample.js) - エクスプロイトコード例

### 技術資料

- [Flight Protocol](https://github.com/facebook/react/tree/main/packages/react-server-dom-webpack) - RSCのシリアライズプロトコル
- [CommonJS Modules](https://nodejs.org/api/modules.html)
- [child_process.execSync](https://nodejs.org/api/child_process.html#child_processexecsynccommand-options)

## 更新履歴

- 2025-12-09: トーンを教育的・建設的に修正（不安を煽る表現を削除し、学習重視の記述に変更）
- 2025-12-09: INSTRUCTIONS.md完成版作成（プロジェクト詳細、開発計画、セキュリティ考慮事項を追加）
- 2025-12-09: 初版作成（テンプレート）
