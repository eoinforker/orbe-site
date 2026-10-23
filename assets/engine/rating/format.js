import { groupThousands } from "./stats.js";
/*
  Display values in the kind's own units. `raw` is the bare number for use
  inside a sentence; `value` carries its suffix and stands alone on a card.
*/
export const pct = (x, decimals) => `${(x * 100).toFixed(decimals ?? (x < 0.1 ? 1 : 0))}%`;
/** A signed change from a ratio: 1.12 reads "+12%", 0.8 reads "-20%". */
export const change = (ratio) => {
    const n = Math.round((ratio - 1) * 100);
    return `${n >= 0 ? "+" : "−"}${Math.abs(n)}%`;
};
export function formatDisplay(d, x) {
    switch (d.as) {
        case "percent": {
            const raw = pct(x, d.decimals);
            return { raw, value: raw + (d.suffix ?? "") };
        }
        case "change": {
            const raw = change(x);
            return { raw, value: raw };
        }
        case "perMonth": {
            const raw = x.toFixed(1);
            return { raw, value: `${raw} a month` };
        }
        case "perThousand": {
            const k = x * 1000;
            const raw = groupThousands(k, k < 1 ? 2 : k < 10 ? 1 : 0);
            return { raw, value: raw + d.suffix };
        }
        case "multiple": {
            const raw = x.toFixed(1);
            return { raw, value: `${raw}x${d.suffix ?? ""}` };
        }
    }
}
/** A metric's value in sentences. Money metrics arrive in minor units. */
export function formatMetric(unit, x) {
    switch (unit) {
        case "count":
            return groupThousands(Math.round(x));
        case "hours":
            return groupThousands(x, x < 10 ? 1 : 0);
        case "ratio":
            return pct(x);
        case "minor_units":
            return groupThousands(x / 100, 2);
    }
}
/** The signed rating as it is shown: "+1.24", "-0.50", "0.00". */
export const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}`;
