import { writeFileSync } from "node:fs"
import { buildLiveCatalog, computeDocsDrift, loadDocsIndex } from "./docs-catalog.mjs"

function listOrNone(items) {
    return items.length > 0 ? items.join(", ") : "none"
}

function markdownReport(report) {
    return [
        "# FreeClimb docs reference drift report",
        "",
        `Checked at: ${report.checkedAt}`,
        `Docs drift: ${report.docsDrift ? "yes" : "no"}`,
        "",
        `Canonical docs index: ${report.llmsUrl}`,
        `Hosted docs MCP (read-only): ${report.hostedMcpUrl}`,
        "",
        "Pages and PerCL commands are compared against the pinned baseline in `sdk/docs-index.json`.",
        "When drift is real, refresh the baseline and update any affected guardrail skills in `cli/skills/platform/`.",
        "",
        "## Documentation pages",
        `- Added: ${listOrNone(report.pagesAdded)}`,
        `- Removed: ${listOrNone(report.pagesRemoved)}`,
        "",
        "## PerCL commands",
        `- Added: ${listOrNone(report.perclAdded)}`,
        `- Removed: ${listOrNone(report.perclRemoved)}`,
        "",
    ].join("\n").concat("\n")
}

export async function createDocsDriftReport() {
    const index = loadDocsIndex()
    const catalog = await buildLiveCatalog(index)
    const result = computeDocsDrift({ catalog, baseline: index.baseline })
    return {
        checkedAt: new Date().toISOString(),
        llmsUrl: index.llmsUrl,
        hostedMcpUrl: index.hostedMcpUrl,
        pageCount: catalog.pages.length,
        perclCount: catalog.percl.length,
        ...result,
    }
}

async function main() {
    const outputIndex = process.argv.indexOf("--output")
    const markdownIndex = process.argv.indexOf("--markdown")
    const report = await createDocsDriftReport()
    const json = `${JSON.stringify(report, null, 2)}\n`
    if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
        writeFileSync(process.argv[outputIndex + 1], json)
    } else {
        process.stdout.write(json)
    }
    if (markdownIndex >= 0 && process.argv[markdownIndex + 1]) {
        writeFileSync(process.argv[markdownIndex + 1], markdownReport(report))
    }
    if (process.env.GITHUB_OUTPUT) {
        writeFileSync(process.env.GITHUB_OUTPUT, `docs_drift=${report.docsDrift}\n`, { flag: "a" })
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
        process.exit(1)
    })
}
