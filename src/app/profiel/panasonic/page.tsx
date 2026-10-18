"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { PageBackButton } from "@/components/ui/page_back_button";
import { PanasonicControls } from "@/components/panasonic_controls";
export default function PanasonicPage() {
  const { user, isLoading } = db.useAuth();
  const router = useRouter();
  React.useEffect(() => { if (!isLoading && !user) router.replace("/auth"); }, [isLoading, user, router]);
  if (!user) return null;
  return <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-28"><PageBackButton href="/profiel" /><header><h1 className="text-3xl font-bold">Klimaat</h1><p className="mt-2">Bedien je Panasonic-airco’s per kamer.</p></header><PanasonicControls /></main>;
}
