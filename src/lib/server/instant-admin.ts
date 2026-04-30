import { init } from "@instantdb/admin";
import schema from "../../../instant.schema";
import { INSTANT_APP_ID } from "@/lib/instant_app_id";

export type InstantAdminDb = ReturnType<typeof init<typeof schema>>;

export function getInstantAdminDb(): InstantAdminDb | null {
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!adminToken) return null;
  return init({
    appId: INSTANT_APP_ID,
    adminToken,
    schema,
  });
}
