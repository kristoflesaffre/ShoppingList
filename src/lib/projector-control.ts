export type ProjectorTestAction = "on" | "off" | "status";
export type ProjectorTestResult = { configured?: boolean; accepted?: boolean; isOn?: boolean | null; error?: string; detail?: string };
export function projectorTestMessage(action: ProjectorTestAction, result: ProjectorTestResult) {
  if (!result.accepted) {
    const messages: Record<string, string> = {
      "mac-required": "Open deze bediening op de lokale app op je Mac.",
      "not-signed-in": "Meld je opnieuw aan om de projector te testen.",
      "not-configured": "Voor dit account is nog geen projector gekoppeld.",
      "unreachable": "Projector niet bereikbaar. Zet hem voor deze test met de afstandsbediening aan en controleer het thuisnetwerk.",
      "pairing-required": "De projector weigert de verbinding. Koppel de projector opnieuw.",
      "identity-changed": "Het opgeslagen adres hoort bij een ander apparaat. Zoek en koppel Woonkamer TV opnieuw.",
      "bridge-offline": "De Raspberry Pi is niet bereikbaar. Controleer de voeding en internetverbinding. Er is geen opdracht klaargezet.",
      "relay-busy": "Er loopt al een projectoropdracht. Wacht tot die is afgerond.",
      "relay-expired": "De opdracht is verlopen zonder uitgevoerd te worden. Controleer de Raspberry Pi.",
      "relay-uncertain": "De uitvoering is niet bevestigd. Controleer het beeld voordat je opnieuw probeert.",
      "relay-failed": "Home Assistant kon de projectoropdracht niet uitvoeren. Controleer het apparaat.",
      "relay-unavailable": "De projectorkoppeling is tijdelijk niet beschikbaar. Er is geen bevestiging ontvangen.",
    };
    return messages[result.error || ""] || "De projector heeft de opdracht niet bevestigd. Het projectiescherm is niet aangestuurd.";
  }
  const state = result.isOn === true ? "Google TV meldt: aan." : result.isOn === false ? "Google TV meldt: stand-by." : "Google TV geeft nog geen aan/uit-status terug.";
  if (action === "status") return `Verbinding gelukt. ${state} Er is geen aan/uit-commando verstuurd.`;
  const sent = action === "on" ? "Aanzetcommando verstuurd." : "Uitschakelcommando verstuurd.";
  return `${sent} ${state} Controleer of het beeld op de projector daadwerkelijk ${action === "on" ? "aangaat" : "uitgaat"}.`;
}
