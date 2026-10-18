/*
  The connector contract. A connector reads one source and hands back core
  shapes (AccountSnapshot, Work, RevenueLine) with provenance, plus the few
  things core has no shape for yet (daily series, per-work metrics over a
  range, single facts). Those are requested in CORE-REQUESTS.md.
*/
export {};
