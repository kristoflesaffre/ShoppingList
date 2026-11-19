"use client";

import * as React from "react";
import {
  CORNER_KEYS,
  maskPolygon,
  nextLead,
  SEEK_LEAD,
  softEdgePx,
  syncAction,
  videoFrame,
  type ProjectorMask,
  type TvPlayState,
} from "@/lib/ambience-projector";

/**
 * Projectorpagina van «Ook rond de tv» (canvas «Ambience · Ook op de projector»). Draait schermvullend in een browser
 * op de projector, geopend door de Pi (`ambience-show`) op http://<Mac>:<poort>/projector/sfeer?key=…
 * Speelt dezelfde YouTube-video als de tv, zonder geluid, en volgt de tijd van de tv (de Mac leest die via YouTube's
 * Lounge). Over de tv ligt een zwart vlak. Tijdens het instellen («Tv afdekken») een raster met een wit kader.
 */

type Snapshot = {
  serverNow: number;
  enabled: boolean;
  calibrating: boolean;
  mask: ProjectorMask;
  tv: { videoId: string | null; position: number; state: TvPlayState; connected: boolean } | null;
};

type YtPlayer = {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  getVideoData?(): { video_id?: string };
};
type YtNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YtPlayer };

function loadYoutubeApi(): Promise<YtNamespace> {
  const w = window as unknown as { YT?: YtNamespace & { loaded?: number }; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  return new Promise((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(w.YT!);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

export default function ProjectorAmbiencePage() {
  const [key, setKey] = React.useState<string | null>(null);
  const [snap, setSnap] = React.useState<Snapshot | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [size, setSize] = React.useState({ w: 1920, h: 1080 });
  const holderRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<YtPlayer | null>(null);
  const readyRef = React.useRef(false);
  const loadedRef = React.useRef<string | null>(null);
  const lastSeekRef = React.useRef(0);
  /** Voorsprong bij een sprong, bijgeleerd: na elke sprong meten we hoeveel de projector ernaast zat. */
  const leadRef = React.useRef(SEEK_LEAD);
  const measureRef = React.useRef(false);
  const blockedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setKey(new URLSearchParams(window.location.search).get("key"));
    const resize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const report = React.useCallback(
    (status: string, videoId: string | null) => {
      if (!key) return;
      void fetch("/api/tv/ambience/projector", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, status, videoId }) }).catch(() => undefined);
    },
    [key],
  );

  // Speler (zonder geluid, zonder knoppen).
  React.useEffect(() => {
    let cancelled = false;
    void loadYoutubeApi().then((YT) => {
      if (cancelled || !holderRef.current) return;
      playerRef.current = new YT.Player(holderRef.current, {
        width: "100%",
        height: "100%",
        playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, cc_load_policy: 0 },
        events: {
          onReady: () => {
            readyRef.current = true;
            playerRef.current?.mute();
            // Enkel om in development de afwijking met de tv te meten.
            if (process.env.NODE_ENV !== "production") (window as unknown as { __ambiencePlayer?: YtPlayer }).__ambiencePlayer = playerRef.current ?? undefined;
          },
          onError: (e: { data: number }) => {
            // 101/150: de maker laat de video niet buiten YouTube spelen.
            const blocked = e.data === 101 || e.data === 150;
            blockedRef.current = loadedRef.current;
            report(blocked ? "embed-blocked" : "video-error", loadedRef.current);
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 1) report("playing", loadedRef.current);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [report]);

  // Elke seconde: wat speelt de tv, en loopt de projector gelijk?
  React.useEffect(() => {
    if (!key) return;
    let stop = false;
    const tick = async () => {
      const sent = performance.now();
      try {
        const res = await fetch(`/api/tv/ambience/projector?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        if (!res.ok) {
          setProblem(res.status === 403 ? "Sleutel klopt niet" : "Mac antwoordt niet");
          return;
        }
        const data = (await res.json()) as Snapshot;
        const halfTrip = (performance.now() - sent) / 2000;
        setProblem(null);
        setSnap(data);
        const player = playerRef.current;
        if (!player || !readyRef.current) return;
        const tv = data.tv;
        const active = data.enabled && !data.calibrating && tv && tv.videoId && tv.state !== "idle" && tv.state !== "ended";
        if (!active) {
          if (player.getPlayerState() === 1) player.pauseVideo();
          return;
        }
        if (blockedRef.current === tv.videoId) return;
        const position = tv.state === "playing" ? tv.position + halfTrip : tv.position;
        const state = player.getPlayerState();
        const now = performance.now();
        // Even na een sprong (en zodra hij weer speelt): hoeveel zat hij ernaast? Dat corrigeert de volgende sprong.
        if (measureRef.current && state === 1 && tv.state === "playing" && now - lastSeekRef.current > 3000 && loadedRef.current === tv.videoId) {
          measureRef.current = false;
          leadRef.current = nextLead(leadRef.current, player.getCurrentTime() - position);
        }
        const action = syncAction(
          { videoId: tv.videoId, position, state: tv.state },
          { videoId: loadedRef.current, position: player.getCurrentTime(), playing: state === 1 || state === 3 },
          leadRef.current,
        );
        if (action.kind === "load") {
          loadedRef.current = action.videoId;
          lastSeekRef.current = now;
          measureRef.current = true;
          player.loadVideoById({ videoId: action.videoId, startSeconds: Math.max(0, action.at) });
          player.mute();
        } else if (action.kind === "seek") {
          // Na een sprong even laten bufferen voor we opnieuw meten.
          if (now - lastSeekRef.current < 4000) return;
          lastSeekRef.current = now;
          measureRef.current = true;
          player.seekTo(Math.max(0, action.at), true);
        } else if (action.kind === "play") player.playVideo();
        else if (action.kind === "pause") player.pauseVideo();
      } catch {
        setProblem("Mac antwoordt niet");
      } finally {
        if (!stop) window.setTimeout(tick, 1000);
      }
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [key]);

  const mask = snap?.mask ?? null;
  const calibrating = snap?.calibrating ?? false;
  const showVideo = !!snap?.enabled && !calibrating && !!snap.tv?.videoId && snap.tv.state !== "idle" && snap.tv.state !== "ended";
  const polygon = mask ? maskPolygon(mask, size.w, size.h) : null;
  const points = polygon?.map((p) => p.join(",")).join(" ");
  const corners = mask ? CORNER_KEYS.map((k) => [mask.corners[k][0] * size.w, mask.corners[k][1] * size.h]) : [];
  const frame = mask ? videoFrame(mask, size.w, size.h) : { left: 0, top: 0, width: size.w, height: size.h };

  return (
    <div className="fixed inset-0 z-[100] cursor-none overflow-hidden bg-[#000]">
      {/* Video op het middelpunt van de tv, groter dan de tv (`spread`): naast de tv loopt het tv-beeld verder. */}
      <div
        aria-hidden
        className="absolute overflow-hidden transition-opacity duration-700"
        style={{
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          opacity: showVideo ? 1 : 0,
          filter: mask?.blur ? `blur(${Math.round(frame.width * 0.008)}px) saturate(1.15)` : undefined,
        }}
      >
        {/* Iets groter dan het beeld: de titelbalk en het logo van YouTube vallen erbuiten. */}
        <div className="pointer-events-none absolute -inset-x-[7%] -inset-y-[9%] [&_iframe]:size-full">
          <div ref={holderRef} />
        </div>
      </div>

      {calibrating ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundColor: "#1d2033",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: `${size.w / 24}px ${size.w / 24}px`,
          }}
        />
      ) : null}

      {/* Zwart vlak over de tv (met marge en zachte rand). */}
      {points ? (
        <svg aria-hidden className="absolute inset-0" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <polygon points={points} fill="#000" style={{ filter: mask && mask.soft > 0 ? `blur(${softEdgePx(mask.soft, size.w)}px)` : undefined }} />
          {calibrating ? (
            <>
              <polygon points={corners.map((p) => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
              {corners.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={14} fill="#4f55f1" stroke="#fff" strokeWidth={4} />
              ))}
            </>
          ) : null}
        </svg>
      ) : null}

      {problem && (calibrating || !snap) ?<p className="absolute bottom-6 left-6 text-lg text-[#ffffffb3]">{problem}</p> : null}
    </div>
  );
}
