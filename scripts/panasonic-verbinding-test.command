#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
if [ ! -x .cache/panasonic-probe/venv/bin/python ]; then
  echo "De lokale testomgeving ontbreekt. Zie docs/panasonic-comfort-cloud.md."
  read -r answer
  exit 1
fi
.cache/panasonic-probe/venv/bin/python scripts/probe-panasonic.py
probe_result=$?
printf '\nDruk op Enter om dit venster te sluiten.\n'
read -r answer
exit "$probe_result"
