/** Build the optional one-shot probe. Requires an existing JDK and Google's D8/R8 jar.
 * No downloads, device access, permission grants or transport commands.
 * Usage: node scripts/build-cinema-metadata-probe.mjs --jdk=/path/to/jdk --r8=/path/to/r8.jar
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const arg=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const jdk=arg('jdk'),r8=arg('r8');if(!jdk||!r8)throw Error('Provide --jdk and --r8 paths');
const out=path.resolve('.cache/cinema-companion/android-probe');
for(const folder of ['classes','dex'])await fs.mkdir(path.join(out,folder),{recursive:true});
for(const [binary,args] of [
 ['javac',['--release','8','-Xlint:-options','-d',path.join(out,'classes'),'scripts/android/CinemaMetadataProbe.java']],
 ['java',['-cp',path.resolve(r8),'com.android.tools.r8.D8','--min-api','26','--output',path.join(out,'dex'),path.join(out,'classes/CinemaMetadataProbe.class')]],
]){const r=spawnSync(path.join(jdk,'bin',binary),args,{stdio:'inherit'});if(r.status!==0)throw Error(`Build failed: ${binary}`);}
const dex=await fs.readFile(path.join(out,'dex/classes.dex'));
await fs.writeFile(path.join(out,'probe-base64.txt'),dex.toString('base64'),{mode:0o600});
console.log(`Read-only probe: ${dex.length} bytes; SHA-256 ${createHash('sha256').update(dex).digest('hex')}`);
