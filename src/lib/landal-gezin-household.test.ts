import { describe, expect, it } from "vitest";
import {
  isLandalGezinHouseholdEmail,
  isLandalGezinHouseholdMember,
  isLandalGezinList,
  landalGezinHouseholdMembershipTransactions,
  LANDAL_GEZIN_HOUSEHOLD_EMAILS,
  LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS,
} from "@/lib/landal-gezin-household";

describe("isLandalGezinList", () => {
  it("herkent Landal-gezin op trip-label", () => {
    expect(
      isLandalGezinList({
        customIconUrl: "/images/ui/landal_160.webp",
        landalTripLabel: "Gezin",
      }),
    ).toBe(true);
  });

  it("negeert Landal-vrienden", () => {
    expect(
      isLandalGezinList({
        customIconUrl: "/images/ui/landal_160.webp",
        landalTripLabel: "Vrienden",
      }),
    ).toBe(false);
  });
});

describe("landalGezinHouseholdMembershipTransactions", () => {
  const [kristofId, chloeId] = LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS;

  it("voegt het andere gezin-lid toe", () => {
    const txs = landalGezinHouseholdMembershipTransactions(
      "list-1",
      kristofId,
      [],
    );
    expect(txs).toHaveLength(1);
  });

  it("maakt geen dubbele membership", () => {
    const txs = landalGezinHouseholdMembershipTransactions("list-1", kristofId, [
      { instantUserId: chloeId },
    ]);
    expect(txs).toHaveLength(0);
  });

  it("doet niets voor gebruikers buiten het gezin", () => {
    expect(
      landalGezinHouseholdMembershipTransactions("list-1", "other-user", []),
    ).toEqual([]);
    expect(isLandalGezinHouseholdMember("other-user")).toBe(false);
  });
});

describe("isLandalGezinHouseholdEmail", () => {
  it("herkent de twee vaste accounts hoofdletterongevoelig", () => {
    expect(LANDAL_GEZIN_HOUSEHOLD_EMAILS).toEqual([
      "lesaffrekristof@gmail.com",
      "claes_cc@live.be",
    ]);
    expect(isLandalGezinHouseholdEmail("lesaffrekristof@gmaiL.com")).toBe(true);
    expect(isLandalGezinHouseholdEmail(" CLAES_CC@LIVE.BE ")).toBe(true);
  });

  it("weigert andere accounts", () => {
    expect(isLandalGezinHouseholdEmail("vriend@example.com")).toBe(false);
  });
});
