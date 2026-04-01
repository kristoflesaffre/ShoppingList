export type LoyaltyCardCodeType = "qr" | "barcode";

export type SavedLoyaltyCard = {
  id: string;
  codeType: LoyaltyCardCodeType;
  codeFormat: string;
  rawValue: string;
  cardName: string;
  createdAtIso: string;
};

export type DecodeResult =
  | { ok: true; codeType: LoyaltyCardCodeType; codeFormat: string; rawValue: string }
  | { ok: false; error: string };
