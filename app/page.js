/**
 * RSC脆弱性検証用ページ
 *
 * ⚠️ 警告: このコードは教育・研究目的のみで作成されています
 *
 * CVE-2025-55182（React2Shell）の脆弱性を再現するための最小構成です。
 */

import { vulnerableAction } from './actions'

/**
 * ホームページコンポーネント
 *
 * Server Actions は app/actions.js に定義されています。
 */
export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>RSC脆弱性検証環境</h1>

      <div
        style={{
          padding: '1rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginTop: '1rem',
        }}
      >
        <h2>⚠️ 警告</h2>
        <p>
          このアプリケーションは<strong>教育・研究目的のみ</strong>で作成されています。
        </p>
        <ul>
          <li>意図的に脆弱な設定を使用しています</li>
          <li>CVE-2025-55182（React2Shell）の検証用です</li>
          <li>ローカル環境（localhost:3000）でのみ実行してください</li>
          <li>外部に公開しないでください</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>環境情報</h2>
        <ul>
          <li>
            <strong>Next.js</strong>: 15.0.0 (脆弱バージョン)
          </li>
          <li>
            <strong>React</strong>: 19.0.0
          </li>
          <li>
            <strong>react-server-dom-webpack</strong>: 19.0.0 (脆弱バージョン)
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>テスト方法</h2>
        <p>別のターミナルで以下のコマンドを実行してください：</p>
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
          }}
        >
          <code>node doc/exploit-sample.js id</code>
        </pre>
        <p>または自動テストを実行：</p>
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
          }}
        >
          <code>npm test</code>
        </pre>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#d1ecf1',
          border: '1px solid #0c5460',
          borderRadius: '4px',
        }}
      >
        <h2>学習ポイント</h2>
        <ul>
          <li>デシリアライズ処理の脆弱性メカニズム</li>
          <li>Server Actionsの適切な実装方法</li>
          <li>入力検証の重要性</li>
          <li>バージョン管理とセキュリティパッチ</li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#f8f9fa',
          borderLeft: '4px solid #6c757d',
          fontSize: '0.9rem',
        }}
      >
        <p>
          <strong>Server Actions:</strong> app/actions.js に vulnerableAction が定義されています。
        </p>
        <p>
          この関数は意図的に入力検証を省略しており、exploit-sample.jsからのペイロードを処理します。
        </p>
      </div>

      {/* Server Actionを露出するためのフォーム（非表示） */}
      <form action={vulnerableAction} style={{ display: 'none' }}>
        <input type="hidden" name="data" />
      </form>
    </main>
  )
}
