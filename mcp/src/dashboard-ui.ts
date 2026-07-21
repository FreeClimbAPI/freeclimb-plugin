import {
    ValidationError,
    extractSourceBindings,
    type DashboardSnapshot,
    type DashboardSpec,
} from "@freeclimb/core"

export const UI_DASHBOARD_URI = "ui://freeclimb/dashboard"
export const UI_DASHBOARD_MIME = "text/html;profile=mcp-app"

const MAX_ELEMENTS = 60
const MAX_SOURCES = 8
const MAX_DEPTH = 12
const MAX_CHILDREN = 20
const MAX_ARRAY_ITEMS = 25
const MAX_OBJECT_KEYS = 12
const MAX_STRING_LENGTH = 500

const COMPONENT_PROPS = {
    BarChart: new Set(["data", "labelKey", "title", "valueKey"]),
    Box: new Set(["flexDirection", "gap"]),
    CallStatusCard: new Set(["callId", "direction", "duration", "from", "status", "to"]),
    Card: new Set(["title"]),
    Heading: new Set(["level", "text"]),
    KeyValue: new Set(["label", "value"]),
    LogStream: new Set(["entries", "maxLines"]),
    Metric: new Set(["label", "trend", "value"]),
    QueueDepthGauge: new Set(["alias", "averageWaitTime", "currentSize", "maxSize"]),
    Sparkline: new Set(["data", "label", "valueKey"]),
    StatusLine: new Set(["status", "text"]),
    Table: new Set(["columns", "rows", "statusKey"]),
} as const

export type DashboardComponentType = keyof typeof COMPONENT_PROPS

export interface DashboardNode {
    children: DashboardNode[]
    props: Record<string, unknown>
    type: DashboardComponentType
}

export interface DashboardPayload {
    errors: Array<{ message: string; source: string }>
    root: DashboardNode
    snapshotAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function decodePointerSegment(segment: string): string {
    return segment.replace(/~1/g, "/").replace(/~0/g, "~")
}

function pointerSegments(pointer: string): string[] {
    if (!pointer.startsWith("/")) {
        throw new ValidationError(`Invalid dashboard state pointer: ${pointer}`)
    }
    const segments = pointer.slice(1).split("/").map(decodePointerSegment)
    if (segments.some((segment) => ["__proto__", "constructor", "prototype"].includes(segment))) {
        throw new ValidationError(`Invalid dashboard state pointer: ${pointer}`)
    }
    return segments
}

function setPointer(root: Record<string, unknown>, pointer: string, value: unknown): void {
    const segments = pointerSegments(pointer)
    let current = root
    for (const segment of segments.slice(0, -1)) {
        if (!isRecord(current[segment])) current[segment] = {}
        current = current[segment] as Record<string, unknown>
    }
    const last = segments.at(-1)
    if (last !== undefined) current[last] = value
}

function getPointer(root: Record<string, unknown>, pointer: string): unknown {
    const segments = pointerSegments(pointer)
    let current: unknown = root
    for (const segment of segments) {
        if (!isRecord(current) && !Array.isArray(current)) return null
        current = (current as Record<string, unknown>)[segment]
    }
    return current ?? null
}

function clampString(value: string): string {
    return value.slice(0, MAX_STRING_LENGTH)
}

function sensitiveReplacement(key: string): string | undefined {
    if (/api.?key|secret|credential|token/i.test(key)) return "[hidden]"
    if (/^(from|to|phone|phoneNumber|callingNumber|dialedNumber)$/i.test(key)) return "[redacted]"
    if (/(^|_)(id)$/i.test(key) || /Id$/.test(key)) return "[redacted]"
    if (/^(text|body|message|content|logText|pql)$/i.test(key)) return "[hidden]"
    return undefined
}

function sanitizeStateValue(value: unknown, key: string, depth = 0): unknown {
    const replacement = sensitiveReplacement(key)
    if (replacement && !isRecord(value) && !Array.isArray(value)) return replacement
    if (depth >= MAX_DEPTH) return null
    if (value === null || value === undefined) return null
    if (typeof value === "string") return clampString(value)
    if (typeof value === "number" || typeof value === "boolean") return value
    if (Array.isArray(value)) {
        return value
            .slice(0, MAX_ARRAY_ITEMS)
            .map((item) => sanitizeStateValue(item, key, depth + 1))
    }
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .slice(0, MAX_OBJECT_KEYS)
                .filter(([childKey]) => !["__proto__", "constructor", "prototype"].includes(childKey))
                .map(([childKey, childValue]) => [
                    childKey,
                    sanitizeStateValue(childValue, childKey, depth + 1),
                ]),
        )
    }
    return clampString(String(value))
}

function sanitizeLiteral(value: unknown, depth = 0): unknown {
    if (depth >= MAX_DEPTH) return null
    if (value === null || value === undefined) return null
    if (typeof value === "string") return clampString(value)
    if (typeof value === "number" || typeof value === "boolean") return value
    if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeLiteral(item, depth + 1))
    }
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .slice(0, MAX_OBJECT_KEYS)
                .filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key))
                .map(([key, child]) => [key, sanitizeLiteral(child, depth + 1)]),
        )
    }
    return clampString(String(value))
}

function resolveProp(value: unknown, state: Record<string, unknown>, key: string): unknown {
    if (isRecord(value) && typeof value.$state === "string") {
        const resolved = getPointer(state, value.$state)
        const segments = pointerSegments(value.$state)
        return sanitizeStateValue(resolved, segments.at(-1) ?? key)
    }
    return sanitizeLiteral(value)
}

function isComponentType(value: string): value is DashboardComponentType {
    return value in COMPONENT_PROPS
}

function buildNode(
    spec: DashboardSpec,
    elementId: string,
    state: Record<string, unknown>,
    ancestors: Set<string>,
    depth: number,
): DashboardNode {
    if (depth > MAX_DEPTH) {
        throw new ValidationError(`Dashboard exceeds maximum depth of ${MAX_DEPTH}`)
    }
    if (ancestors.has(elementId)) {
        throw new ValidationError(`Dashboard contains a cycle at element "${elementId}"`)
    }
    const element = spec.elements[elementId]
    if (!element) {
        throw new ValidationError(`Dashboard references missing element "${elementId}"`)
    }
    if (!isComponentType(element.type)) {
        throw new ValidationError(`Unsupported dashboard component "${element.type}"`)
    }

    const allowedProps = COMPONENT_PROPS[element.type]
    const props = Object.fromEntries(
        Object.entries(element.props)
            .filter(([key]) => allowedProps.has(key))
            .map(([key, value]) => [key, resolveProp(value, state, key)]),
    )
    if (
        element.type === "StatusLine" &&
        typeof props.text === "string" &&
        /live updating|ctrl\+c/i.test(props.text)
    ) {
        props.text = "Read-only snapshot · call again to refresh"
    }
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(elementId)
    const children = (element.children ?? [])
        .slice(0, MAX_CHILDREN)
        .map((childId) => buildNode(spec, childId, state, nextAncestors, depth + 1))

    return { children, props, type: element.type }
}

export function buildDashboardPayload(
    spec: DashboardSpec,
    snapshot: DashboardSnapshot,
    snapshotAt = new Date().toISOString(),
): DashboardPayload {
    const elementCount = Object.keys(spec.elements).length
    if (elementCount > MAX_ELEMENTS) {
        throw new ValidationError(`Dashboard has too many elements (max ${MAX_ELEMENTS})`)
    }
    const sourceCount = extractSourceBindings(spec.state ?? {}).length
    if (sourceCount > MAX_SOURCES) {
        throw new ValidationError(`Dashboard has too many data sources (max ${MAX_SOURCES})`)
    }

    const initialState = sanitizeLiteral(spec.state ?? {})
    const state: Record<string, unknown> = isRecord(initialState) ? initialState : {}
    for (const match of extractSourceBindings(spec.state ?? {})) {
        setPointer(state, match.path, null)
    }
    for (const update of snapshot.updates) setPointer(state, update.path, update.value)

    return {
        errors: snapshot.errors.map((error) => ({
            message:
                error.source === "auth"
                    ? "Authentication required"
                    : `${clampString(error.source)} data unavailable`,
            source: clampString(error.source),
        })),
        root: buildNode(spec, spec.root, state, new Set(), 0),
        snapshotAt,
    }
}

export const DASHBOARD_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root { color-scheme: light dark; --bg:#071d19; --panel:#0d2a24; --panel2:#12372f; --line:#285248; --text:#f3fff9; --muted:#a8c9bf; --mint:#58efbf; --lime:#c9f45b; --orange:#ff9f43; --danger:#ff766f; }
* { box-sizing:border-box; }
body { margin:0; padding:16px; background:var(--bg); color:var(--text); font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
#app { display:flex; flex-direction:column; gap:12px; }
.snapshot { display:flex; justify-content:space-between; gap:12px; color:var(--muted); font-size:12px; }
.snapshot strong { color:var(--mint); letter-spacing:.08em; text-transform:uppercase; }
.box { display:flex; flex-direction:column; gap:8px; min-width:0; }
.box.row { flex-direction:row; align-items:stretch; flex-wrap:wrap; }
.box.row > * { flex:1 1 180px; }
.card { border:1px solid var(--line); border-radius:14px; background:linear-gradient(145deg,var(--panel2),var(--panel)); padding:14px; min-width:0; }
.card-title { color:var(--muted); font-size:12px; font-weight:700; letter-spacing:.06em; margin:0 0 10px; text-transform:uppercase; }
h1,h2,h3 { margin:0; line-height:1.15; }
h1 { font-size:24px; } h2 { font-size:19px; } h3 { font-size:16px; }
.metric-value { color:var(--lime); font-size:30px; font-weight:800; overflow-wrap:anywhere; }
.metric-label,.key-label { color:var(--muted); font-size:12px; font-weight:700; text-transform:uppercase; }
.key-value { display:flex; justify-content:space-between; gap:12px; padding:7px 0; }
.key-value span:last-child { overflow-wrap:anywhere; text-align:right; }
.status { border-left:3px solid var(--mint); color:var(--muted); padding:6px 10px; }
.status.error { border-color:var(--danger); color:var(--danger); }
.status.warn { border-color:var(--orange); }
.table-wrap { overflow:auto; }
table { border-collapse:collapse; width:100%; }
th,td { border-bottom:1px solid var(--line); padding:8px 10px; text-align:left; white-space:nowrap; }
th { color:var(--muted); font-size:11px; letter-spacing:.05em; text-transform:uppercase; }
.pill { border:1px solid var(--line); border-radius:999px; display:inline-block; padding:2px 8px; }
.bar-row { display:grid; grid-template-columns:minmax(70px,1fr) 3fr auto; gap:8px; align-items:center; }
.bar-track,.gauge { background:#061512; border-radius:999px; height:9px; overflow:hidden; }
.bar-fill,.gauge-fill { background:linear-gradient(90deg,var(--mint),var(--lime)); height:100%; min-width:2px; }
.spark { display:flex; align-items:flex-end; gap:3px; height:48px; }
.spark span { background:var(--mint); border-radius:2px 2px 0 0; flex:1; min-width:3px; }
.log { border-bottom:1px solid var(--line); display:grid; grid-template-columns:auto auto 1fr; gap:8px; padding:7px 0; }
.log-level { color:var(--orange); font-weight:700; }
.errors { display:flex; flex-direction:column; gap:6px; }
.error { background:rgba(255,118,111,.1); border:1px solid rgba(255,118,111,.4); border-radius:9px; color:var(--danger); padding:8px 10px; }
.empty { color:var(--muted); padding:14px; text-align:center; }
</style>
</head>
<body>
<div id="app"><div class="empty">Waiting for dashboard data…</div></div>
<script>
var nextId=1;
var pending={};
function request(method,params){var id=nextId++;window.parent.postMessage({jsonrpc:"2.0",id:id,method:method,params:params},"*");return new Promise(function(resolve,reject){pending[id]={resolve:resolve,reject:reject};});}
function notify(method,params){window.parent.postMessage({jsonrpc:"2.0",method:method,params:params},"*");}
function make(tag,className,text){var node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text==null?"":text);return node;}
function valueText(value){if(value===null||value===undefined)return "—";if(typeof value==="object")return JSON.stringify(value);return String(value);}
function renderChildren(target,node){(node.children||[]).forEach(function(child){target.appendChild(renderNode(child));});}
function renderTable(props){var wrap=make("div","table-wrap");var table=make("table");var columns=Array.isArray(props.columns)?props.columns:[];var rows=Array.isArray(props.rows)?props.rows:[];var thead=make("thead");var hr=make("tr");columns.forEach(function(column){hr.appendChild(make("th","",column.header||column.key||""));});thead.appendChild(hr);table.appendChild(thead);var tbody=make("tbody");rows.forEach(function(row){var tr=make("tr");columns.forEach(function(column){var td=make("td");var raw=row&&row[column.key];if(props.statusKey===column.key){td.appendChild(make("span","pill",valueText(raw)));}else{td.textContent=valueText(raw);}tr.appendChild(td);});tbody.appendChild(tr);});table.appendChild(tbody);wrap.appendChild(table);if(!rows.length)wrap.appendChild(make("div","empty","No results"));return wrap;}
function numericData(props){var data=Array.isArray(props.data)?props.data:[];return data.map(function(item,index){if(typeof item==="number")return {label:String(index+1),value:item};var value=Number(item&&item[props.valueKey||"value"]);return {label:valueText(item&&item[props.labelKey||"label"]),value:Number.isFinite(value)?value:0};});}
function renderBars(props){var box=make("div","box");var data=numericData(props);var max=Math.max.apply(null,[1].concat(data.map(function(item){return item.value;})));data.forEach(function(item){var row=make("div","bar-row");row.appendChild(make("span","",item.label));var track=make("div","bar-track");var fill=make("div","bar-fill");fill.style.width=Math.max(0,Math.min(100,item.value/max*100))+"%";track.appendChild(fill);row.appendChild(track);row.appendChild(make("strong","",item.value));box.appendChild(row);});return box;}
function renderSpark(props){var spark=make("div","spark");var data=numericData(props);var max=Math.max.apply(null,[1].concat(data.map(function(item){return item.value;})));data.forEach(function(item){var bar=make("span");bar.style.height=Math.max(4,Math.min(100,item.value/max*100))+"%";bar.title=item.label+": "+item.value;spark.appendChild(bar);});return spark;}
function renderNode(node){var props=node.props||{};var target;if(node.type==="Box"){target=make("div","box"+(props.flexDirection==="row"?" row":""));renderChildren(target,node);return target;}if(node.type==="Heading"){var level=props.level==="h2"?"h2":props.level==="h3"?"h3":"h1";return make(level,"",valueText(props.text));}if(node.type==="Card"){target=make("section","card");if(props.title)target.appendChild(make("p","card-title",props.title));renderChildren(target,node);return target;}if(node.type==="Metric"){target=make("div","metric");target.appendChild(make("div","metric-label",props.label));target.appendChild(make("div","metric-value",valueText(props.value)));if(props.trend)target.appendChild(make("div","status",props.trend));return target;}if(node.type==="KeyValue"){target=make("div","key-value");target.appendChild(make("span","key-label",props.label));target.appendChild(make("span","",valueText(props.value)));return target;}if(node.type==="Table")return renderTable(props);if(node.type==="BarChart")return renderBars(props);if(node.type==="Sparkline")return renderSpark(props);if(node.type==="StatusLine")return make("div","status "+(props.status||""),valueText(props.text));if(node.type==="LogStream"){target=make("div","box");(Array.isArray(props.entries)?props.entries:[]).slice(0,Number(props.maxLines)||15).forEach(function(entry){var line=make("div","log");line.appendChild(make("span","",entry.timestamp||""));line.appendChild(make("span","log-level",entry.level||""));line.appendChild(make("span","",entry.message||""));target.appendChild(line);});return target;}if(node.type==="CallStatusCard"){target=make("section","card");target.appendChild(make("p","card-title","Call"));["status","direction","duration","callId","from","to"].forEach(function(key){if(props[key]!==undefined){var row=make("div","key-value");row.appendChild(make("span","key-label",key));row.appendChild(make("span","",valueText(props[key])));target.appendChild(row);}});return target;}if(node.type==="QueueDepthGauge"){target=make("section","card");target.appendChild(make("p","card-title",props.alias||"Queue"));var current=Number(props.currentSize)||0;var max=Math.max(1,Number(props.maxSize)||1);var gauge=make("div","gauge");var fill=make("div","gauge-fill");fill.style.width=Math.max(0,Math.min(100,current/max*100))+"%";gauge.appendChild(fill);target.appendChild(gauge);target.appendChild(make("div","status",current+" / "+max));return target;}return make("div","empty","Unsupported component");}
function reportSize(){notify("ui/notifications/size-changed",{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight});}
function render(payload){if(!payload||!payload.root)return;var app=document.getElementById("app");app.replaceChildren();var header=make("div","snapshot");header.appendChild(make("strong","","FreeClimb snapshot"));header.appendChild(make("span","",new Date(payload.snapshotAt).toLocaleString()));app.appendChild(header);if(payload.errors&&payload.errors.length){var errors=make("div","errors");payload.errors.forEach(function(error){errors.appendChild(make("div","error",error.message));});app.appendChild(errors);}app.appendChild(renderNode(payload.root));reportSize();}
window.addEventListener("message",function(event){var msg=event.data;if(!msg||msg.jsonrpc!=="2.0")return;if(msg.id!=null&&pending[msg.id]){var p=pending[msg.id];delete pending[msg.id];if(msg.error)p.reject(new Error(msg.error.message));else p.resolve(msg.result);return;}if(msg.method==="ui/notifications/tool-result"){var sc=msg.params&&msg.params.structuredContent;if(sc&&sc.dashboard)render(sc.dashboard);}});
(function(){var announced=false;function announce(){if(announced)return;announced=true;notify("ui/notifications/initialized",{});}request("ui/initialize",{appInfo:{name:"freeclimb-dashboard",version:"1.0.0"},appCapabilities:{availableDisplayModes:["inline"]},protocolVersion:"2025-06-18"}).then(announce).catch(announce);setTimeout(announce,800);})();
</script>
</body>
</html>`
