"use client";

import * as React from "react";
import { db } from "@/lib/db";

/**
 * Nieuwe favorietenlijsten zijn een «concept» tot er een eerste favoriet in staat.
 * Lege concepten worden overal verborgen en bij de volgende pagina opgeruimd,
 * zodat terugkeren zonder iets toe te voegen geen lege lijst achterlaat.
 * (Per apparaat in localStorage; geen schemawijziging nodig.)
 */
const KEY = "draft-master-list-ids";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* negeren */
  }
}

export function markDraftMasterList(id: string) {
  write([...read().filter((x) => x !== id), id]);
  // Meteen als «open» markeren: een ander tabblad kan de nieuwe lijst al zien vóór de lijstpagina laadt.
  try {
    window.localStorage.setItem(OPEN_PREFIX + id, String(Date.now()));
  } catch {
    /* negeren */
  }
}

type ListLike = { id: string; items?: unknown[] | null };

const OPEN_PREFIX = "draft-master-list-open:";
/** Een concept dat ergens open staat (ook in een ander tabblad) niet opruimen. */
const OPEN_FRESH_MS = 15_000;

function isOpenSomewhere(id: string): boolean {
  try {
    const t = Number(window.localStorage.getItem(OPEN_PREFIX + id));
    return Number.isFinite(t) && Date.now() - t < OPEN_FRESH_MS;
  } catch {
    return false;
  }
}

/** Op de lijstpagina: meld dat dit concept open staat (hartslag), en stop daarmee bij het verlaten. */
export function useDraftMasterListOpen(listId: string | undefined) {
  React.useEffect(() => {
    if (!listId || !read().includes(listId)) return;
    const key = OPEN_PREFIX + listId;
    const beat = () => {
      try {
        window.localStorage.setItem(key, String(Date.now()));
      } catch {
        /* negeren */
      }
    };
    beat();
    const timer = window.setInterval(beat, 5_000);
    return () => {
      window.clearInterval(timer);
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* negeren */
      }
    };
  }, [listId]);
}

/** Lege concept-favorietenlijst? (verbergen in overzichten) */
export function isEmptyDraftMasterList(list: ListLike): boolean {
  if (typeof window === "undefined") return false;
  return read().includes(list.id) && (list.items?.length ?? 0) === 0;
}

/**
 * Ruimt concepten op zodra de lijsten geladen zijn: leeg → verwijderen, met items → gewone lijst.
 * `skipId`: de lijst die nu open staat (niet verwijderen terwijl je ze vult).
 */
export function useCleanupDraftMasterLists(lists: ListLike[] | undefined, skipId?: string) {
  React.useEffect(() => {
    if (!lists) return;
    const drafts = read();
    if (drafts.length === 0) return;
    const keep: string[] = [];
    const deletes = [];
    for (const id of drafts) {
      if (id === skipId || isOpenSomewhere(id)) {
        keep.push(id);
        continue;
      }
      const list = lists.find((l) => l.id === id);
      if (!list) continue; // bestaat niet meer
      if ((list.items?.length ?? 0) === 0) deletes.push(db.tx.lists[id].delete());
      // met items: wordt een gewone lijst (niet meer bijhouden)
    }
    write(keep);
    if (deletes.length > 0) void db.transact(deletes);
  }, [lists, skipId]);
}
