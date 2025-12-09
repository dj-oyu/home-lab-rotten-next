/**
 * Server Actions
 *
 * ⚠️ 警告: このコードは教育・研究目的のみで作成されています
 *
 * このファイルは意図的に脆弱なServer Actionを実装しています。
 * CVE-2025-55182（React2Shell）の脆弱性を再現するための最小構成です。
 */

'use server'

/**
 * 脆弱なサーバーアクション
 *
 * ⚠️ セキュリティ上の問題:
 * - 入力検証なし
 * - デシリアライズ処理が安全でない
 * - .constructorや.prototypeへのアクセスを制限していない
 *
 * この実装により、exploit-sample.jsからのペイロードが
 * 処理され、任意のコードが実行される可能性があります。
 *
 * @param {*} data - クライアントから送信されたデータ（検証なし）
 * @returns {Promise<string>}
 */
export async function vulnerableAction(data) {
  // ⚠️ 意図的に入力検証を省略（脆弱性の再現のため）
  console.log('[VULNERABLE ACTION] Executing with data:', data)

  // ここにexploitで注入されるコードが実行される可能性がある
  // デシリアライズ処理での脆弱性により、
  // child_process.execSync()等が呼び出される

  return 'Action executed'
}
