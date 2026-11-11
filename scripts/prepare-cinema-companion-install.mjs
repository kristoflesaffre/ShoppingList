/** Targeted shell-only update for the HA Terminal add-on (which has no python3). */
import fs from 'node:fs/promises';
const bridge=JSON.parse(await fs.readFile('.cache/projector-relay/bridge.json','utf8'));
const metadataProbe=process.argv.includes('--metadata-probe-installed');
if(!/^[a-f0-9-]{36}$/i.test(bridge.ownerId))throw new Error('Invalid owner ID');
const lines=['set -eu','root=/homeassistant','folder="$root/custom_components/shoppinglist_cinema"','test -f "$folder/screen.py"','test -f "$root/shoppinglist-cinema.yaml"','stamp=$(date +%s)'];
for(const name of ['__init__.py','companion.py']){
 const body=await fs.readFile(`home-assistant/custom_components/shoppinglist_cinema/${name}`,'utf8');
 lines.push(`if [ -f "$folder/${name}" ]; then cp -p "$folder/${name}" "$folder/${name}.before-companion-$stamp"; fi`,`printf '%s' '${Buffer.from(body).toString('base64')}' | base64 -d > "$folder/${name}.companion-new"`,`mv "$folder/${name}.companion-new" "$folder/${name}"`);
}
lines.push('config="$root/shoppinglist-cinema.yaml"','cp -p "$config" "$config.before-companion-$stamp"',`sed '/^companion_enabled:/d; /^owner_id:/d; /^companion_metadata_probe:/d' "$config" > "$config.companion-new"`,`printf '\\ncompanion_enabled: true\\nowner_id: ${bridge.ownerId}\\ncompanion_metadata_probe: ${metadataProbe}\\n' >> "$config.companion-new"`,'mv "$config.companion-new" "$config"','ha core check',`printf '%s\\n' 'Companion files installed and configuration checked. Restart Core separately. No device commands sent.'`);
await fs.mkdir('.cache/cinema-companion',{recursive:true,mode:0o700});
const source=Buffer.from(lines.join('\n')+'\n').toString('base64');
await fs.writeFile('.cache/cinema-companion/install-command.txt',`printf '%s' '${source}' | base64 -d | sh`,{mode:0o600});
console.log('Private shell-only companion installer prepared. No restart or device commands executed.');
