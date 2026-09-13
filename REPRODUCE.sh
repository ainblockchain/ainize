#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
mode="${1:-test}"
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  echo 'Node.js 24+ is required. From a Node 22 host: npx --yes --package=node@24 -c "bash REPRODUCE.sh test"' >&2
  exit 2
fi
case "$mode" in
  test)
    (
      cd integrations/mcp
      npm ci
      npm run build
      npm test
      node scripts/validate-graph-evidence.mjs evidence/ethonline2026/tokens.jsonl
    )
    (
      cd integrations/cli
      npm ci
      npm run build
      node --test --import tsx test/ens.test.ts test/ens-rpc.test.ts
    )
    (
      cd integrations/ens
      bash scripts/setup.sh
      npm test
    )
    ;;
  live-graph)
    GRAPH_DEMO_OUT=evidence/reproduction/tokens.jsonl bash integrations/mcp/scripts/demo-graph.sh
    ;;
  sepolia-check)
    (
      cd integrations/ens
      bash scripts/setup.sh
      node scripts/deploy-sepolia.mjs --check
    )
    ;;
  *)
    echo 'Usage: bash REPRODUCE.sh [test|live-graph|sepolia-check]' >&2
    exit 2
    ;;
esac
