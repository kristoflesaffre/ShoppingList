import { MASTER_STORE_OPTIONS } from "@/lib/master-stores";

/** Winkels voor losse klantenkaarten (geen Lidl/Delhaize-combi). */
export const LOYALTY_STANDALONE_STORE_OPTIONS = MASTER_STORE_OPTIONS.filter(
  (s) => s.slug !== "lidl-delhaize",
);
