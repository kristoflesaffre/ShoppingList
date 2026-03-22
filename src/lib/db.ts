import { init } from "@instantdb/react";
import schema from "../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";

export const db = init({
  appId: INSTANT_APP_ID,
  schema,
});
