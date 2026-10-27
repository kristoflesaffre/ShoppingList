#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
if [ -x .cache/brel/venv/bin/python ]; then
  .cache/brel/venv/bin/python scripts/brel-setup.py
else
  echo "De lokale BREL-omgeving ontbreekt. Zie docs/brel.md."
fi
printf '\nDruk op Enter om te sluiten.\n'
read -r answer
