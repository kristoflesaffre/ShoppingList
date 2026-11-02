/**
 * Veel schermen starten een transactie zonder op het antwoord te wachten (optimistisch: Instant rolt ze zelf terug als
 * ze mislukt). Een time-out of fout gaf dan een «Unhandled Runtime Error» over het hele scherm. Deze wrapper logt de fout
 * en geeft dezelfde promise terug, dus wie wél wacht (`await`, `.catch`) krijgt de fout nog gewoon.
 */
export function guardTransact<A extends unknown[], R>(transact: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return (...args) => {
    const result = transact(...args);
    result.catch((error: unknown) => console.warn("[db] Transactie mislukt:", error));
    return result;
  };
}
