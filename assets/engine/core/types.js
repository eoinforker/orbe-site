/*
  The shared language of the Orbe product. Every module reads and writes these
  shapes, so a change here is a change to the contract between modules.
  Money is integer minor units (pence) with an ISO currency. Dates are ISO 8601 strings.
*/
/** The label each method carries wherever its figures appear. */
export const PROVENANCE_METHODS = {
    estimated: "Estimated from public signals",
    measured: "Measured by Orbe",
    reported: "Read from your host",
};
/** Every consent scope, in the order a creator meets them. */
export const SCOPES = ["rate_public", "connect", "verified_profile", "benchmarks", "listing", "share_with_buyer"];
