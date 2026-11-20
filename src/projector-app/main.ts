/**
 * Projectorpagina van «Ook rond de tv», ingebouwd in de projector-app «ShoppingList Sfeer» (android/sfeer).
 * Gebundeld door scripts/build-sfeer-apk.mjs (esbuild) en geladen van http://localhost:<poort>/ op de projector zelf
 * (YouTube weigert ingesloten video's op een IP-adres). De app volgt zelf de YouTube van de tv en geeft via
 * `/state` door wat er speelt, samen met de instellingen die de Pi meestuurde. Geen Mac, geen server nodig.
 */
import {
  CORNER_KEYS,
  DEFAULT_MASK,
  maskPolygon,
  nextLead,
  parseMask,
  SEEK_LEAD,
  softEdgePx,
  syncAction,
  videoFrame,
  type ProjectorMask,
  type TvPlayState,
} from "@/lib/ambience-projector";

type State = {
  enabled: boolean;
  calibrating: boolean;
  mask: unknown;
  tv: { videoId: string | null; position: number; state: TvPlayState } | null;
};

type YtPlayer = {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
};

const FRAME_FADE =
  "linear-gradient(to right, transparent 0%, #000 12%, #000 88%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)";
const SCREEN_FADE =
  "linear-gradient(to right, #000 0%, rgba(0,0,0,0) 10%, rgba(0,0,0,0) 90%, #000 100%), linear-gradient(to bottom, #000 0%, rgba(0,0,0,0) 8%)";
const SVG = "http://www.w3.org/2000/svg";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const frameEl = $("frame");
const gridEl = $("grid");
const maskSvg = document.getElementById("mask") as unknown as SVGSVGElement;
const outlineSvg = document.getElementById("outline") as unknown as SVGSVGElement;

let player: YtPlayer | null = null;
let ready = false;
let loaded: string | null = null;
let blocked: string | null = null;
let lastSeek = 0;
let lead = SEEK_LEAD;
let measure = false;

function loadApi(): Promise<void> {
  return new Promise((resolve) => {
    (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => resolve();
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
}

void loadApi().then(() => {
  const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, o: Record<string, unknown>) => YtPlayer } }).YT;
  player = new YT.Player($("player"), {
    width: "100%",
    height: "100%",
    playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0 },
    events: {
      onReady: () => {
        ready = true;
        player?.mute();
      },
      onError: () => {
        // 101/150: de maker laat de video niet buiten YouTube spelen; dan blijft de projector zwart.
        blocked = loaded;
      },
    },
  });
});

/**
 * Alles in procenten van het scherm (vw / %), nooit in pixels: de WebView van de projector meldt een andere breedte dan
 * het beeld (op de XGIMI vier keer te groot), waardoor een pixelopbouw buiten beeld viel. Rekent op een 16:9-beeld.
 */
const W = 1000;
const H = 562.5;

function render(mask: ProjectorMask, calibrating: boolean, showVideo: boolean) {
  const f = videoFrame(mask, W, H);
  Object.assign(frameEl.style, {
    left: `${(f.left / W) * 100}%`,
    top: `${(f.top / H) * 100}%`,
    width: `${(f.width / W) * 100}%`,
    height: `${(f.height / H) * 100}%`,
    opacity: showVideo ? "1" : "0",
    filter: mask.blur ? `blur(${((f.width / W) * 100 * 0.008).toFixed(3)}vw) saturate(1.15)` : "none",
  });
  frameEl.style.setProperty("-webkit-mask-image", FRAME_FADE);
  frameEl.style.setProperty("mask-image", FRAME_FADE);
  frameEl.style.setProperty("-webkit-mask-composite", "source-in");
  frameEl.style.setProperty("mask-composite", "intersect");
  $("fade").style.background = SCREEN_FADE;
  gridEl.style.display = calibrating ? "block" : "none";
  gridEl.style.backgroundSize = "4.1667vw 4.1667vw";

  // Zwart vlak (zachte rand = de hele laag vervagen) en, tijdens het instellen, een scherp wit kader erboven.
  for (const svg of [maskSvg, outlineSvg]) {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }
  const cover = document.createElementNS(SVG, "polygon");
  cover.setAttribute("points", maskPolygon(mask, W, H).map((p) => p.join(",")).join(" "));
  cover.setAttribute("fill", "#000");
  maskSvg.appendChild(cover);
  maskSvg.style.filter = mask.soft > 0 ? `blur(${((softEdgePx(mask.soft, W) / W) * 100).toFixed(3)}vw)` : "none";
  if (calibrating) {
    const pts = CORNER_KEYS.map((k) => [mask.corners[k][0] * W, mask.corners[k][1] * H]);
    const outline = document.createElementNS(SVG, "polygon");
    outline.setAttribute("points", pts.map((p) => p.join(",")).join(" "));
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "#fff");
    outline.setAttribute("stroke-width", "2");
    outline.setAttribute("stroke-linejoin", "round");
    outline.setAttribute("vector-effect", "non-scaling-stroke");
    outlineSvg.appendChild(outline);
    for (const [x, y] of pts) {
      const dot = document.createElementNS(SVG, "ellipse");
      dot.setAttribute("cx", String(x));
      dot.setAttribute("cy", String(y));
      dot.setAttribute("rx", "7");
      dot.setAttribute("ry", "7");
      dot.setAttribute("fill", "#4f55f1");
      dot.setAttribute("stroke", "#fff");
      dot.setAttribute("stroke-width", "2");
      outlineSvg.appendChild(dot);
    }
  }
}

function sync(s: State) {
  if (!player || !ready) return;
  const tv = s.tv;
  const active = s.enabled && !s.calibrating && tv && tv.videoId && tv.state !== "idle" && tv.state !== "ended";
  if (!active || !tv?.videoId) {
    if (player.getPlayerState() === 1) player.pauseVideo();
    return;
  }
  if (blocked === tv.videoId) return;
  const state = player.getPlayerState();
  const now = performance.now();
  if (measure && state === 1 && tv.state === "playing" && now - lastSeek > 3000 && loaded === tv.videoId) {
    measure = false;
    lead = nextLead(lead, player.getCurrentTime() - tv.position);
  }
  const action = syncAction(
    { videoId: tv.videoId, position: tv.position, state: tv.state },
    { videoId: loaded, position: player.getCurrentTime(), playing: state === 1 || state === 3 },
    lead,
  );
  if (action.kind === "load") {
    loaded = action.videoId;
    lastSeek = now;
    measure = true;
    player.loadVideoById({ videoId: action.videoId, startSeconds: Math.max(0, action.at) });
    player.mute();
  } else if (action.kind === "seek") {
    if (now - lastSeek < 4000) return;
    lastSeek = now;
    measure = true;
    player.seekTo(Math.max(0, action.at), true);
  } else if (action.kind === "play") player.playVideo();
  else if (action.kind === "pause") player.pauseVideo();
}

async function tick() {
  try {
    const res = await fetch("/state", { cache: "no-store" });
    const s = (await res.json()) as State;
    const mask = parseMask(s.mask) ?? DEFAULT_MASK;
    const showVideo = s.enabled && !s.calibrating && !!s.tv?.videoId && s.tv.state !== "idle" && s.tv.state !== "ended";
    render(mask, s.calibrating, showVideo);
    // Tijdens het instellen: wat de app van de tv ziet (om na te kijken), klein in een hoek.
    const info = $("info");
    info.style.display = s.calibrating ? "block" : "none";
    if (s.calibrating) info.textContent = s.tv ? `Tv: ${s.tv.state}${s.tv.videoId ? ` · ${Math.round(s.tv.position)} s` : ""}` : "Tv: nog geen verbinding";
    sync(s);
  } catch {
    /* app nog niet klaar: volgende ronde */
  } finally {
    window.setTimeout(tick, 500);
  }
}
void tick();
