/*
  Metrics, for Orbe staff only: what an investor asks, counted from Orbe's
  own records (GET /v1/admin/metrics). A figure with nothing behind it says
  so instead of showing a zero. Aggregates only: no creator or brand is
  named here. The week in plain words (GET /v1/admin/metrics/update) is one
  tap to copy into an investor update.
*/
import { api } from "./api.js";
import { bars, emptyState, section, segmented, skeleton, sparkline, stat, statStrip } from "./console-ui.js";
import { icon } from "./icons.js";
import { block, count, h, toast } from "./ui.js";

const WINDOWS = [["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "A year"]];
const SOURCE = { front_door: "The site", referral: "Referral", invitation: "Team invitation", direct: "Direct" };
const OFFER = { sent: "Sent", countered: "Countered", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn", expired: "Expired" };

const pc = (x) => (x === null || x === undefined ? "None yet" : `${Math.round(x * 100)}%`);
const symbol = (c) => ({ GBP: "£", USD: "$", EUR: "€" })[c] ?? `${c} `;
const minor = (m) => {
  const parts = Object.entries(m ?? {}).filter(([, v]) => v > 0).map(([c, v]) => `${symbol(c)}${(v / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
  return parts.length ? parts.join(" + ") : "£0";
};
const hours = (x) => (x === null ? "None yet" : x < 48 ? `${Math.round(x * 10) / 10} h` : `${Math.round((x / 24) * 10) / 10} days`);
const bytes = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 ** 2)} MB`);
const bar = (p) => {
  const b = h("span", { class: "cn-part-bar" }, h("span"));
  b.firstChild.style.setProperty("--p", String(Math.max(0, Math.min(100, Math.round(p * 1000) / 10))));
  return b;
};
const row = (label, value, note) => h("div", { class: "mt-row" }, h("dt", null, label), h("dd", null, value, note ? h("span", { class: "mt-note" }, note) : null));

function funnel(steps) {
  const top = Math.max(1, steps[0][1]);
  return h("ol", { class: "mt-funnel" }, steps.map(([label, n]) => h("li", null, h("span", { class: "mt-funnel-l" }, label), bar(n / top), h("span", { class: "mt-funnel-n" }, count(n)))));
}

function cohortTable(cohorts) {
  const shown = cohorts.filter((c) => c.size > 0);
  if (!shown.length) return emptyState("people", "No sign-ups in the last eight weeks yet.");
  return h("div", { class: "mt-scroll" },
    h("table", { class: "cn-table mt-cohorts" },
      h("thead", null, h("tr", null, h("th", null, "Signed up"), h("th", null, "People"), [1, 2, 3, 4].map((k) => h("th", null, `Week ${k}`)))),
      h("tbody", null, shown.map((c) =>
        h("tr", null,
          h("th", null, new Date(`${c.week}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })),
          h("td", null, count(c.size)),
          c.weeks.map((x) => {
            const td = h("td", { class: x === null ? "mt-later" : "mt-heat" }, x === null ? "Later" : pc(x));
            if (x !== null) td.style.setProperty("--h", String(Math.round(x * 100) / 100));
            return td;
          }),
        ))),
    ));
}

function view(m) {
  const s = m.signups;
  const newPeople = s.window.creator + s.window.brand + s.window.buyer;
  const signDaily = s.daily.map((d) => d.creator + d.brand + d.buyer);
  const activeDaily = m.active.daily.map((d) => d.people);
  const d = m.deals;

  const headline = statStrip([
    stat({ label: "New accounts", value: count(newPeople), line: `${count(s.window.creator)} creators, ${count(s.window.brand)} brands. ${count(s.total.creator)} creators in all.` }),
    stat({ label: "First rating", value: pc(m.activation.allTime.share), line: m.activation.allTime.medianHours === null ? "No creator rated yet." : `Median ${hours(m.activation.allTime.medianHours)} from sign-up.` }),
    stat({ label: "Came back after an upload", value: pc(m.habit.share), line: m.habit.uploads ? `${count(m.habit.cameBack)} of ${count(m.habit.uploads)} uploads, within 7 days.` : m.habit.trackingSince ? "No rated upload has finished its 7 days yet." : "Counting starts at the first sign-in.", tone: "hi" }),
    stat({ label: "Orbe's fees", value: minor(d.revenueMinor), line: `${minor(d.revenueWindowMinor)} in this window. Settled through Orbe: ${minor(d.settledMinor)}.` }),
  ]);

  const growth = section({ title: "Sign-ups", line: "By day, side and where they came from." },
    signDaily.some((x) => x > 0)
      ? h("div", { class: "mt-two" },
          h("div", null, h("p", { class: "mt-k" }, "A day"), h("div", { class: "mt-chart" }, bars(signDaily, "Sign-ups a day")), h("p", { class: "mt-axis" }, h("span", null, m.window.from), h("span", null, m.window.to))),
          h("dl", { class: "mt-rows" }, Object.entries(s.bySource).map(([k, v]) => row(SOURCE[k] ?? k, count(v))), row("Brands with a profile", count(s.total.brand)), row("Other buyers", count(s.total.buyer))),
        )
      : emptyState("people", "No sign-ups in this window.", [], "They appear here by day, with where each came from."),
  );

  const habit = section({ title: "The habit test", line: "Do creators come back within 7 days of a new upload being rated? This is the number that says whether Orbe is a habit." },
    m.habit.uploads
      ? h("dl", { class: "mt-rows" },
          row("Uploads with a closed 7-day window", count(m.habit.uploads)),
          row("Their creator came back", count(m.habit.cameBack), pc(m.habit.share)),
          row("Creators counted", count(m.habit.creators)),
          row("Still inside their 7 days", count(m.habit.pending)),
          row("Counted since", m.habit.trackingSince ?? "None yet"),
        )
      : emptyState("chart", m.habit.trackingSince ? "No rated upload has finished its 7 days in this window." : "Nothing to count yet.", [], "Counting starts from the first day anyone signs in, and each upload waits 7 days after its rating."),
  );

  const active = section({ title: "Active", line: "People who used the console, from the days they signed in." },
    h("div", { class: "mt-two" },
      h("dl", { class: "mt-rows" },
        row("Creators this week", count(m.active.week.creator)),
        row("Brands this week", count(m.active.week.brand)),
        row("Creators this month", count(m.active.month.creator)),
        row("Brands this month", count(m.active.month.brand)),
      ),
      activeDaily.some((x) => x > 0) ? h("div", null, h("p", { class: "mt-k" }, "People a day"), h("div", { class: "mt-chart" }, sparkline(activeDaily, "People a day") ?? bars(activeDaily, "People a day"))) : emptyState("people", "No one has signed in during this window."),
    ),
  );

  const cohorts = section({ title: "Retention by sign-up week", line: "The share of each week's sign-ups who used the console in each of the four weeks after." }, cohortTable(m.cohorts));

  const deals = section({ title: "Deals", line: "From offer to money settled, all time." },
    d.offers.total || d.booked
      ? h("div", { class: "mt-two" },
          funnel([["Offers", d.offers.total], ["Accepted", d.offers.accepted], ["Booked", d.booked], ["Funded", d.funded], ["Delivered and verified", d.verified], ["Paid out", d.paid]]),
          h("dl", { class: "mt-rows" },
            row("Settled through Orbe", minor(d.settledMinor)),
            row("Orbe's fees, all time", minor(d.revenueMinor)),
            row("Orbe's fees, this window", minor(d.revenueWindowMinor)),
            Object.entries(d.offers.byState).map(([k, v]) => row(`Offers ${(OFFER[k] ?? k).toLowerCase()}`, count(v))),
          ),
        )
      : emptyState("bolt", "No offers yet.", [], "Offers, bookings, verified delivery and the fees Orbe earns appear here."),
  );

  const brands = section({ title: "Brands", line: "The side that pays." },
    h("dl", { class: "mt-rows" },
      row("Brand profiles", count(m.brands.profiles)),
      row("Briefs written", count(m.brands.briefs)),
      row("Self-serve proposals", count(m.brands.proposals)),
      row("Brands with a booking", count(m.brands.booking)),
      row("Brands booking again", count(m.brands.repeat), "across two or more campaigns"),
    ),
  );

  const md = m.media;
  const media = section({ title: "Video this month", line: `Processing used against the allowances of the creators using it, ${md.month}.` },
    md.users
      ? h("dl", { class: "mt-rows" },
          row("Creators using it", count(md.users)),
          row("Minutes used", `${md.minutes.used} of ${count(md.minutes.allowance)}`, pc(md.minutes.share)),
          h("div", { class: "mt-row mt-row--bar" }, bar(md.minutes.share ?? 0)),
          row("Transcribing", `${md.minutes.transcribe} min`),
          row("Rendering", `${md.minutes.render} min`),
          row("At their limit", count(md.minutes.atLimit)),
          row("Storage held", bytes(md.storageBytes)),
          row("Transcription cost, estimated", `$${md.costUsd.transcription.toFixed(2)}`, `at $${md.costUsd.perMinute} a minute, the listed Deepgram price; rendering runs on Orbe's own machine`),
        )
      : emptyState("play", "No video processed this month.", [], "Minutes, storage and an estimate of the transcription cost appear here."),
  );

  const e = m.email;
  const email = section({ title: "Email", line: "Sends in this window, and who asked not to hear again." },
    h("dl", { class: "mt-rows" },
      row("Deal emails sent", count(e.deals.total)),
      row("Bounced", count(e.deals.bounced), e.deals.total ? pc(e.deals.bounceRate) : null),
      row("Marked as spam", count(e.deals.complained), e.deals.total ? pc(e.deals.complaintRate) : null),
      row("Habit emails", count(e.habit)),
      row("Sends to platforms", count(e.mediaSends.sent), e.mediaSends.failed ? `${count(e.mediaSends.failed)} failed` : null),
      row("Unsubscribed, all time", count(e.suppressed.unsubscribed)),
      row("Hard bounces, all time", count(e.suppressed.hard_bounce)),
      row("Spam complaints, all time", count(e.suppressed.complaint)),
    ),
  );

  const errors = section({ title: "Errors", line: "Server errors (5xx) in this window, by route." },
    m.errors.total
      ? h("div", { class: "mt-two" },
          h("div", null, h("p", { class: "mt-k" }, `${count(m.errors.total)} in all`), h("div", { class: "mt-chart mt-chart--warn" }, bars(m.errors.daily.map((x) => x.count), "Errors a day"))),
          h("dl", { class: "mt-rows" }, m.errors.topRoutes.map((r) => row(h("code", null, r.route), count(r.count), String(r.status)))),
        )
      : emptyState("check", "No server errors in this window."),
  );

  return [headline, h("div", { class: "mt-grid" }, growth, habit, active, deals, brands, media, email, errors), cohorts];
}

export async function render(main) {
  let days = "30";
  const body = h("div", { class: "mt" });
  const copy = h("button", { class: "cn-btn cn-btn--s", type: "button" }, icon("doc"), "Copy the week for an update");
  const csv = h("a", { class: "cn-btn cn-btn--s", href: "/v1/admin/metrics?days=30&format=csv", download: "" }, icon("doc"), "Export CSV");
  const bar = h("div", { class: "mt-bar" },
    segmented("Window", WINDOWS, days, (v) => {
      days = v;
      csv.href = `/v1/admin/metrics?days=${v}&format=csv`;
      load();
    }),
    h("div", { class: "mt-actions" }, copy, csv),
  );
  const out = h("div", { class: "mt-body" });
  const note = h("p", { class: "mt-foot" }, "Counted from Orbe's own records. Aggregates only: no creator or brand is named. Staff only.");
  body.append(bar, out, note);
  main.append(body);

  copy.addEventListener("click", async () => {
    copy.disabled = true;
    try {
      const r = await api.get("/v1/admin/metrics/update");
      await navigator.clipboard.writeText(r.update);
      toast("Copied this week in plain words.");
    } catch {
      toast("Could not copy. Open /v1/admin/metrics/update to read it.");
    } finally {
      copy.disabled = false;
    }
  });

  function load() {
    out.replaceChildren(skeleton(6, "mt-skel"));
    return block(out, () => api.get(`/v1/admin/metrics?days=${days}`), (r) => view(r.metrics));
  }
  await load();
}
