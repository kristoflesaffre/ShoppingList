import { init } from "@instantdb/react";
import schema from "../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";
import { guardTransact } from "@/lib/db-transact-guard";

export const db = init({
  appId: INSTANT_APP_ID,
  schema,
  /** Geen zwevende Instant-inspector (zwart vierkant rechtsonder). Zie https://www.instantdb.com/docs/devtool */
  devtool: false,
});

db.transact = guardTransact(db.transact.bind(db)) as typeof db.transact;
