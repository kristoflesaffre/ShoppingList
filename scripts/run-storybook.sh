#!/usr/bin/env sh
# Verhoog file descriptor limit (voorkomt EMFILE bij Storybook op macOS)
ulimit -n 10240 2>/dev/null || true
# Minder gelijktijdige file watchers (watchpack)
export WATCHPACK_WATCHER_LIMIT=500
# Polling i.p.v. native watchers = minder open files (trager maar voorkomt EMFILE)
export CHOKIDAR_USEPOLLING=1
export CHOKIDAR_INTERVAL=2000
exec node -r ./scripts/patch-os-network.cjs ./node_modules/storybook/bin/index.cjs dev -p 6006 -h 127.0.0.1 "$@"
