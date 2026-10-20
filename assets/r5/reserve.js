/*
  Reserving a handle. When the Orbe API is deployed, set ENDPOINT and the form
  posts to it. Until then, set FORM_ENDPOINT to a form service that accepts JSON
  (for example a Formspree form URL, https://formspree.io/f/<id>) and every
  reservation lands in that inbox. With neither set, the visitor's own email app
  opens with the request written out, so nothing is ever silently dropped.
*/
export const ENDPOINT = "";
export const FORM_ENDPOINT = "";
export const MAILBOX = "hello@orbe.vc";

export const cleanHandle = (s) => s.trim().replace(/^https?:\/\/\S+?\/(@)?/i, "").replace(/^@/, "").replace(/[^\w.-]/g, "").slice(0, 40);

export async function reserve({ handle, kind = "channel", email = "" }) {
  const h = cleanHandle(handle);
  if (!h) return { ok: false, reason: "empty" };
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h, kind, email }) });
      if (res.ok) return { ok: true, handle: h, via: "api" };
      if (res.status === 409) return { ok: false, handle: h, reason: "taken" };
    } catch {}
  }
  if (FORM_ENDPOINT) {
    try {
      const res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ handle: `@${h}`, kind, email, _subject: `Reserve @${h}` }) });
      if (res.ok) return { ok: true, handle: h, via: "form" };
    } catch {}
  }
  const body = `Please reserve orbe.vc/@${h} for my ${kind}.\n\nHandle: @${h}\nKind of work: ${kind}\n${email ? `Email: ${email}\n` : ""}`;
  location.href = `mailto:${MAILBOX}?subject=${encodeURIComponent(`Reserve @${h}`)}&body=${encodeURIComponent(body)}`;
  return { ok: true, handle: h, via: "email" };
}
