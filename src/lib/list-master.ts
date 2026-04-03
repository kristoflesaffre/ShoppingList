/**
 * Master-template vs gewoon lijstje: niet afleiden uit alleen het icoon (/logos/),
 * want weeklijsten van een master gebruiken hetzelfde winkel-logo.
 */

export type ListMasterTemplateFields = {
  isMasterTemplate?: boolean | null;
  icon?: string | null;
  name?: string | null;
};

/** Standaard weeklijstnaam: "Maart week 4" of legacy "Lijstje maart week 4" — geen master-template. */
const DEFAULT_WEEK_LIST_NAME =
  /^(?:Lijstje\s+)?(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+week\s+\d+$/i;

/** True = template (masterlijst-sectie, bare items op detail); false = gewoon lijstje met checkboxes. */
export function listIsMasterTemplate(
  list: ListMasterTemplateFields | null | undefined,
): boolean {
  if (!list) return false;
  if (list.isMasterTemplate === true) return true;
  if (list.isMasterTemplate === false) return false;
  const icon = list.icon;
  const hasStoreIcon = typeof icon === "string" && icon.startsWith("/logos/");
  if (!hasStoreIcon) return false;
  const name = typeof list.name === "string" ? list.name.trim() : "";
  if (name.length > 0 && DEFAULT_WEEK_LIST_NAME.test(name)) return false;
  return true;
}
