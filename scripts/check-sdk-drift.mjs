import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { parse as parseYaml } from "yaml"
import { loadContentIndex, loadSdkMatrix, readTemplateVersion } from "./sdk-matrix.mjs"

const token = process.env.GITHUB_TOKEN
const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freeclimb-plugin-sdk-drift",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
}

function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize)
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, normalize(value[key])]),
        )
    }
    return value
}

export function semanticHash(document) {
    return createHash("sha256").update(JSON.stringify(normalize(document))).digest("hex")
}

function expandSchemaReferences(value, schemas, stack = []) {
    if (Array.isArray(value)) return value.map((item) => expandSchemaReferences(item, schemas, stack))
    if (!value || typeof value !== "object") return value

    const reference = value.$ref
    if (typeof reference === "string" && reference.startsWith("#/components/schemas/")) {
        const name = reference.slice("#/components/schemas/".length)
        if (stack.includes(name)) return { $ref: `#cycle/${name}` }
        const schema = schemas[name]
        if (schema) {
            const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref"))
            return expandSchemaReferences({ ...schema, ...siblings }, schemas, [...stack, name])
        }
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            expandSchemaReferences(item, schemas, stack),
        ]),
    )
}

function stripOpenApiAnnotations(value) {
    if (Array.isArray(value)) return value.map(stripOpenApiAnnotations)
    if (!value || typeof value !== "object") return value
    const ignored = new Set(["description", "summary", "title", "example", "examples", "externalDocs"])
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !ignored.has(key))
            .map(([key, item]) => [key, stripOpenApiAnnotations(item)]),
    )
}

export function openApiSemanticHash(spec) {
    const schemas = spec.components?.schemas ?? {}
    return semanticHash({
        openapi: spec.openapi,
        apiVersion: spec.info?.version,
        paths: stripOpenApiAnnotations(expandSchemaReferences(spec.paths ?? {}, schemas)),
    })
}

export async function githubJson(path) {
    const response = await fetch(`https://api.github.com${path}`, { headers })
    if (!response.ok) throw new Error(`GitHub ${path} returned ${response.status}`)
    return response.json()
}

export function decodeContent(content) {
    return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8")
}

export function stripTag(tag, prefix) {
    const withoutPrefix = prefix && tag.startsWith(prefix) ? tag.slice(prefix.length) : tag
    return withoutPrefix.replace(/^\./, "")
}

export function repositoryFromUrl(repositoryUrl) {
    return new URL(repositoryUrl).pathname.replace(/^\//, "")
}

export function parseSpec(path, content) {
    return path.endsWith(".json") ? JSON.parse(content) : parseYaml(content)
}

async function inspectSdk(sdk) {
    const repository = await githubJson(`/repos/${sdk.repository}`)
    const branch = repository.default_branch
    const [release, ref, source] = await Promise.all([
        githubJson(`/repos/${sdk.repository}/releases/latest`),
        githubJson(`/repos/${sdk.repository}/git/ref/heads/${branch}`),
        githubJson(`/repos/${sdk.repository}/contents/${sdk.openapiPath}?ref=${encodeURIComponent(branch)}`),
    ])
    const spec = parseSpec(sdk.openapiPath, decodeContent(source.content))
    const testedVersion = readTemplateVersion(sdk)
    const latestVersion = stripTag(release.tag_name, sdk.releaseTagPrefix)
    return {
        id: sdk.id,
        language: sdk.language,
        repository: sdk.repository,
        testedVersion,
        latestVersion,
        releaseUrl: release.html_url,
        branch,
        commitSha: ref.object.sha,
        sourceSha: source.sha,
        openapiPath: sdk.openapiPath,
        openapiVersion: spec.openapi,
        apiVersion: spec.info?.version,
        pathCount: Object.keys(spec.paths ?? {}).length,
        schemaCount: Object.keys(spec.components?.schemas ?? {}).length,
        semanticHash: openApiSemanticHash(spec),
        releaseDrift: testedVersion !== latestVersion,
    }
}

async function inspectContentSource(source) {
    const repository = repositoryFromUrl(source.repositoryUrl)
    const encodedPath = source.path.split("/").map(encodeURIComponent).join("/")
    const [latestCommit, pinnedSource] = await Promise.all([
        githubJson(`/repos/${repository}/commits/HEAD`),
        githubJson(
            `/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(source.revision)}`,
        ),
    ])
    return {
        ...source,
        repository,
        currentRevision: latestCommit.sha,
        sourceSha: pinnedSource.sha,
        revisionDrift: latestCommit.sha !== source.revision,
    }
}

function markdownReport(report) {
    const lines = [
        "# FreeClimb SDK drift report",
        "",
        `Release drift: ${report.releaseDrift ? "yes" : "no"}`,
        `OpenAPI divergence from canonical (${report.canonicalSpecSdk}): ${report.specDrift ? "yes" : "no"}`,
        `Indexed content drift: ${report.contentDrift ? "yes" : "no"}`,
        "",
    ]
    for (const sdk of report.sdks) {
        lines.push(
            `## ${sdk.language}${sdk.canonical ? " (canonical spec)" : ""}`,
            "",
            `- Repository: ${sdk.repository}`,
            `- Tested release: ${sdk.testedVersion}`,
            `- Latest release: ${sdk.latestVersion}`,
            `- Default branch commit: ${sdk.commitSha}`,
            `- OpenAPI source: ${sdk.openapiPath}`,
            `- OpenAPI hash: ${sdk.semanticHash}`,
            `- Diverges from canonical: ${sdk.specDivergesFromCanonical ? "yes" : "no"}`,
            `- Paths: ${sdk.pathCount}`,
            `- Schemas: ${sdk.schemaCount}`,
            "",
        )
    }
    lines.push("# Indexed quickstarts and tutorials", "")
    for (const source of report.contentSources) {
        lines.push(
            `## ${source.title}`,
            "",
            `- Kind: ${source.kind}`,
            `- Language: ${source.language}`,
            `- Use case: ${source.useCase}`,
            `- Repository: ${source.repository}`,
            `- Source path: ${source.path}`,
            `- Pinned revision: ${source.revision}`,
            `- Current revision: ${source.currentRevision}`,
            `- Revision drift: ${source.revisionDrift ? "yes" : "no"}`,
            "",
        )
    }
    return `${lines.join("\n")}\n`
}

export async function createDriftReport() {
    const matrix = loadSdkMatrix()
    const contentIndex = loadContentIndex()
    const [sdks, contentSources] = await Promise.all([
        Promise.all(matrix.sdks.map(inspectSdk)),
        Promise.all(contentIndex.sources.map(inspectContentSource)),
    ])
    const canonicalId = matrix.canonicalSpec?.sdkId
    const canonical = sdks.find((sdk) => sdk.id === canonicalId)
    const canonicalHash = canonical?.semanticHash
    for (const sdk of sdks) {
        sdk.canonical = sdk.id === canonicalId
        sdk.specDivergesFromCanonical = sdk.semanticHash !== canonicalHash
    }
    return {
        checkedAt: new Date().toISOString(),
        canonicalSpecSdk: canonicalId,
        releaseDrift: sdks.some((sdk) => sdk.releaseDrift),
        specDrift: sdks.some((sdk) => sdk.specDivergesFromCanonical),
        contentDrift: contentSources.some((source) => source.revisionDrift),
        sdks,
        contentSources,
    }
}

async function main() {
    const outputIndex = process.argv.indexOf("--output")
    const markdownIndex = process.argv.indexOf("--markdown")
    const report = await createDriftReport()
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
        writeFileSync(
            process.env.GITHUB_OUTPUT,
            `release_drift=${report.releaseDrift}\nspec_drift=${report.specDrift}\ncontent_drift=${report.contentDrift}\n`,
            { flag: "a" },
        )
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
        process.exit(1)
    })
}
