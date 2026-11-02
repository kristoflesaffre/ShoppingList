#!/bin/sh
# Maakt «Foto bijsnijden.app» op het bureaublad: sleep er PNG's (of een map) op, of dubbelklik om te kiezen.
# Gebruikt scripts/crop-transparent.mjs uit deze repo.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
APP="$HOME/Desktop/Foto bijsnijden.app"
rm -rf "$APP"
osacompile -o "$APP" <<SCRIPT || exit 1
on run
  set picked to choose file with prompt "Kies de foto's om bij te snijden" of type {"public.image"} with multiple selections allowed
  crop(picked)
end run
on open dropped
  crop(dropped)
end open
on crop(theFiles)
  set args to ""
  repeat with f in theFiles
    set args to args & " " & quoted form of POSIX path of f
  end repeat
  set report to do shell script "cd " & quoted form of "$ROOT" & " && " & quoted form of "$NODE" & " scripts/crop-transparent.mjs" & args & " 2>&1"
  display dialog report buttons {"OK"} default button 1 with title "Foto bijsnijden"
end crop
SCRIPT
echo "Klaar: $APP"
