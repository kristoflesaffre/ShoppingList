"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/lib/weather";

/**
 * Grote, levende weerillustratie voor de dashboardtegels: een zon met gloed en traag draaiende stralen,
 * donzige wolken die zachtjes heen en weer drijven, en vallende regen of sneeuw. Alles traag en subtiel
 * (zie `.wx-*` in globals.css); met «minder beweging» staat alles stil.
 */

type Ids = { core: string; glow: string; cloud: string; cloudBack: string; cloudDark: string };

function Sun({ cx, cy, r, ids }: { cx: number; cy: number; r: number; ids: Ids }) {
  const rays = (count: number, from: number, to: number, offset: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = ((i * 360) / count + offset) * (Math.PI / 180);
      return (
        <line
          key={i}
          x1={cx + Math.cos(a) * from}
          y1={cy + Math.sin(a) * from}
          x2={cx + Math.cos(a) * to}
          y2={cy + Math.sin(a) * to}
        />
      );
    });
  return (
    <g>
      <circle className="wx-glow" cx={cx} cy={cy} r={r * 2} fill={`url(#${ids.glow})`} />
      <g className="wx-rays" stroke="#ffcf3f" strokeWidth={r * 0.16} strokeLinecap="round" opacity={0.9}>
        {rays(12, r * 1.28, r * 1.62, 0)}
      </g>
      <g className="wx-rays-slow" stroke="#ffe27a" strokeWidth={r * 0.1} strokeLinecap="round" opacity={0.6}>
        {rays(12, r * 1.24, r * 1.44, 15)}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.core})`} />
      <ellipse cx={cx - r * 0.32} cy={cy - r * 0.38} rx={r * 0.38} ry={r * 0.24} fill="#fff" opacity={0.35} />
    </g>
  );
}

/** Donzige wolk (lokaal 0–84 × 0–46), getekend met één verloop over de hele wolk. */
function Cloud({ x, y, scale, fill, className }: { x: number; y: number; scale: number; fill: string; className: string }) {
  return (
    <g className={className}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
        <rect x="4" y="24" width="76" height="22" rx="11" />
        <circle cx="24" cy="28" r="15" />
        <circle cx="45" cy="20" r="20" />
        <circle cx="65" cy="29" r="13" />
      </g>
    </g>
  );
}

export function WeatherHero({ kind, size, className }: { kind: WeatherKind; size: number; className?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const ids: Ids = { core: `${uid}c`, glow: `${uid}g`, cloud: `${uid}w`, cloudBack: `${uid}b`, cloudDark: `${uid}d` };
  const front = `url(#${ids.cloud})`;
  const back = `url(#${ids.cloudBack})`;
  const dark = `url(#${ids.cloudDark})`;

  const drops = (y: number) =>
    [44, 58, 72, 86].map((x, i) => (
      <line key={x} className="wx-drop" style={{ animationDelay: `${i * 0.37}s` }} x1={x} y1={y} x2={x - 4} y2={y + 11} stroke="#4b8df8" strokeWidth={4.5} strokeLinecap="round" />
    ));
  const flakes = (y: number) =>
    [44, 60, 76, 90].map((x, i) => (
      <circle key={x} className="wx-flake" style={{ animationDelay: `${i * 0.9}s` }} cx={x} cy={y} r={3.6} fill="#ffffff" stroke="#b9d3ff" strokeWidth={1.2} />
    ));

  const body: Record<WeatherKind, React.ReactNode> = {
    zon: <Sun cx={60} cy={58} r={26} ids={ids} />,
    half: (
      <>
        <Sun cx={48} cy={44} r={21} ids={ids} />
        <Cloud x={30} y={52} scale={0.95} fill={front} className="wx-drift" />
      </>
    ),
    bewolkt: (
      <>
        <Cloud x={6} y={30} scale={0.78} fill={back} className="wx-drift-slow" />
        <Cloud x={30} y={48} scale={1} fill={front} className="wx-drift" />
      </>
    ),
    mist: (
      <>
        <Cloud x={20} y={30} scale={0.95} fill={front} className="wx-drift" />
        <g stroke="#dbe4f6" strokeWidth={5} strokeLinecap="round">
          <line className="wx-mist" x1="22" y1="88" x2="86" y2="88" />
          <line className="wx-mist-slow" x1="34" y1="99" x2="98" y2="99" />
        </g>
      </>
    ),
    regen: (
      <>
        <Cloud x={6} y={24} scale={0.78} fill={back} className="wx-drift-slow" />
        <Cloud x={26} y={36} scale={1} fill={front} className="wx-drift" />
        {drops(86)}
      </>
    ),
    buien: (
      <>
        <Sun cx={46} cy={40} r={19} ids={ids} />
        <Cloud x={28} y={44} scale={0.95} fill={front} className="wx-drift" />
        {drops(90)}
      </>
    ),
    onweer: (
      <>
        <Cloud x={6} y={24} scale={0.78} fill={dark} className="wx-drift-slow" />
        <Cloud x={26} y={36} scale={1} fill={back} className="wx-drift" />
        <path className="wx-bolt" d="M66 80 54 100h12l-7 17 19-24H66l7-13z" fill="#ffc531" stroke="#ff9e1f" strokeWidth={1.5} strokeLinejoin="round" />
      </>
    ),
    sneeuw: (
      <>
        <Cloud x={26} y={36} scale={1} fill={front} className="wx-drift" />
        {flakes(88)}
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      className={cn("overflow-visible drop-shadow-[0_8px_14px_rgba(20,40,110,0.22)] [[data-aod]_&]:opacity-85 [[data-aod]_&]:brightness-90", className)}
    >
      <defs>
        <radialGradient id={ids.core} cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff6c4" />
          <stop offset="0.45" stopColor="#ffcf36" />
          <stop offset="1" stopColor="#ff9f1c" />
        </radialGradient>
        <radialGradient id={ids.glow}>
          <stop offset="0.35" stopColor="#ffe58a" stopOpacity={0.75} />
          <stop offset="1" stopColor="#ffe58a" stopOpacity={0} />
        </radialGradient>
        {/* Wolkverloop in lokale coördinaten: één verloop over de hele wolk (geen naden tussen de bollen). */}
        <linearGradient id={ids.cloud} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="46">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe4f6" />
        </linearGradient>
        <linearGradient id={ids.cloudBack} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="46">
          <stop offset="0" stopColor="#eef2fb" />
          <stop offset="1" stopColor="#bfcbe4" />
        </linearGradient>
        <linearGradient id={ids.cloudDark} gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="46">
          <stop offset="0" stopColor="#c9d1e4" />
          <stop offset="1" stopColor="#8e9bbb" />
        </linearGradient>
      </defs>
      {body[kind]}
    </svg>
  );
}
