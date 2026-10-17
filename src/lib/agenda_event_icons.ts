/**
 * Soorten afspraken met een vaste emoji vooraan (naast de verjaardagen in `agenda_birthdays`):
 * we herkennen ze aan Nederlandse en Engelse woorden in de titel, halen bestaande emoji's weg en
 * zetten de eigen emoji ervoor. Specifiekere soorten staan eerst (bv. «Smartschool Soepdag» → soep).
 */

// Via `new RegExp`: de `u`-vlag mag niet als letterlijke regex bij het huidige TypeScript-target.
const EMOJI = new RegExp(String.raw`[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]`, "gu");
const rx = (source: string) => new RegExp(source, "iu");

export type AgendaEventKind =
  | "death"
  | "medication"
  | "wedding"
  | "mothersDay"
  | "fathersDay"
  | "easter"
  | "vacation"
  | "hotel"
  | "sick"
  | "soup"
  | "fruit"
  | "school";

const RULES: { kind: AgendaEventKind; emoji: string; match: RegExp }[] = [
  // Herdenking van een overlijden: nooit als verjaardag behandelen.
  { kind: "death", emoji: "✝️", match: rx(String.raw`gestorven|overleden|overlijden|sterfdag|herdenking|uitvaart|begrafenis|\bfuneral\b|\bpassed away\b|\bmemorial\b|\bdeath\b`) },
  { kind: "medication", emoji: "💊", match: rx(String.raw`\bstop\s+progesteron(?:e)?\b`) },
  { kind: "wedding", emoji: "💍", match: rx(String.raw`\btrouw|huwelijk|bruiloft|\bwedding\b|\bgetrouwd\b`) },
  { kind: "mothersDay", emoji: "💐", match: rx(String.raw`moederdag|mother['’]?s\s*day`) },
  { kind: "fathersDay", emoji: "🍷", match: rx(String.raw`vaderdag|father['’]?s\s*day`) },
  // Vakantie vóór Pasen: «paasvakantie» is een vakantie.
  { kind: "vacation", emoji: "🏖️", match: rx(String.raw`vakantie|\bverlof\b|\bholiday|\bvacation\b`) },
  { kind: "easter", emoji: "🥚", match: rx(String.raw`\bpasen\b|paas(?:zondag|maandag|eieren|brunch|ontbijt)|\beaster\b`) },
  { kind: "hotel", emoji: "🏨", match: rx(String.raw`\bhotel`) },
  // «ziek» maar niet «ziekenhuis».
  { kind: "sick", emoji: "🤒", match: rx(String.raw`\bziek(?!enhuis)|\bziekte\b|\bgriep\b|\bkoorts\b|\bsick\b|\bflu\b`) },
  { kind: "soup", emoji: "🍲", match: rx(String.raw`soep|\bsoup\b`) },
  { kind: "fruit", emoji: "🍎", match: rx(String.raw`fruit(?:schil)?dag|\bfruit\s*day\b`) },
  { kind: "school", emoji: "🎒", match: rx(String.raw`school|studiedag|oudercontact|\bklas(?:se)?\b`) },
];

/** Soort + titel met emoji vooraan, of `null` als de afspraak in geen enkele soort past. */
export function agendaEventIcon(title: string): { kind: AgendaEventKind; title: string } | null {
  const rule = RULES.find((r) => r.match.test(title));
  if (!rule) return null;
  const bare = title.replace(EMOJI, " ").replace(/\s+/g, " ").trim();
  return { kind: rule.kind, title: `${rule.emoji} ${bare}` };
}

/** Herdenking van een overlijden (dan nooit «verjaardag», ook als dat woord in de titel staat). */
export function isDeathRemembrance(title: string): boolean {
  return RULES[0].match.test(title);
}
