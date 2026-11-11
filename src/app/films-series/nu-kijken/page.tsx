"use client";

import { useRouter } from "next/navigation";
import { XrayPage } from "@/components/films/xray";

/** X-Ray tijdens het afspelen: A2 vanaf tablet, ladder op gsm (canvas «X-Ray · A2», «X-Ray · gsm · variant 4»). */
export default function NowWatching() {
  const router = useRouter();
  return <XrayPage onBack={() => (window.history.length > 1 ? router.back() : router.push("/films-series"))} />;
}
