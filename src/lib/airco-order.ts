/**
 * Volgorde van de airco’s op de startpagina, naar het moment van de dag. ’s Nachts en ’s ochtends eerst de
 * slaapkamers, overdag en ’s avonds eerst de leefruimtes. Weekdagen: slaapkamers tot 8u en weer vanaf 21u30;
 * weekend (za/zo): tot 10u en weer vanaf 23u. Namen worden vergeleken zonder hoofdletters en accenten;
 * andere toestellen volgen in hun gewone volgorde.
 */
const SLEEP = ["slaapkamer", "kamer noe"];
const LIVING = ["leefruimte", "gastenkamer"];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** true = slaapkamers eerst. */
export function bedroomsFirst(now: Date): boolean {
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [morningEnd, eveningStart] = weekend ? [10 * 60, 23 * 60] : [8 * 60, 21 * 60 + 30];
  return minutes < morningEnd || minutes >= eveningStart;
}

export function sortAircos<T extends { name: string }>(devices: T[], now: Date): T[] {
  const order = bedroomsFirst(now) ? [...SLEEP, ...LIVING] : [...LIVING, ...SLEEP];
  const rank = (d: T) => {
    const i = order.indexOf(normalize(d.name));
    return i === -1 ? order.length : i;
  };
  return devices.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i).map(({ d }) => d);
}
