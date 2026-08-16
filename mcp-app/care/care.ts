// The ChildcareGPT care card — an MCP App rendered inline in the chat by the
// host (Claude.ai, Claude Desktop, ChatGPT, …) when find_facilities,
// find_facilities_by_district, get_facility, funding_programs or
// express_interest runs. Ported from leuk's booking card (mcp-app/book).
//
// Screens, one card:
//   results  — providers from a search: a small map, one row each with
//              "I'm interested" (→ the form) and ↗ (the site page). Under it,
//              ALWAYS, the funding strip: check eligibility · start the CCAP
//              application · cost snapshot. Help paying rides with every list.
//   facility — one provider, same row + strip.
//   interest — the form: name, email, phone, when, children, note → Send →
//              calls express_interest on the server through the host.
//   done     — the receipt: provider phone (big — that's the next step),
//              what we emailed, and the funding strip again.
//   funding  — the three forms, full size (from funding_programs).
// ← → in the top-right walk a history stack, like a tiny browser.
//
//   costs    — one county's typical monthly prices by age, center vs family,
//              each bar against the statewide median (from get_county_costs).
//   district — results with a header for the legislative district: the
//              representative, party, phones, district-wide totals.
//
// The card talks only to its own MCP server, through the host. No fetch, no
// cookies. The one outbound resource is the basemap: OpenStreetMap tiles from
// CARTO (declared in the resource's CSP), stitched into a small mosaic here
// with our own pins — no Google, no key. If tiles fail to load the map hides.

import { App } from "@modelcontextprotocol/ext-apps";

type Facility = {
  facility_id: string;
  name: string | null;
  provider: string | null;
  program_type: string | null;
  program_type_label: string | null;
  status: string | null;
  city: string | null;
  county: string | null;
  zip: string | null;
  phone: string | null;
  capacity: { total: number | null; infant: number | null; toddler: number | null; preschool: number | null; school_age: number | null };
  distance_miles?: number;
  lat: number | null;
  lng: number | null;
  ocfs_profile_url?: string;
  url?: string;
  county_url?: string;
};
type FundingForm = { id: string; title: string; blurb: string; what: string; url?: string; href?: string; minutes: number; cta: string };
type Funding = { headline: string; summary: string; forms: FundingForm[] };
type Legislator = { name: string; title: string; party: string | null; albany_phone: string | null; district_phone: string | null; email: string | null; district_office_city: string | null };
type District = { chamber: "senate" | "assembly"; number: number; label: string; providers_total: number; seats_total: number | null; legislator: Legislator | null; url?: string };
type Origin = { lat: number; lng: number; description: string; county?: string | null };
type Results = { kind: "facilities"; query?: Record<string, unknown>; origin?: Origin; district?: District; count?: number; facilities: Facility[]; note?: string; funding: Funding; error?: string };
type Ages = { infant: number | null; toddler: number | null; preschool: number | null };
type Costs = { kind: "costs"; found: boolean; funding?: Funding; county?: string; year?: number; center_monthly?: Ages; family_monthly?: Ages; state_median?: { center_monthly: Ages; family_monthly: Ages } | null; note?: string; county_url?: string; error?: string };
type One = { kind: "facility"; facility: Facility; funding: Funding };
type FundingOnly = { kind: "funding" } & Funding;
type Interest = {
  kind: "interest";
  recorded: boolean;
  facility?: { facility_id: string; name: string; phone: string | null; ocfs_profile_url: string | null; url?: string };
  confirmation?: string;
  next_step?: string;
  error?: string;
};
type ToolData = Results | One | FundingOnly | Interest | Costs | { error: string };

type Screen =
  | { kind: "results"; data: Results; title: string; sub: string }
  | { kind: "facility"; data: One }
  | { kind: "interest"; f: Facility; funding: Funding | null }
  | { kind: "done"; data: Interest; funding: Funding | null; f: Facility | null }
  | { kind: "funding"; data: Funding }
  | { kind: "costs"; data: Costs };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = {
  back: $<HTMLButtonElement>("back"), fwd: $<HTMLButtonElement>("fwd"),
  title: $("title"), sub: $("sub"),
  results: $("results"), dist: $("dist"), map: $("map"), tiles: $("tiles-map"), rows: $("rows"), empty: $("empty"), rfine: $("rfine"),
  costs: $("costs"),
  interest: $("interest"), first: $<HTMLInputElement>("first"), last: $<HTMLInputElement>("last"), email: $<HTMLInputElement>("email"),
  phone: $<HTMLInputElement>("phone"), start: $<HTMLInputElement>("start"), children: $<HTMLInputElement>("children"),
  message: $<HTMLTextAreaElement>("message"), send: $<HTMLButtonElement>("send"), ipage: $<HTMLButtonElement>("ipage"),
  done: $("done"), receipt: $("receipt"),
  msg: $("msg"),
  fund: $("fund"), fh: $("fh"), fs: $("fs"), ftiles: $("tiles"),
};

// ── State ────────────────────────────────────────────────────────────────────

const history: Screen[] = [];
let cursor = -1;
let busy = false;
let lastFunding: Funding | null = null;

const cur = (): Screen | null => history[cursor] ?? null;
function push(s: Screen) { history.splice(cursor + 1); history.push(s); cursor = history.length - 1; render(); }
function replace(s: Screen) { if (cursor < 0) return push(s); history[cursor] = s; render(); }

// ── Formatting ───────────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const where = (f: Facility) => (f.city ? `${f.city}, NY` : f.county ? `${f.county} County, NY` : "");
/** "(631)543-4949" / "6315434949" → "(631) 543-4949"; anything else as given. */
const fmtPhone = (p: string | null | undefined) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
};
const telHref = (p: string) => `tel:+1${p.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}`;
/** Click-to-call. Hosts differ on whether a sandboxed frame may navigate to
 *  tel:, so try the host's openLink first and fall back to a plain navigation. */
function telLink(p: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "tel";
  a.href = telHref(p);
  a.textContent = fmtPhone(p);
  a.addEventListener("click", (e) => {
    e.preventDefault();
    app.openLink({ url: a.href }).catch(() => { window.location.href = a.href; });
  });
  return a;
}
const cap = (f: Facility) => (f.capacity?.total ? `<b>${f.capacity.total} seats</b>` : "");
const describeQuery = (q: Record<string, unknown> | undefined) => {
  if (!q) return "";
  const bits: string[] = [];
  if (q.chamber && q.district) bits.push(`${q.chamber === "senate" ? "Senate" : "Assembly"} District ${q.district}`);
  if (q.q) bits.push(`“${q.q}”`);
  if (q.near) bits.push(`near ${q.near}`);
  if (q.city) bits.push(String(q.city));
  if (q.zip) bits.push(String(q.zip));
  if (q.county) bits.push(`${q.county}${/county$/i.test(String(q.county)) ? "" : " County"}`);
  if (q.program_type) bits.push(String(q.program_type));
  return bits.join(" · ");
};

// ── Rendering ────────────────────────────────────────────────────────────────

function setMsg(kind: "ok" | "err" | null, text = "") {
  el.msg.className = kind ? `msg ${kind}` : "msg hidden";
  el.msg.textContent = text;
}
function show(which: "results" | "interest" | "done" | "costs" | null) {
  el.results.classList.toggle("hidden", which !== "results");
  el.interest.classList.toggle("hidden", which !== "interest");
  el.done.classList.toggle("hidden", which !== "done");
  el.costs.classList.toggle("hidden", which !== "costs");
}

function renderFunding(f: Funding | null, big = false) {
  el.fund.classList.toggle("hidden", !f);
  el.fund.classList.toggle("big", big);
  if (!f) return;
  const parts = f.headline.split(/\s+/);
  const last = parts.pop();
  el.fh.innerHTML = `${esc(parts.join(" "))} <i>${esc(last)}</i>`;
  el.fs.textContent = f.summary;
  el.ftiles.replaceChildren(
    ...f.forms.map((fm) => {
      const t = document.createElement("div");
      t.className = "tile";
      t.innerHTML = `<div class="tt">${esc(fm.title)}</div><div class="tb">${esc(big ? fm.what : fm.blurb)}</div>`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn pri";
      b.textContent = fm.cta + " ↗";
      const url = fm.url ?? fm.href ?? "";
      b.disabled = !url;
      b.addEventListener("click", () => url && void app.openLink({ url }));
      t.append(b);
      return t;
    }),
  );
}

// ── Map: OSM/CARTO tile mosaic + our pins ────────────────────────────────────
// Web-Mercator maths, nothing more. Pick the largest zoom at which every point
// fits inside the box with a margin, centre on the bbox, lay 256px tiles.
const TILE = 256;
const MAP_W = () => Math.max(280, el.map.clientWidth || 568);
const MAP_H = 220;
const lngX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const latY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * TILE * 2 ** z;
};
function renderMap(list: Facility[], origin?: Origin) {
  const pts: Array<{ lat: number; lng: number; label: string; origin?: boolean }> = list
    .filter((f) => typeof f.lat === "number" && typeof f.lng === "number")
    .slice(0, 25)
    .map((f, i) => ({ lat: f.lat as number, lng: f.lng as number, label: String(i + 1) }));
  if (origin) pts.push({ lat: origin.lat, lng: origin.lng, label: "", origin: true });
  if (pts.length === 0) { el.map.classList.add("hidden"); return; }
  el.map.classList.remove("hidden");
  const W = MAP_W(), H = MAP_H, PAD = 28;
  const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  let z = 15;
  for (; z > 4; z--) {
    const w = lngX(maxLng, z) - lngX(minLng, z), h = latY(minLat, z) - latY(maxLat, z);
    if (w <= W - PAD * 2 && h <= H - PAD * 2) break;
  }
  if (pts.length === 1) z = Math.min(z, 13);
  const cx = (lngX(minLng, z) + lngX(maxLng, z)) / 2, cy = (latY(minLat, z) + latY(maxLat, z)) / 2;
  const left = cx - W / 2, top = cy - H / 2;
  const frag = document.createDocumentFragment();
  const x0 = Math.floor(left / TILE), x1 = Math.floor((left + W) / TILE);
  const y0 = Math.floor(top / TILE), y1 = Math.floor((top + H) / TILE);
  const n = 2 ** z;
  let failed = 0;
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      const img = document.createElement("img");
      const wx = ((tx % n) + n) % n;
      const sub = "abcd"[(wx + ty) % 4];
      img.src = `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${wx}/${ty}@2x.png`;
      img.alt = "";
      img.style.left = `${tx * TILE - left}px`;
      img.style.top = `${ty * TILE - top}px`;
      img.onerror = () => { if (++failed > 2) el.map.classList.add("hidden"); };
      frag.append(img);
    }
  }
  for (const p of pts) {
    const pin = document.createElement("div");
    pin.className = "pin" + (p.origin ? " origin" : "");
    pin.style.left = `${lngX(p.lng, z) - left}px`;
    pin.style.top = `${latY(p.lat, z) - top}px`;
    pin.textContent = p.origin ? "" : p.label;
    pin.title = p.origin ? "You" : `#${p.label}`;
    frag.append(pin);
  }
  el.tiles.replaceChildren(frag);
}

function renderDistrict(d: District | undefined) {
  el.dist.classList.toggle("hidden", !d);
  if (!d) return;
  const l = d.legislator;
  el.dist.innerHTML =
    `<div><div class="who">${l ? esc(l.title + " " + l.name) : esc(d.label)}</div>` +
    `<div class="role">${l ? esc([d.label, l.party].filter(Boolean).join(" · ")) : "Representative not on file"}</div></div>` +
    `<div class="tot"><b>${d.providers_total.toLocaleString()}</b>providers${d.seats_total != null ? ` · ${d.seats_total.toLocaleString()} seats` : ""}</div>` +
    (l ? `<div class="contact">${l.district_phone ? `<span>District office ${esc(l.district_phone)}${l.district_office_city ? " (" + esc(l.district_office_city) + ")" : ""}</span>` : ""}${l.albany_phone ? `<span>Albany ${esc(l.albany_phone)}</span>` : ""}${l.email ? `<span>${esc(l.email)}</span>` : ""}</div>` : "");
  if (d.url) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "link"; b.textContent = "District page ↗"; b.style.gridColumn = "1 / -1"; b.style.justifySelf = "start";
    b.addEventListener("click", () => void app.openLink({ url: d.url! }));
    el.dist.append(b);
  }
}

const money = (n: number | null | undefined) => (n == null ? "—" : `$${Math.round(n).toLocaleString()}`);
function renderCosts(c: Costs) {
  el.costs.classList.remove("hidden");
  if (!c.found) { el.costs.innerHTML = `<div class="empty">${esc(c.note ?? "No cost data on file for that county.")}</div>`; return; }
  const ages: Array<[keyof Ages, string]> = [["infant", "Infant"], ["toddler", "Toddler"], ["preschool", "Preschool"]];
  const groups: Array<[string, Ages | undefined, Ages | undefined, string]> = [
    ["Center-based care", c.center_monthly, c.state_median?.center_monthly, "licensed day care centers"],
    ["Family care", c.family_monthly, c.state_median?.family_monthly, "family & group family day care"],
  ];
  const all = groups.flatMap(([, a, m]) => [...ages.map(([k]) => a?.[k] ?? 0), ...ages.map(([k]) => m?.[k] ?? 0)]);
  const max = Math.max(1, ...all) * 1.08;
  el.costs.innerHTML = groups.map(([title, a, m, sub]) =>
    `<div class="grp"><div class="gh">${esc(title)}<span>${esc(sub)}</span></div>` +
    ages.map(([k, lab]) => {
      const v = a?.[k] ?? null, med = m?.[k] ?? null;
      const pct = v == null ? 0 : (v / max) * 100;
      const diff = v != null && med != null && med > 0 ? Math.round(((v - med) / med) * 100) : null;
      return `<div class="bar"><div class="lab">${lab}</div><div class="trk"><div class="fil" style="width:${pct}%"></div>${med != null ? `<div class="med" style="left:${(med / max) * 100}%" title="New York median ${money(med)}"></div>` : ""}</div>` +
        `<div class="val">${money(v)}<small>${diff == null ? "per month" : (diff >= 0 ? "+" : "") + diff + "% vs NY"}</small></div></div>`;
    }).join("") + `</div>`,
  ).join("") + `<div class="key"><i></i>${esc(c.county ?? "county")} median &nbsp;<b></b>New York median · ${c.year ?? ""} · U.S. Dept. of Labor, monthly (weekly × 52 ÷ 12)</div>`;
  if (c.county_url) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "link"; b.textContent = "County page ↗"; b.style.marginTop = "8px";
    b.addEventListener("click", () => void app.openLink({ url: c.county_url! }));
    el.costs.append(b);
  }
}

function facilityRow(f: Facility, index: number | null, funding: Funding | null) {
  const row = document.createElement("div");
  row.className = "row";
  const left = document.createElement("div");
  const name = document.createElement("div");
  name.className = "name";
  name.append(`${index != null ? `${index}. ` : ""}${f.name ?? "Provider"}`);
  if (f.url) {
    const ext = document.createElement("button");
    ext.type = "button";
    ext.className = "ext";
    ext.title = `Open ${f.name ?? "this provider"} on ChildcareGPT`;
    ext.setAttribute("aria-label", ext.title);
    ext.textContent = "↗";
    ext.addEventListener("click", () => void app.openLink({ url: f.url! }));
    name.append(ext);
  }
  const dist = typeof f.distance_miles === "number" ? ` · ${f.distance_miles} mi` : "";
  const l1 = document.createElement("div");
  l1.className = "meta";
  l1.textContent = `${where(f)}${dist}`;
  const l2 = document.createElement("div");
  l2.className = "meta";
  l2.innerHTML = cap(f);
  if (f.phone) { if (cap(f)) l2.append(" · "); l2.append(telLink(f.phone)); }
  left.append(name, l1, l2);
  const acts = document.createElement("div");
  acts.className = "acts";
  const interested = document.createElement("button");
  interested.type = "button";
  interested.className = "btn pri";
  interested.textContent = "I’m interested";
  interested.disabled = busy;
  interested.addEventListener("click", () => push({ kind: "interest", f, funding }));
  acts.append(interested);
  row.append(left, acts);
  return row;
}

function render() {
  const s = cur();
  el.back.disabled = busy || cursor <= 0;
  el.fwd.disabled = busy || cursor >= history.length - 1;
  if (!s) return;
  el.title.classList.remove("hidden");

  if (s.kind === "results" || s.kind === "facility") {
    setMsg(null);
    show("results");
    const list = s.kind === "results" ? s.data.facilities : [s.data.facility];
    const funding = s.data.funding ?? lastFunding;
    if (s.kind === "results") {
      el.title.innerHTML = s.title;
      el.sub.textContent = s.sub;
      if (s.data.error) setMsg("err", s.data.error);
    } else {
      const f = s.data.facility;
      el.title.innerHTML = esc(f.name ?? "Provider");
      el.sub.textContent = where(f);
    }
    renderDistrict(s.kind === "results" ? s.data.district : undefined);
    renderMap(list, s.kind === "results" ? s.data.origin : undefined);
    el.rows.replaceChildren(...list.map((f, i) => facilityRow(f, s.kind === "results" ? i + 1 : null, funding)));
    el.empty.classList.toggle("hidden", list.length > 0);
    el.rfine.textContent = list.length ? "Capacity is the licensed maximum, not an open spot — call to confirm availability." : "";
    renderFunding(funding);
    return;
  }

  if (s.kind === "interest") {
    setMsg(null);
    show("interest");
    el.title.innerHTML = `Interested in <i>${esc(s.f.name ?? "this provider")}</i>`;
    el.sub.textContent = [where(s.f), fmtPhone(s.f.phone)].filter(Boolean).join(" · ");
    el.send.disabled = busy;
    el.send.textContent = busy ? "Sending…" : "Send my interest";
    el.ipage.classList.toggle("hidden", !s.f.url);
    renderFunding(null);
    return;
  }

  if (s.kind === "done") {
    show("done");
    const d = s.data;
    const name = d.facility?.name ?? s.f?.name ?? "";
    el.title.innerHTML = d.recorded ? "" : "Not recorded";
    el.title.classList.toggle("hidden", d.recorded);
    el.sub.textContent = "";
    el.receipt.replaceChildren();
    if (!d.recorded) {
      setMsg("err", d.error ?? "Your interest could not be recorded.");
      renderFunding(s.funding);
      return;
    }
    setMsg(null);
    const phone = d.facility?.phone ?? s.f?.phone ?? null;
    const who = document.createElement("div");
    who.className = "who";
    who.textContent = name;
    const p = document.createElement("p");
    p.textContent = phone
      ? `Providers list a phone with the state, not an email. The fastest way to a spot is to call ${fmtPhone(phone)} and ask about openings for the ages given.`
      : "Providers list a phone with the state, not an email — this one has no number on file. Open the provider page for the state record and other contact details.";
    el.receipt.append(who, p);
    if (phone) {
      const a = telLink(phone);
      a.append(" ↗");
      el.receipt.append(a);
    } else if (d.facility?.url ?? s.f?.url) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "link"; b.textContent = "Provider page ↗";
      b.addEventListener("click", () => void app.openLink({ url: (d.facility?.url ?? s.f?.url)! }));
      el.receipt.append(b);
    }
    renderFunding(s.funding);
    return;
  }

  if (s.kind === "costs") {
    setMsg(null);
    show("costs");
    const c = s.data;
    el.title.innerHTML = c.found ? `What care costs in <i>${esc(c.county ?? "")}</i>` : "No cost data";
    el.sub.textContent = c.found ? "Typical monthly prices, by age — the tick on each bar is the New York median." : (c.note ?? "");
    renderCosts(c);
    renderFunding(lastFunding);
    return;
  }

  // funding
  setMsg(null);
  show(null);
  el.title.innerHTML = `Help <i>paying</i> for care`;
  el.sub.textContent = "Three free steps, minutes each. The county decides eligibility — not us, not this chat.";
  renderFunding(s.data, true);
}

// ── Host wiring ──────────────────────────────────────────────────────────────

const app = new App({ name: "ChildcareGPT", version: "1.0.0" });

const parse = <T,>(result: { content?: Array<{ type: string; text?: string }>; structuredContent?: unknown }): T | null => {
  if (result.structuredContent) return result.structuredContent as T;
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
};

function applyTheme() {
  const theme = app.getHostContext()?.theme;
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}
app.onhostcontextchanged = applyTheme;

app.ontoolinput = (p) => {
  const a = (p.arguments ?? {}) as Record<string, unknown>;
  const q = describeQuery(a);
  el.title.textContent = q ? `Looking in ${q}…` : "Loading…";
};

function ingest(data: ToolData) {
  if ("kind" in data && data.kind === "facilities") {
    lastFunding = data.funding ?? lastFunding;
    const q = describeQuery(data.query);
    const n = data.facilities.length;
    const d = data.district;
    push({
      kind: "results",
      data,
      title: d
        ? `Child care in <i>${esc(d.label)}</i>`
        : n ? `${n} provider${n === 1 ? "" : "s"}${q ? ` ${data.origin ? "" : "in "}<i>${esc(q)}</i>` : ""}` : `Nothing on file${q ? ` for <i>${esc(q)}</i>` : ""}`,
      sub: n ? (d ? `Top ${n} by licensed capacity. Tap “I’m interested” to send your details; ↗ opens the provider page.` : "Tap “I’m interested” to send your details; ↗ opens the provider page.") : "",
    });
    return;
  }
  if ("kind" in data && data.kind === "facility") {
    lastFunding = data.funding ?? lastFunding;
    push({ kind: "facility", data });
    return;
  }
  if ("kind" in data && data.kind === "costs") {
    lastFunding = data.funding ?? lastFunding;
    push({ kind: "costs", data });
    return;
  }
  if ("kind" in data && data.kind === "funding") {
    lastFunding = data;
    push({ kind: "funding", data });
    return;
  }
  if ("kind" in data && data.kind === "interest") {
    push({ kind: "done", data, funding: lastFunding, f: null });
    return;
  }
  setMsg("err", (data as { error?: string }).error ?? "Something went wrong. Ask again in the chat.");
}

app.ontoolresult = (result) => {
  const data = parse<ToolData>(result);
  if (!data) { setMsg("err", "Could not read the result. Ask again in the chat."); return; }
  ingest(data);
};

async function withBusy<T>(fn: () => Promise<T>): Promise<T | undefined> {
  busy = true; render();
  try { return await fn(); } finally { busy = false; render(); }
}

// ── Controls ─────────────────────────────────────────────────────────────────

el.back.addEventListener("click", () => { if (cursor > 0) { cursor--; render(); } });
el.fwd.addEventListener("click", () => { if (cursor < history.length - 1) { cursor++; render(); } });
el.ipage.addEventListener("click", () => { const s = cur(); if (s?.kind === "interest" && s.f.url) void app.openLink({ url: s.f.url }); });

el.send.addEventListener("click", async () => {
  const s = cur();
  if (!s || s.kind !== "interest" || busy) return;
  const first = el.first.value.trim();
  const last = el.last.value.trim();
  const email = el.email.value.trim();
  if (!first || !last) { setMsg("err", "First and last name, please."); (first ? el.last : el.first).focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg("err", "A valid email, please — that is where the provider’s number goes."); el.email.focus(); return; }
  setMsg(null);
  const f = s.f;
  const funding = s.funding;
  await withBusy(async () => {
    let r: Interest | null = null;
    try {
      r = parse<Interest>(
        await app.callServerTool({
          name: "express_interest",
          arguments: {
            facility_id: f.facility_id,
            first_name: first,
            last_name: last,
            email,
            phone: el.phone.value.trim() || undefined,
            start_when: el.start.value.trim() || undefined,
            children: el.children.value.trim() || undefined,
            message: el.message.value.trim() || undefined,
          },
        }),
      );
    } catch { r = null; }
    if (!r) return setMsg("err", "Could not send. Try again, or open the provider page.");
    if (!r.recorded) return setMsg("err", r.error ?? "Your interest could not be recorded.");
    push({ kind: "done", data: r, funding, f });
    // Tell the model, quietly. The model does not see calls the card makes;
    // updateModelContext hands it a note without putting words in the
    // person's composer (sendMessage does that, with a scary banner — no).
    const line = `[card] Interest in ${f.name ?? "the provider"} was sent from the card as ${first} ${last} (${email}). It is recorded — do not call express_interest again. Next step for the person: call ${f.phone ? fmtPhone(f.phone) : "the provider"}.`;
    await app.updateModelContext({ content: [{ type: "text", text: line }] }).catch(() => undefined);
  });
});

app.connect().then(applyTheme).catch(() => setMsg("err", "Could not connect to the chat host."));
