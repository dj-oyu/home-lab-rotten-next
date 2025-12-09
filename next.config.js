/**
 * Next.js設定ファイル
 *
 * ⚠️ 重要: このプロジェクトは教育・研究目的です
 *
 * このファイルでは意図的に脆弱な設定を有効化しています：
 * - App Router (appDir): RSCを使用するために必要
 * - Server Actions: 脆弱性の露出点
 *
 * 実運用環境では、最新バージョンのNext.jsとReactを使用し、
 * 適切なセキュリティ対策を実施してください。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15ではApp Routerがデフォルトで有効なため、
  // appDir設定は不要です（appディレクトリが存在すれば自動的に有効）

  // 開発時の設定
  reactStrictMode: false, // 検証環境のため無効化

  // ログレベル
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Server Actionsはデフォルトで有効
  // Next.js 15では experimental.serverActions 設定は不要
}

module.exports = nextConfig
