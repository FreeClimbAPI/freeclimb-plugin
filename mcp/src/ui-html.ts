import { FREECLIMB_FONT_LINKS, FREECLIMB_THEME_CSS } from "./ui-brand.js"

export const TABLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
${FREECLIMB_FONT_LINKS}
<style>
  ${FREECLIMB_THEME_CSS}
  body {
    padding: 4px;
  }
  .card {
    background: linear-gradient(135deg, var(--background-blue), var(--background-dark));
    border: 1px solid var(--faint);
    border-radius: 14px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
    overflow: hidden;
  }
  .card-head {
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--faint);
  }
  .eyebrow {
    color: var(--brand-green);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0 0 4px;
  }
  .title { font-size: 18px; font-weight: 700; margin: 0; }
  .count { color: var(--muted); font-size: 12px; font-weight: 700; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  thead th {
    text-align: left;
    padding: 10px 20px;
    color: var(--mist);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--inner-blue);
  }
  tbody td {
    padding: 11px 20px;
    border-top: 1px solid var(--faint);
    vertical-align: top;
    max-width: 320px;
    overflow-wrap: anywhere;
  }
  tbody tr:hover { background: rgba(38, 105, 122, 0.22); }
  .mono { font-variant-numeric: tabular-nums; }
  .pill {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 1px solid var(--faint);
  }
  .pill-good { color: #06231a; background: var(--brand-green); border-color: transparent; }
  .pill-warn { color: #2a1300; background: var(--brand-orange); border-color: transparent; }
  .pill-neutral { color: var(--white); background: rgba(255,255,255,0.08); }
  #empty { padding: 22px 20px; color: var(--muted); }
  .card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid var(--faint);
  }
  .showing { color: var(--muted); font-size: 12px; font-weight: 700; }
  .more-btn {
    font: inherit;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: #06231a;
    background: var(--brand-green);
    border: 0;
    border-radius: 999px;
    padding: 7px 16px;
    cursor: pointer;
    transition: transform 120ms ease, filter 120ms ease;
  }
  .more-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
  .more-btn:active { transform: translateY(0); }
  .fields { margin: 0; padding: 8px 20px 18px; }
  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 0;
    border-top: 1px solid var(--faint);
  }
  .field:first-child { border-top: 0; }
  .field-label { color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .field-value { font-size: 14px; text-align: right; overflow-wrap: anywhere; }
</style>
</head>
<body>
  <div class="card">
    <div class="card-head">
      <p class="eyebrow" id="eyebrow">FreeClimb</p>
      <p class="title"><span id="title">Loading…</span> <span class="count" id="count"></span></p>
    </div>
    <table id="tbl" hidden>
      <thead><tr id="head-row"></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <div class="card-foot" id="foot" hidden>
      <span class="showing" id="showing"></span>
      <button class="more-btn" id="more" type="button" hidden>Show more</button>
    </div>
    <dl class="fields" id="fields" hidden></dl>
    <div id="empty">Waiting for data…</div>
  </div>
<script>
  var nextId = 1;
  var pending = {};
  var fullscreenSupported = false;
  var fullscreenRequested = false;
  var rendered = false;

  function request(method, params) {
    var id = nextId++;
    window.parent.postMessage({ jsonrpc: "2.0", id: id, method: method, params: params }, "*");
    return new Promise(function (resolve, reject) { pending[id] = { resolve: resolve, reject: reject }; });
  }
  function notify(method, params) {
    window.parent.postMessage({ jsonrpc: "2.0", method: method, params: params }, "*");
  }
  function requestFullscreen() {
    if (!rendered || !fullscreenSupported || fullscreenRequested) return;
    fullscreenRequested = true;
    request("ui/request-display-mode", { mode: "fullscreen" }).catch(function () {});
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pillClass(value) {
    var v = String(value || "").toLowerCase();
    if (["delivered", "completed", "received", "sent", "inprogress", "in-progress"].indexOf(v) !== -1) return "pill-good";
    if (["failed", "undelivered", "busy", "noanswer", "no-answer", "canceled", "error"].indexOf(v) !== -1) return "pill-warn";
    return "pill-neutral";
  }
  var PAGE_SIZE = 10;
  var current = null;
  var visible = PAGE_SIZE;

  function reportSize() {
    notify("ui/notifications/size-changed", {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    });
  }
  function draw() {
    if (!current) return;
    var cols = current.columns || [];
    var rows = current.rows || [];
    var slice = rows.slice(0, visible);

    var tbody = document.getElementById("rows");
    tbody.innerHTML = slice.map(function (row) {
      return "<tr>" + cols.map(function (c) {
        var raw = row[c.key];
        if (current.statusKey && c.key === current.statusKey && raw) {
          return "<td><span class=\\"pill " + pillClass(raw) + "\\">" + esc(raw) + "</span></td>";
        }
        var cls = (c.key === "from" || c.key === "to" || c.key === "phoneNumber") ? " class=\\"mono\\"" : "";
        return "<td" + cls + ">" + esc(raw) + "</td>";
      }).join("") + "</tr>";
    }).join("");

    var foot = document.getElementById("foot");
    var showing = document.getElementById("showing");
    var more = document.getElementById("more");
    foot.hidden = false;
    showing.textContent = "Showing " + slice.length + " of " + rows.length;
    var remaining = rows.length - slice.length;
    if (remaining > 0) {
      more.hidden = false;
      more.textContent = "Show more (" + Math.min(PAGE_SIZE, remaining) + ")";
    } else {
      more.hidden = true;
    }
    reportSize();
  }
  function render(table) {
    if (!table) return;
    current = table;
    visible = PAGE_SIZE;
    document.getElementById("fields").hidden = true;
    document.getElementById("eyebrow").textContent = table.eyebrow || "FreeClimb";
    document.getElementById("title").textContent = table.title || "Results";
    var cols = table.columns || [];
    var rows = table.rows || [];
    document.getElementById("count").textContent = rows.length ? "(" + rows.length + ")" : "";

    document.getElementById("head-row").innerHTML =
      cols.map(function (c) { return "<th>" + esc(c.header) + "</th>"; }).join("");

    var tbl = document.getElementById("tbl");
    var empty = document.getElementById("empty");
    if (!rows.length) {
      tbl.hidden = true;
      document.getElementById("foot").hidden = true;
      empty.hidden = false;
      empty.textContent = "No results.";
      rendered = true;
      reportSize();
      requestFullscreen();
      return;
    }
    empty.hidden = true;
    tbl.hidden = false;
    draw();
    rendered = true;
    requestFullscreen();
  }

  document.getElementById("more").addEventListener("click", function () {
    visible += PAGE_SIZE;
    draw();
  });

  function renderCard(card) {
    if (!card) return;
    document.getElementById("eyebrow").textContent = card.eyebrow || "FreeClimb";
    document.getElementById("title").textContent = card.title || "FreeClimb";
    document.getElementById("count").textContent = "";
    document.getElementById("tbl").hidden = true;
    document.getElementById("foot").hidden = true;
    document.getElementById("empty").hidden = true;

    var fields = card.fields || [];
    var dl = document.getElementById("fields");
    dl.innerHTML = fields.map(function (f) {
      var v = esc(f.value);
      if (f.kind === "good" || f.kind === "warn") {
        var pc = f.kind === "good" ? "pill-good" : "pill-warn";
        v = "<span class=\\"pill " + pc + "\\">" + v + "</span>";
      } else if (f.kind === "mono") {
        v = "<span class=\\"mono\\">" + v + "</span>";
      }
      return "<div class=\\"field\\"><span class=\\"field-label\\">" + esc(f.label) +
        "</span><span class=\\"field-value\\">" + v + "</span></div>";
    }).join("");
    dl.hidden = false;
    rendered = true;
    reportSize();
    requestFullscreen();
  }

  window.addEventListener("message", function (event) {
    var msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    if (msg.id != null && pending[msg.id]) {
      var p = pending[msg.id];
      delete pending[msg.id];
      if (msg.error) { p.reject(new Error(msg.error.message)); } else { p.resolve(msg.result); }
      return;
    }
    if (msg.method === "ui/notifications/tool-result") {
      var sc = msg.params && msg.params.structuredContent;
      if (!sc) return;
      if (sc.table) render(sc.table);
      else if (sc.card) renderCard(sc.card);
    }
  });

  (function () {
    var announced = false;
    function announce() {
      if (announced) return;
      announced = true;
      notify("ui/notifications/initialized", {});
    }
    request("ui/initialize", {
      appInfo: { name: "freeclimb-table", version: "1.0.0" },
      appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
      protocolVersion: "2025-06-18"
    }).then(function (result) {
      var modes = result && result.hostContext && result.hostContext.availableDisplayModes;
      fullscreenSupported = Array.isArray(modes) && modes.indexOf("fullscreen") !== -1;
      announce();
      requestFullscreen();
    }).catch(announce);
    setTimeout(announce, 800);
  })();
</script>
</body>
</html>`
