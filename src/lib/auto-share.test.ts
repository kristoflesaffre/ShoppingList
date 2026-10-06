import { describe, expect, it } from "vitest";
import {
  autoShareMembershipTransactions,
  listAutoShareKind,
  parseAutoShareKinds,
  sharePartnerIds,
} from "@/lib/auto-share";
import { defaultCafeListName, defaultFrituurListName } from "@/lib/list-default-name";

describe("listAutoShareKind", () => {
  it("herkent de soorten van de nieuw-lijstje-tegels", () => {
    expect(listAutoShareKind({ name: "April week 9" })).toBe("supermarkt");
    expect(listAutoShareKind({ name: "Zomer", customIconUrl: "/images/ui/vakantie_160.webp" })).toBe("vakantie");
    expect(listAutoShareKind({ name: "Landal", customIconUrl: "/images/ui/gezin_160.webp" })).toBe("landal");
    expect(listAutoShareKind({ name: defaultFrituurListName([]) })).toBe("frituur");
    expect(listAutoShareKind({ name: defaultCafeListName([]) })).toBe("cafe");
  });

  it("deelt favorietenlijsten nooit automatisch", () => {
    expect(listAutoShareKind({ name: "Colruyt", isMasterTemplate: true })).toBeNull();
  });
});

describe("parseAutoShareKinds", () => {
  it("negeert onbekende soorten en kapotte JSON", () => {
    expect(Array.from(parseAutoShareKinds('["supermarkt","onbekend"]'))).toEqual(["supermarkt"]);
    expect(parseAutoShareKinds("{kapot").size).toBe(0);
    expect(parseAutoShareKinds(null).size).toBe(0);
  });
});

describe("sharePartnerIds", () => {
  it("verzamelt unieke meeschrijvers zonder de eigenaar", () => {
    const lists = [
      { memberships: [{ instantUserId: "sofie" }, { instantUserId: "owner" }] },
      { memberships: [{ instantUserId: "sofie" }, { instantUserId: "lien" }] },
      { memberships: null },
    ];
    expect(sharePartnerIds(lists, "owner").sort()).toEqual(["lien", "sofie"]);
  });
});

describe("autoShareMembershipTransactions", () => {
  const on = new Set(["supermarkt"] as const);

  it("voegt deelgenoten toe als de soort aan staat", () => {
    expect(autoShareMembershipTransactions("l1", "supermarkt", on, ["sofie", "lien"])).toHaveLength(2);
  });

  it("doet niets als de soort uit staat of onbekend is", () => {
    expect(autoShareMembershipTransactions("l1", "vakantie", on, ["sofie"])).toEqual([]);
    expect(autoShareMembershipTransactions("l1", null, on, ["sofie"])).toEqual([]);
  });

  it("slaat wie al lid is over", () => {
    expect(autoShareMembershipTransactions("l1", "supermarkt", on, ["sofie", "lien"], ["sofie"])).toHaveLength(1);
  });
});
