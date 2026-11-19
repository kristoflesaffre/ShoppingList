/**
 * Bouwt «ShoppingList Sfeer» (android/sfeer) tot een ondertekende APK en zet die in de Pi-bridge
 * (home-assistant/custom_components/shoppinglist_cinema/sfeer_apk.py: base64 + sha256 + versionCode).
 * Nodig: JDK 17 en de Android SDK (build-tools 34 + platform android-34). Geen toestel nodig.
 *
 *   node scripts/build-sfeer-apk.mjs [--jdk=/pad/naar/jdk/Contents/Home] [--sdk=/pad/naar/android-sdk]
 *
 * De sleutel om te ondertekenen staat in .cache/sfeer/release.keystore (niet in Git) en wordt de eerste keer gemaakt;
 * behoud ze: een update met een andere sleutel installeert niet over de vorige heen.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const arg = (name) => process.argv.find((v) => v.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const jdk = arg("jdk") ?? "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home";
const sdk = arg("sdk") ?? process.env.ANDROID_HOME ?? "/opt/homebrew/share/android-commandlinetools";
const tools = path.join(sdk, "build-tools/34.0.0");
const androidJar = path.join(sdk, "platforms/android-34/android.jar");
const env = { ...process.env, JAVA_HOME: jdk, PATH: `${path.join(jdk, "bin")}:${process.env.PATH}` };

const src = path.resolve("android/sfeer");
const out = path.resolve(".cache/sfeer/build");
await fs.rm(out, { recursive: true, force: true });
for (const d of ["classes", "dex"]) await fs.mkdir(path.join(out, d), { recursive: true });

function run(bin, args) {
  const r = spawnSync(bin, args, { stdio: "inherit", env });
  if (r.status !== 0) throw new Error(`Mislukt: ${path.basename(bin)} ${args.slice(0, 2).join(" ")}`);
}

const manifest = await fs.readFile(path.join(src, "AndroidManifest.xml"), "utf8");
const versionCode = Number(/android:versionCode="(\d+)"/.exec(manifest)?.[1]);
if (!versionCode) throw new Error("versionCode ontbreekt in AndroidManifest.xml");

// 0. De projectorpagina (src/projector-app/main.ts + de gedeelde rekenregels) bundelen en in assets/page.html zetten.
const assets = path.join(out, "assets");
await fs.mkdir(assets, { recursive: true });
run(path.resolve("node_modules/.bin/esbuild"), [path.resolve("src/projector-app/main.ts"), "--bundle", "--minify", "--format=iife", "--target=chrome80", `--tsconfig=${path.resolve("tsconfig.json")}`, `--outfile=${path.join(out, "page.js")}`]);
const pageJs = (await fs.readFile(path.join(out, "page.js"), "utf8")).replace(/<\/script/gi, "<\\/script");
const html = (await fs.readFile(path.join(src, "page.html"), "utf8")).replace("/*PAGE_JS*/", () => pageJs);
await fs.writeFile(path.join(assets, "page.html"), html);
// 1. Manifest + assets → basis-APK.
run(path.join(tools, "aapt2"), ["link", "-o", path.join(out, "base.apk"), "-I", androidJar, "--manifest", path.join(src, "AndroidManifest.xml"), "-A", assets, "--min-sdk-version", "26", "--target-sdk-version", "34"]);
// 2. Java → classes → dex.
const sources = [];
for await (const f of fs.glob ? fs.glob("src/**/*.java", { cwd: src }) : []) sources.push(path.join(src, f));
if (sources.length === 0) sources.push(path.join(src, "src/be/shoppinglist/sfeer/MainActivity.java"));
run(path.join(jdk, "bin/javac"), ["-source", "8", "-target", "8", "-Xlint:-options", "-bootclasspath", androidJar, "-d", path.join(out, "classes"), ...sources]);
const classFiles = [];
async function collect(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await collect(p);
    else if (p.endsWith(".class")) classFiles.push(p);
  }
}
await collect(path.join(out, "classes"));
run(path.join(tools, "d8"), ["--lib", androidJar, "--min-api", "26", "--release", "--output", path.join(out, "dex"), ...classFiles]);
// 3. dex in de APK, uitlijnen, ondertekenen.
run("/usr/bin/zip", ["-j", "-q", path.join(out, "base.apk"), path.join(out, "dex/classes.dex")]);
run(path.join(tools, "zipalign"), ["-f", "-p", "4", path.join(out, "base.apk"), path.join(out, "aligned.apk")]);

const keystore = path.resolve(".cache/sfeer/release.keystore");
const passFile = path.resolve(".cache/sfeer/keystore-pass.txt");
let pass;
try {
  pass = (await fs.readFile(passFile, "utf8")).trim();
} catch {
  pass = randomBytes(18).toString("base64url");
  await fs.writeFile(passFile, pass, { mode: 0o600 });
  run(path.join(jdk, "bin/keytool"), ["-genkeypair", "-keystore", keystore, "-storepass", pass, "-keypass", pass, "-alias", "sfeer", "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000", "-dname", "CN=ShoppingList Sfeer"]);
}
const apk = path.join(out, "sfeer.apk");
run(path.join(tools, "apksigner"), ["sign", "--ks", keystore, "--ks-pass", `pass:${pass}`, "--out", apk, path.join(out, "aligned.apk")]);
run(path.join(tools, "apksigner"), ["verify", apk]);

const bytes = await fs.readFile(apk);
const sha = createHash("sha256").update(bytes).digest("hex");
await fs.writeFile(
  "home-assistant/custom_components/shoppinglist_cinema/sfeer_apk.py",
  `"""Generated by scripts/build-sfeer-apk.mjs from android/sfeer. Do not edit."""\nAPK_PACKAGE = 'be.shoppinglist.sfeer'\nAPK_VERSION = ${versionCode}\nAPK_SHA256 = '${sha}'\nAPK_BASE64 = '${bytes.toString("base64")}'\n`,
);
console.log(`ShoppingList Sfeer ${versionCode}: ${bytes.length} bytes; SHA-256 ${sha}`);
