/*
  A virtualised table: only the rows on screen (and a few either side) are in
  the page, recycled as you scroll, so a list of thousands scrolls as smoothly
  as a list of ten. Rows the list has not fetched yet show as quiet bars, and
  the table asks for them (onNeed) as they come near.

    const t = virtualTable({ label, columns, rowHeight, total, rowAt, href, ... });
    el.append(t.el);  t.update(total);  t.refresh();

  columns: { key, label, width (a grid track), align, sort (true or a sort key),
  cell(row) -> Node | string, title?, fill?(cellEl, row) }. fill, where given, is
  used instead of cell and updates the cell's own nodes in place. Rows open their work page by a real link,
  so the console's router, the middle click and "open in a new tab" all work.
  onNear(last) hears the last row drawn, so the caller can fetch ahead of the
  reader rather than behind.

  Keys, with the table focused: j or the down arrow and k or the up arrow move,
  Enter opens, x or the space bar selects (with shift, every row since the last one picked), Home and End jump. A shift-click picks rows too. Selection is a set
  of row ids owned by the caller.
*/
import { h } from "./ui.js";

const OVERSCAN = 6;
/** Rows of the drawn window that must stay beyond the screen's edge before it moves. */
const MARGIN = 3;
/** Match console.css: .cn-vt-tr column-gap and side padding. */
const GAP = 10;
const PAD = 12;

export function virtualTable(o) {
  const { label, columns, rowHeight, href, selection, sort } = o;
  // A wider overscan (o.overscan) trades a few more rows in the page for fewer, larger redraws.
  const overscan = Math.max(OVERSCAN, o.overscan ?? OVERSCAN);
  let total = o.total;
  let active = -1;
  const template = columns.map((c) => c.width).join(" ");
  // The narrowest the columns can go (fixed widths and each minmax's floor), plus the gaps and padding:
  // below it the table scrolls sideways as one, head and rows together, rather than clipping.
  const floor = columns.reduce((n, c) => n + (Number(/^(?:minmax\()?(\d+)px/.exec(c.width)?.[1]) || 0), 0) + (columns.length - 1) * GAP + 2 * PAD;

  const head = h("div", { class: "cn-vt-head", role: "row" },
    columns.map((c) => {
      const key = c.sort === true ? c.key : c.sort;
      if (c.headCell) return h("div", { class: "cn-vt-th", role: "columnheader", "data-align": c.align ?? null }, c.headCell());
      if (!key) return h("div", { class: "cn-vt-th", role: "columnheader", "data-align": c.align ?? null }, c.label);
      const on = sort?.key === key;
      return h("div", { class: "cn-vt-th", role: "columnheader", "aria-sort": on ? (sort.dir === "asc" ? "ascending" : "descending") : "none", "data-align": c.align ?? null },
        h("button", { class: "cn-vt-sort", type: "button", "data-on": String(on), "data-key": key, onclick: () => o.onSort?.(key) }, c.label, h("span", { class: "cn-vt-dir", "aria-hidden": "true" }, on ? (sort.dir === "asc" ? "↑" : "↓") : "")));
    }),
  );
  const spacer = h("div", { class: "cn-vt-spacer" });
  const rowsEl = h("div", { class: "cn-vt-rows", role: "rowgroup" });
  const body = h("div", { class: "cn-vt-body", tabindex: "0", role: "rowgroup", "aria-label": `${label}, use j and k to move, Enter to open, x to select` }, spacer, rowsEl);
  const foot = o.totals ? h("div", { class: "cn-vt-foot", role: "row" }) : null;
  const el = h("div", { class: "cn-vt", role: "grid", "aria-label": label, "aria-rowcount": String(total) }, head, body, foot);
  // Set through the style object, not a style attribute, which the console's CSP refuses.
  el.style.setProperty("--cols", template);
  el.style.setProperty("--row", `${rowHeight}px`);
  el.style.setProperty("--floor", `${floor}px`);

  /** Each pooled row keeps which index it shows, so a frame only redraws rows that changed. */
  const pool = [];
  function rowEl() {
    const cells = columns.map((c) => h("div", { class: "cn-vt-td", role: "gridcell", "data-align": c.align ?? null, "data-col": c.key }));
    const link = h("a", { class: "cn-vt-link", tabindex: "-1" });
    const r = h("div", { class: "cn-vt-tr", role: "row" }, link, cells);
    r._cells = cells;
    r._link = link;
    r._index = -1;
    r._id = null;
    // A shift-click picks a run of rows instead of opening one, and selects no text on the way.
    r.addEventListener("mousedown", (e) => e.shiftKey && o.onToggle && e.preventDefault());
    r.addEventListener("click", (e) => {
      if (e.target.closest("button, input, a:not(.cn-vt-link), label")) return;
      if (e.shiftKey && o.onToggle) {
        e.preventDefault();
        const row = r._id ? o.rowAt(r._index) : null;
        if (row) o.onToggle(row, e);
        return;
      }
      if (r._id && e.target !== link) link.click();
    });
    return r;
  }

  function mark(r, key, on) {
    const v = on ? "true" : "false";
    if (r.dataset[key] !== v) r.dataset[key] = v;
  }

  function paint(r, i) {
    const row = o.rowAt(i);
    const id = row ? row.id : null;
    // Writes only what changed: an unchanged attribute written again still costs a style pass.
    if (r._y !== i) {
      r._y = i;
      r.style.transform = `translateY(${i * rowHeight}px)`;
      r.setAttribute("aria-rowindex", String(i + 2));
    }
    mark(r, "active", i === active);
    mark(r, "selected", Boolean(id && selection?.has(id)));
    if (r._index === i && r._id === id && !r._dirty) return;
    r._index = i;
    r._id = id;
    r._dirty = false;
    if (!row) {
      r._link.removeAttribute("href");
      mark(r, "skel", true);
      r._cells.forEach((c, n) => {
        c._skel = true;
        c.replaceChildren(n === 0 ? "" : h("span", { class: "cn-vt-skel" }));
      });
      o.onNeed?.(i);
      return;
    }
    mark(r, "skel", false);
    r._link.href = href(row);
    r._link.setAttribute("aria-label", `Open ${row.title}`);
    columns.forEach((c, n) => {
      const cell = r._cells[n];
      // A column with fill(cell, row) updates the nodes it made last time in place: no new nodes, so a
      // recycled row costs a text change, not a fresh style pass. cell(row) builds the content anew.
      if (c.fill && !cell._skel) c.fill(cell, row);
      else {
        cell._skel = false;
        if (c.fill) {
          cell.replaceChildren();
          c.fill(cell, row);
        } else cell.replaceChildren(c.cell(row) ?? "");
      }
      if (c.title) cell.title = c.title(row) ?? "";
    });
  }

  let frame = 0;
  // The range drawn last and whether anything changed since: a scroll that stays inside the same rows
  // (most frames of a slow scroll) costs nothing but the compositor's own move.
  let drawnFirst = 0;
  let drawnLast = 0;
  let stale = true;
  function draw() {
    frame = 0;
    const top = body.scrollTop;
    const height = body.clientHeight || 600;
    const seeFirst = Math.floor(top / rowHeight);
    const seeLast = Math.ceil((top + height) / rowHeight);
    // The rows drawn stay put while the reader is still well inside them (a margin of rows either
    // side), then the window jumps ahead by a whole overscan at once: a fast scroll then costs one
    // larger frame now and again, with plain compositor frames between, rather than a row every frame.
    if (!stale && drawnFirst <= Math.max(0, seeFirst - MARGIN) && drawnLast >= Math.min(total, seeLast + MARGIN)) return;
    const first = Math.max(0, seeFirst - overscan);
    const last = Math.min(total, seeLast + overscan);
    drawnFirst = first;
    drawnLast = last;
    stale = false;
    const need = Math.max(0, last - first);
    while (pool.length < need) {
      const r = rowEl();
      pool.push(r);
      rowsEl.append(r);
    }
    // Rows already showing an index in range keep it; the rest take the gaps.
    const want = new Set();
    for (let i = first; i < last; i++) want.add(i);
    const free = [];
    for (const r of pool) {
      if (want.has(r._index)) want.delete(r._index);
      else free.push(r);
    }
    const gaps = [...want];
    for (let n = 0; n < free.length; n++) {
      const r = free[n];
      if (n < gaps.length) {
        if (r._off) { r._off = false; r.dataset.off = "false"; }
        paint(r, gaps[n]);
      } else {
        // A data attribute, not the hidden attribute: the shell's stylesheets carry :has(... [hidden])
        // selectors, and a hidden attribute flipped inside the shell re-styles the whole page.
        if (!r._off) { r._off = true; r.dataset.off = "true"; }
        r._index = -1;
      }
    }
    for (const r of pool) if (!r._off && r._index >= first && r._index < last) paint(r, r._index);
    o.onNear?.(last);
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  /** A change the range alone cannot show (data arrived, a selection, the size): draw every row in range again. */
  const invalidate = () => {
    stale = true;
    schedule();
  };
  body.addEventListener("scroll", schedule, { passive: true });
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(invalidate) : null;
  ro?.observe(body);

  function setActive(i, scroll = true) {
    if (!total) return;
    active = Math.max(0, Math.min(total - 1, i));
    if (scroll) {
      const y = active * rowHeight;
      if (y < body.scrollTop) body.scrollTop = y;
      else if (y + rowHeight > body.scrollTop + body.clientHeight) body.scrollTop = y + rowHeight - body.clientHeight;
    }
    for (const r of pool) mark(r, "active", r._index === active);
    invalidate();
  }
  body.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === "j" || k === "ArrowDown") setActive(active + 1);
    else if (k === "k" || k === "ArrowUp") setActive(active - 1);
    else if (k === "Home") setActive(0);
    else if (k === "End") setActive(total - 1);
    else if (k === "PageDown") setActive(active + Math.floor(body.clientHeight / rowHeight));
    else if (k === "PageUp") setActive(active - Math.floor(body.clientHeight / rowHeight));
    else if (k === "Enter" && active >= 0) {
      const row = o.rowAt(active);
      if (row) pool.find((r) => r._index === active)?._link.click();
    } else if ((k === "x" || k === "X" || k === " ") && active >= 0) {
      const row = o.rowAt(active);
      if (row) o.onToggle?.(row, e);
    } else return;
    e.preventDefault();
  });
  body.addEventListener("focus", () => {
    if (active < 0 && total) setActive(Math.floor(body.scrollTop / rowHeight), false);
  });

  function update(n) {
    total = n;
    el.setAttribute("aria-rowcount", String(n + 1));
    spacer.style.height = `${n * rowHeight}px`;
    if (active >= n) active = n - 1;
    invalidate();
  }
  update(total);

  return {
    el,
    body,
    update,
    /** Draws again, painting only rows whose data arrived or moved (after a page loads). */
    redraw: invalidate,
    /** Redraws every row on screen, for a change the rows' ids cannot show (a star, a selection). */
    refresh() {
      for (const r of pool) r._dirty = true;
      invalidate();
    },
    setTotals(nodes) {
      if (foot) foot.replaceChildren(...nodes);
    },
    scrollTop() {
      body.scrollTop = 0;
      active = -1;
    },
    destroy() {
      ro?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    },
  };
}
