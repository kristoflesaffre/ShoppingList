#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
if [ -x .cache/panasonic-probe/venv/bin/python ]; then
  .cache/panasonic-probe/venv/bin/python scripts/panasonic-koppelen.py
else
  echo "De Panasonic-testomgeving ontbreekt. Zie docs/panasonic-comfort-cloud.md."
fi
printf '\nDruk op Enter om te sluiten.\n'
read -r answer
