import { decodeContent, githubJson, parseSpec } from "./check-sdk-drift.mjs"
import { canonicalSpecSdk, loadDocsIndex } from "./sdk-matrix.mjs"

export { loadDocsIndex }

export function perclCommandsFromSpec(spec) {
    const mapping = spec?.components?.schemas?.PerclCommand?.discriminator?.mapping ?? {}
    return [...new Set(Object.keys(mapping))].sort()
}

export function parseLlmsPages(text) {
    const pages = new Set()
    const pattern = /\]\((https:\/\/docs\.freeclimb\.com\/[^)\s]+)\)/g
    let match
    while ((match = pattern.exec(text)) !== null) {
        const url = match[1]
        if (/^https:\/\/docs\.freeclimb\.com\/changelog\//.test(url)) continue
        pages.add(url)
    }
    return [...pages].sort()
}

export async function fetchCanonicalSpec() {
    const sdk = canonicalSpecSdk()
    const repository = await githubJson(`/repos/${sdk.repository}`)
    const branch = repository.default_branch
    const source = await githubJson(
        `/repos/${sdk.repository}/contents/${sdk.openapiPath}?ref=${encodeURIComponent(branch)}`,
    )
    return parseSpec(sdk.openapiPath, decodeContent(source.content))
}

export async function fetchLlms(url) {
    const response = await fetch(url, { headers: { "User-Agent": "freeclimb-plugin-docs-drift" } })
    if (!response.ok) throw new Error(`Docs index ${url} returned ${response.status}`)
    return response.text()
}

export async function buildLiveCatalog(index = loadDocsIndex()) {
    const [llmsText, spec] = await Promise.all([fetchLlms(index.llmsUrl), fetchCanonicalSpec()])
    return {
        pages: parseLlmsPages(llmsText),
        percl: perclCommandsFromSpec(spec),
    }
}

function diff(current, baseline) {
    const known = new Set(baseline)
    const live = new Set(current)
    return {
        added: current.filter((item) => !known.has(item)),
        removed: baseline.filter((item) => !live.has(item)),
    }
}

export function computeDocsDrift({ catalog, baseline }) {
    const pages = diff(catalog.pages, baseline.pages ?? [])
    const percl = diff(catalog.percl, baseline.percl ?? [])
    const docsDrift =
        pages.added.length > 0 ||
        pages.removed.length > 0 ||
        percl.added.length > 0 ||
        percl.removed.length > 0
    return {
        pagesAdded: pages.added,
        pagesRemoved: pages.removed,
        perclAdded: percl.added,
        perclRemoved: percl.removed,
        docsDrift,
    }
}
