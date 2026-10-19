#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
if [ -x .cache/broadlink/venv/bin/python ]; then
  .cache/broadlink/venv/bin/python scripts/broadlink-learn.py --resume
else
  echo "De lokale BroadLink-omgeving ontbreekt. Zie docs/broadlink.md."
fi
printf '\nDruk op Enter om te sluiten.\n'
read -r answer
