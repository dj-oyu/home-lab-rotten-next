/**
 * ルートレイアウト
 *
 * Next.js App Routerでは、app/layout.jsが必須です。
 * このファイルはアプリケーション全体のHTMLstructureを定義します。
 */

export const metadata = {
  title: 'RSC脆弱性検証環境',
  description: 'CVE-2025-55182（React2Shell）の検証用アプリケーション - 教育・研究目的',
}

/**
 * ルートレイアウトコンポーネント
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子コンポーネント
 * @returns {JSX.Element}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f8f9fa',
          color: '#212529',
        }}
      >
        {children}
      </body>
    </html>
  )
}
