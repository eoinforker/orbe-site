/*
  The podcast:txt ownership code (ownership.ts, proof 1), on its own so the
  browser engine can show the exact tag. The code is an HMAC of the creator
  and the feed under Orbe's secret: stable, needing no storage, and
  unguessable for someone else's feed without the secret. Pure (core/hash.ts),
  so Node and the browser produce the same code from the same inputs.
*/
import { hmacSha256, utf8 } from "../core/hash.js";
import { normaliseFeedUrl } from "../ingest/browser.js";
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const base32 = (bytes) => {
    let out = "";
    for (const b of bytes)
        out += ALPHABET[b % ALPHABET.length];
    return out;
};
/** The creator's verification code for one feed: stable, unguessable without Orbe's secret. */
export function txtCode(secret, creatorId, feedUrl) {
    if (secret.length < 16)
        throw new RangeError("The ownership secret must be at least 16 characters");
    const mac = hmacSha256(utf8(secret), `podcast_txt\u001f${creatorId}\u001f${normaliseFeedUrl(feedUrl)}`);
    return base32(mac.subarray(0, 16));
}
/** The exact tag to paste into the feed. */
export const txtTag = (code) => `<podcast:txt purpose="verify">orbe-verify=${code}</podcast:txt>`;
