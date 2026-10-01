/**
 * iOS Safari opent het toetsenbord alleen als `focus()` synchroon binnen de tik gebeurt.
 * Slide-ins met een zoekveld mounten pas na een paar renders (state → effect → portal),
 * waardoor hun `focus()` te laat komt en het toetsenbord dicht blijft.
 *
 * `primeKeyboard()` roep je aan in de klikhandler, vóór je de slide-in opent: het focust
 * meteen een onzichtbaar invoerveld (toetsenbord gaat open). Zodra het echte veld focus
 * krijgt, behoudt iOS het toetsenbord en ruimen we het hulpveld op.
 */
export function primeKeyboard(): void {
  if (typeof document === "undefined") return;

  const proxy = document.createElement("input");
  proxy.type = "text";
  proxy.setAttribute("aria-hidden", "true");
  proxy.tabIndex = -1;
  /* 16px voorkomt de iOS-zoom bij focus; buiten beeld maar niet display:none (dan geen focus). */
  Object.assign(proxy.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    fontSize: "16px",
    border: "0",
    padding: "0",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  document.body.appendChild(proxy);
  proxy.focus({ preventScroll: true });

  const cleanup = () => {
    proxy.removeEventListener("blur", cleanup);
    window.clearTimeout(fallback);
    proxy.remove();
  };
  /* Het echte veld neemt de focus over → blur op het hulpveld. Vangnet als dat nooit gebeurt. */
  proxy.addEventListener("blur", cleanup);
  const fallback = window.setTimeout(cleanup, 1500);
}
