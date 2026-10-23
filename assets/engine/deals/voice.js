import { moneyText } from "./judge.js";
export const VOICE_KINDS = ["accept", "counter", "decline", "reply", "outreach", "chase_funds"];
/** Added to every draft, so whoever reads it knows how it was written. */
export const DRAFTED_LINE = "Drafted with Orbe's assistant.";
/** Goes with a counter or a decline the assistant sends: who sent it, and on whose rules. */
export const sentByLine = (creatorName) => `Sent by ${creatorName}'s assistant on Orbe, within their rules.`;
const GREETING = {
    warm: (b) => `Hello ${b} team,`,
    brief: (b) => `Hi ${b} team,`,
    formal: (b) => `Dear ${b} team,`,
};
const CLOSING = { warm: "Warm wishes,", brief: "Thanks,", formal: "Kind regards," };
const HELD = "The money is held until delivery is verified";
const LINES = {
    accept: {
        warm: () => ({ open: "Thank you for the offer, I am glad to say yes.", close: `I have accepted it on Orbe. ${HELD}, and the brief can follow there.` }),
        brief: () => ({ open: "Thanks for the offer.", close: `Accepted on Orbe. ${HELD}.` }),
        formal: () => ({ open: "Thank you for your offer.", close: `I have accepted it on Orbe. ${HELD}, and I look forward to your brief.` }),
    },
    decline: {
        warm: () => ({ open: "Thank you for thinking of me.", close: "I will pass on this one, but I hope we find something that fits another time." }),
        brief: () => ({ open: "Thanks for the offer.", close: "I will pass on this one." }),
        formal: () => ({ open: "Thank you for your offer.", close: "I must decline on this occasion." }),
    },
    outreach: {
        warm: (c) => ({ open: `I am ${c.creatorName}, and I would like to talk about a sponsored read.`, close: "My results are verified by Orbe, and I can share the record with you. Would you be open to a short call or a brief?" }),
        brief: (c) => ({ open: `I am ${c.creatorName}, and I would like to propose a sponsored read.`, close: "My results are verified by Orbe. Would a short call or a brief suit you?" }),
        formal: (c) => ({ open: `My name is ${c.creatorName}, and I would like to propose a sponsored read.`, close: "My results are verified by Orbe, and I would be glad to share the record. Would you be open to a short call or a brief?" }),
    },
    chase_funds: {
        warm: (c) => ({ open: `A friendly reminder about your booking with ${c.creatorName}.`, close: `Once it is funded on Orbe, the work can begin. ${HELD}.` }),
        brief: (c) => ({ open: `A reminder about your booking with ${c.creatorName}.`, close: `Once it is funded on Orbe, the work can begin. ${HELD}.` }),
        formal: (c) => ({ open: `This is a reminder about your booking with ${c.creatorName}.`, close: `Once it is funded on Orbe, the work can begin. ${HELD}.` }),
    },
};
const COUNTER_OPEN = { warm: "Thank you for the offer.", brief: "Thanks for the offer.", formal: "Thank you for your offer." };
const COUNTER_SENT = {
    warm: "I have sent it through Orbe, where you can accept it in one step.",
    brief: "It is on Orbe for you to accept.",
    formal: "I have sent it through Orbe, where you can accept it.",
};
const REPLY_OPEN = { warm: "Thank you for getting in touch.", brief: "Thanks for getting in touch.", formal: "Thank you for your email." };
const REPLY_ASK = {
    details: {
        warm: "Could you send the format, the dates you have in mind and the usage rights you need? Then I can come back to you properly.",
        brief: "Could you send the format, dates and usage rights you need?",
        formal: "Could you send the format, the dates you have in mind and the usage rights you need? I will then come back to you properly.",
    },
    pounds_on_orbe: {
        warm: `Could you send the offer in pounds, through Orbe? Then it can be booked properly. ${HELD}.`,
        brief: `Could you send it in pounds, through Orbe? ${HELD}.`,
        formal: `Could you send the offer in pounds, through Orbe, so that it can be booked properly? ${HELD}.`,
    },
};
const SUBJECT = {
    accept: (c) => `Re: your offer to ${c.creatorName}`,
    counter: (c) => `Re: your offer to ${c.creatorName}`,
    decline: (c) => `Re: your offer to ${c.creatorName}`,
    reply: (c) => `Re: sponsorship with ${c.creatorName}`,
    outreach: (c) => `A sponsored read with ${c.creatorName}`,
    chase_funds: (c) => `Funding your booking with ${c.creatorName}`,
};
const usableFor = (kind, f) => {
    if (kind === "accept")
        return !f.ref.startsWith("rules.") && !f.ref.startsWith("decision.");
    if (kind === "decline")
        return !f.ref.startsWith("offer.") && !f.ref.startsWith("decision.") && f.ref !== "rules.floor" && f.ref !== "rules.range";
    if (kind === "outreach")
        return !f.ref.startsWith("offer.");
    return true;
};
/** A draft in the creator's tone, from the facts' own sentences. */
export function voiceDraft(kind, tone, facts, ctx) {
    const style = tone.style;
    const usable = facts.filter((f) => usableFor(kind, f));
    const said = usable.map((f) => f.text).join(" ");
    const withSaid = (open) => `${open}${said ? ` ${said}` : ""}`;
    let lines;
    if (kind === "counter") {
        const named = usable.some((f) => f.ref === "decision.price");
        const sent = named ? COUNTER_SENT[style] : ctx.counterPrice ? `I have sent a counter of ${moneyText(ctx.counterPrice)} through Orbe.` : "I have sent a counter through Orbe.";
        lines = { open: COUNTER_OPEN[style], close: sent };
    }
    else if (kind === "reply")
        lines = { open: REPLY_OPEN[style], close: REPLY_ASK[ctx.ask ?? "details"][style] };
    else
        lines = LINES[kind][style](ctx);
    const signature = kind === "chase_funds" ? `${ctx.creatorName}'s assistant on Orbe` : tone.signOff || ctx.creatorName;
    const body = [GREETING[style](ctx.brandName), withSaid(lines.open), lines.close, `${CLOSING[style]}\n${signature}`, DRAFTED_LINE].join("\n\n");
    return { subject: SUBJECT[kind](ctx), body, factIds: usable.map((f) => f.id) };
}
