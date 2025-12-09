# proof/ ディレクトリ

このディレクトリは、RSC脆弱性検証の実証結果とログを保存するためのものです。

## 📁 ディレクトリの目的

- 検証テストの実行結果を記録
- 学習内容とログの保存
- チーム向けレポートの作成

## 📄 含まれるファイル

### ドキュメント
- **TEST_PLAN.md** - テスト計画書（テストケース、手順、判定基準）
- **README.md** - 本ファイル（proof/ディレクトリの説明）

### スクリプト
- **run-tests.sh** - 自動テスト実行スクリプト

### テスト結果（実行後に生成）
- `test1_id_YYYYMMDD_HHMMSS.txt` - idコマンドの実行結果
- `test2_whoami_YYYYMMDD_HHMMSS.txt` - whoamiコマンドの実行結果
- `test3_pwd_YYYYMMDD_HHMMSS.txt` - pwdコマンドの実行結果
- `test4_hostname_YYYYMMDD_HHMMSS.txt` - hostnameコマンドの実行結果
- `test5_echo_YYYYMMDD_HHMMSS.txt` - echoコマンドの実行結果
- `test_summary_YYYYMMDD_HHMMSS.md` - テスト実行サマリー

## 🚀 使い方

### 1. テスト計画の確認
```bash
cat proof/TEST_PLAN.md
```

### 2. Next.jsアプリケーションの起動
```bash
pnpm dev
```

### 3. 自動テストの実行
```bash
./proof/run-tests.sh
```

または、個別にテストを実行：
```bash
node doc/exploit-sample.js id
node doc/exploit-sample.js whoami
node doc/exploit-sample.js pwd
```

### 4. 結果の確認
```bash
# 最新のサマリーを確認
ls -lt proof/test_summary_*.md | head -1 | xargs cat

# 個別のログ確認
cat proof/test1_id_*.txt
```

## 📊 テスト結果の判定

### ✅ 成功の判定
- コマンド実行結果が正しく返る
- システム情報（uid、ユーザー名、パス等）が表示される
- エラーなく完了する

### ❌ 失敗の判定
- "Request failed"エラーが表示される
- 空のレスポンスが返る
- HTTPエラー（404、500等）が発生する

## 🔍 成功の確認方法

### 例: idコマンドの成功例
```
Response: 1:uid=0(root) gid=0(root) groups=0(root)
```
↑このようにユーザー情報が返れば成功

### 例: whoamiコマンドの成功例
```
Response: 1:root
```
↑ユーザー名が返れば成功

### 例: pwdコマンドの成功例
```
Response: 1:/home/user/home-lab-rotten-next
```
↑ディレクトリパスが返れば成功

## 📝 ログファイルの命名規則

```
test{番号}_{コマンド名}_{YYYYMMDD_HHMMSS}.txt
```

- `{番号}`: テストケース番号（1〜5）
- `{コマンド名}`: 実行したコマンド名
- `{YYYYMMDD_HHMMSS}`: 実行日時のタイムスタンプ

## 🔄 パッチ後の検証

脆弱性修正後の検証も同様に実行し、結果を比較します：

```bash
# パッチ適用
pnpm add react-server-dom-webpack@19.3.0

# アプリケーション再起動
pnpm dev

# 再テスト実行
./proof/run-tests.sh
```

パッチ後は、exploitが失敗することを確認します。

## 📚 学習リソース

テスト実行を通じて学ぶポイント：
1. デシリアライズの脆弱性メカニズム
2. `.constructor`や`.prototype`へのアクセス制御
3. Server Actionsの適切な実装
4. 入力検証の重要性
5. バージョン管理とセキュリティパッチ

詳細は [TEST_PLAN.md](./TEST_PLAN.md) を参照してください。

## ⚠️ 注意事項

- **教育目的のみ**: すべてのテストはローカル環境で実施
- **安全なコマンド**: id、whoami、pwd、hostname、echo等の情報取得コマンドのみ使用
- **記録の保管**: すべてのテスト結果をログとして保存
- **学習重視**: 脆弱性のメカニズムを理解することが目的

## 🔗 関連ドキュメント

- [INSTRUCTIONS.md](../doc/INSTRUCTIONS.md) - プロジェクト開発計画書
- [DRAFT.md](../doc/DRAFT.md) - RSC脆弱性PoC提案書
- [exploit-sample.js](../doc/exploit-sample.js) - エクスプロイトコード例
