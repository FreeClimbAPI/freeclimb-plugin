import { existsSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const expectedIds = new Set(["node", "python", "java", "dotnet", "ruby", "php"])
const exactVersion = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/
const githubRepositoryUrl = /^https:\/\/github\.com\/FreeClimbAPI\/[0-9A-Za-z._-]+$/
const commitRevision = /^[0-9a-f]{40}$/

export function loadSdkMatrix() {
    return JSON.parse(readFileSync(join(root, "sdk/sdk-matrix.json"), "utf8"))
}

export function loadContentIndex() {
    return JSON.parse(readFileSync(join(root, "sdk/content-index.json"), "utf8"))
}

export function loadDocsIndex() {
    return JSON.parse(readFileSync(join(root, "sdk/docs-index.json"), "utf8"))
}

export function canonicalSpecSdk() {
    const matrix = loadSdkMatrix()
    const sdkId = matrix.canonicalSpec?.sdkId
    const sdk = matrix.sdks.find((entry) => entry.id === sdkId)
    if (!sdk) throw new Error(`sdk-matrix canonicalSpec.sdkId does not reference a known SDK: ${sdkId}`)
    return sdk
}

function isSafeRelativePath(path) {
    return typeof path === "string" && path.length > 0 && !isAbsolute(path) && !normalize(path).startsWith("..")
}

function extractMavenVersion(content, packageName) {
    const [groupId, artifactId] = packageName.split(":")
    const dependencies = content.match(/<dependency>[\s\S]*?<\/dependency>/g) ?? []
    const dependency = dependencies.find(
        (entry) =>
            entry.includes(`<groupId>${groupId}</groupId>`) &&
            entry.includes(`<artifactId>${artifactId}</artifactId>`),
    )
    return dependency?.match(/<version>([^<]+)<\/version>/)?.[1]
}

export function readTemplateVersion(sdk) {
    const manifestPath = join(root, sdk.template, sdk.manifest)
    const content = readFileSync(manifestPath, "utf8")

    if (sdk.packageManager === "npm") {
        const manifest = JSON.parse(content)
        return manifest.dependencies?.[sdk.packageName]
    }
    if (sdk.packageManager === "pip") {
        return content.match(new RegExp(`^${sdk.packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}==([^\\s]+)$`, "m"))?.[1]
    }
    if (sdk.packageManager === "maven") {
        const version = extractMavenVersion(content, sdk.packageName)
        return sdk.releaseTagPrefix && version?.startsWith(sdk.releaseTagPrefix)
            ? version.slice(sdk.releaseTagPrefix.length)
            : version
    }
    if (sdk.packageManager === "nuget") {
        const escapedName = sdk.packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const version = content.match(
            new RegExp(`<PackageReference\\s+Include="${escapedName}"\\s+Version="([^"]+)"`),
        )?.[1]
        return version?.match(/^\[([^,\]]+)\]$/)?.[1] ?? version
    }
    if (sdk.packageManager === "bundler") {
        const escapedName = sdk.packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        return content.match(new RegExp(`gem\\s+["']${escapedName}["']\\s*,\\s*["']([^"']+)["']`))?.[1]
    }
    if (sdk.packageManager === "composer") {
        const manifest = JSON.parse(content)
        return manifest.require?.[sdk.packageName]
    }
    return undefined
}

export function validateSdkMatrix() {
    const matrix = loadSdkMatrix()
    const errors = []
    const ids = new Set()
    const repositories = new Set()
    const sdkSkill = readFileSync(join(root, "skills/freeclimb-sdks/SKILL.md"), "utf8")
    const ciWorkflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8")

    if (matrix.version !== 1 || !Array.isArray(matrix.sdks)) {
        return ["sdk/sdk-matrix.json must contain version 1 and an sdks array"]
    }
    if (!isSafeRelativePath(matrix.contractFixture) || !existsSync(join(root, matrix.contractFixture))) {
        errors.push("sdk/sdk-matrix.json must reference an existing safe contractFixture")
    }
    if (!matrix.canonicalSpec || typeof matrix.canonicalSpec.sdkId !== "string") {
        errors.push("sdk/sdk-matrix.json must declare canonicalSpec.sdkId")
    } else if (!matrix.sdks.some((sdk) => sdk.id === matrix.canonicalSpec.sdkId)) {
        errors.push("sdk/sdk-matrix.json canonicalSpec.sdkId must reference a defined SDK")
    }

    for (const sdk of matrix.sdks) {
        for (const field of [
            "id",
            "language",
            "repository",
            "packageManager",
            "packageName",
            "template",
            "reference",
            "manifest",
            "releaseTagPrefix",
            "openapiPath",
        ]) {
            if (typeof sdk[field] !== "string") errors.push(`${sdk.id ?? "unknown"} is missing string field ${field}`)
        }

        if (ids.has(sdk.id)) errors.push(`Duplicate SDK id: ${sdk.id}`)
        if (repositories.has(sdk.repository)) errors.push(`Duplicate SDK repository: ${sdk.repository}`)
        ids.add(sdk.id)
        repositories.add(sdk.repository)

        for (const path of [
            sdk.template,
            sdk.reference,
            sdk.manifest,
            sdk.lockfile,
            sdk.openapiPath,
        ].filter(Boolean)) {
            if (!isSafeRelativePath(path)) errors.push(`${sdk.id} contains unsafe path: ${path}`)
        }

        const templatePath = join(root, sdk.template)
        const manifestPath = join(templatePath, sdk.manifest)
        const referencePath = join(root, sdk.reference)
        if (!existsSync(templatePath)) errors.push(`${sdk.id} template does not exist: ${sdk.template}`)
        if (!existsSync(manifestPath)) errors.push(`${sdk.id} manifest does not exist: ${sdk.template}/${sdk.manifest}`)
        if (!existsSync(referencePath)) errors.push(`${sdk.id} reference does not exist: ${sdk.reference}`)
        if (sdk.lockfile && !existsSync(join(templatePath, sdk.lockfile))) {
            errors.push(`${sdk.id} lockfile does not exist: ${sdk.template}/${sdk.lockfile}`)
        }
        for (const requiredFile of ["README.md", ".env.example"]) {
            if (!existsSync(join(templatePath, requiredFile))) {
                errors.push(`${sdk.id} template is missing ${requiredFile}`)
            }
        }
        if (!sdkSkill.includes(sdk.reference.replace("skills/freeclimb-sdks/", ""))) {
            errors.push(`${sdk.id} reference is missing from skills/freeclimb-sdks/SKILL.md`)
        }
        if (existsSync(referencePath)) {
            const reference = readFileSync(referencePath, "utf8")
            if (
                !reference.includes(sdk.packageName) ||
                !reference.includes(sdk.repository) ||
                !reference.includes(sdk.template)
            ) {
                errors.push(`${sdk.id} reference does not match its SDK catalog entry`)
            }
        }
        if (!ciWorkflow.includes(`sdk: ${sdk.id}`) || !ciWorkflow.includes(`directory: ${sdk.template}`)) {
            errors.push(`${sdk.id} is missing from the SDK template CI matrix`)
        }

        if (existsSync(manifestPath)) {
            const version = readTemplateVersion(sdk)
            if (!version) {
                errors.push(`${sdk.id} manifest does not declare ${sdk.packageName}`)
            } else if (!exactVersion.test(version)) {
                errors.push(`${sdk.id} SDK version must be exact, got: ${version}`)
            }
        }
    }

    for (const id of expectedIds) {
        if (!ids.has(id)) errors.push(`Missing SDK catalog entry: ${id}`)
    }
    for (const id of ids) {
        if (!expectedIds.has(id)) errors.push(`Unexpected SDK catalog entry: ${id}`)
    }

    return errors
}

export function validateContentIndex() {
    const index = loadContentIndex()
    const errors = []
    const ids = new Set()
    const repositoryUrls = new Set()
    const quickstartLanguages = new Set()
    const sdkSkill = readFileSync(join(root, "skills/freeclimb-sdks/SKILL.md"), "utf8")

    if (index.version !== 1 || !Array.isArray(index.sources)) {
        return ["sdk/content-index.json must contain version 1 and a sources array"]
    }

    for (const source of index.sources) {
        for (const field of [
            "id",
            "kind",
            "title",
            "useCase",
            "language",
            "repositoryUrl",
            "path",
            "revision",
        ]) {
            if (typeof source[field] !== "string" || source[field].length === 0) {
                errors.push(`${source.id ?? "unknown"} is missing string field ${field}`)
            }
        }

        if (ids.has(source.id)) errors.push(`Duplicate content source id: ${source.id}`)
        if (repositoryUrls.has(source.repositoryUrl)) {
            errors.push(`Duplicate content repository URL: ${source.repositoryUrl}`)
        }
        ids.add(source.id)
        repositoryUrls.add(source.repositoryUrl)

        if (!["quickstart", "tutorial"].includes(source.kind)) {
            errors.push(`${source.id} has unsupported content kind: ${source.kind}`)
        }
        if (!expectedIds.has(source.language)) {
            errors.push(`${source.id} has unsupported language: ${source.language}`)
        }
        if (!githubRepositoryUrl.test(source.repositoryUrl)) {
            errors.push(`${source.id} must use a canonical FreeClimbAPI GitHub repository URL`)
        }
        if (!isSafeRelativePath(source.path)) {
            errors.push(`${source.id} contains unsafe source path: ${source.path}`)
        }
        if (!commitRevision.test(source.revision)) {
            errors.push(`${source.id} must pin a full lowercase Git commit revision`)
        }
        if (source.kind === "quickstart") quickstartLanguages.add(source.language)
    }

    for (const id of expectedIds) {
        if (!quickstartLanguages.has(id)) errors.push(`Missing indexed quickstart for SDK: ${id}`)
    }
    if (!index.sources.some((source) => source.kind === "tutorial")) {
        errors.push("sdk/content-index.json must include at least one tutorial")
    }
    if (!sdkSkill.includes("sdk/content-index.json")) {
        errors.push("skills/freeclimb-sdks/SKILL.md must document sdk/content-index.json")
    }

    return errors
}

export function validateDocsIndex() {
    const index = loadDocsIndex()
    const errors = []

    if (index.version !== 1) {
        return ["sdk/docs-index.json must contain version 1"]
    }

    if (
        typeof index.llmsUrl !== "string" ||
        !/^https:\/\/docs\.freeclimb\.com\/llms\.txt$/.test(index.llmsUrl)
    ) {
        errors.push("sdk/docs-index.json llmsUrl must be https://docs.freeclimb.com/llms.txt")
    }

    if (
        typeof index.hostedMcpUrl !== "string" ||
        !/^https:\/\/docs\.freeclimb\.com\/mcp$/.test(index.hostedMcpUrl)
    ) {
        errors.push("sdk/docs-index.json hostedMcpUrl must be https://docs.freeclimb.com/mcp")
    }

    const baseline = index.baseline
    if (!baseline || typeof baseline !== "object") {
        errors.push("sdk/docs-index.json must contain a baseline object")
        return errors
    }

    if (
        !Array.isArray(baseline.pages) ||
        baseline.pages.length === 0 ||
        baseline.pages.some((page) => typeof page !== "string" || !page.startsWith("https://docs.freeclimb.com/"))
    ) {
        errors.push("sdk/docs-index.json baseline.pages must be a non-empty array of docs.freeclimb.com URLs")
    }

    if (
        !Array.isArray(baseline.percl) ||
        baseline.percl.length === 0 ||
        baseline.percl.some((command) => typeof command !== "string")
    ) {
        errors.push("sdk/docs-index.json baseline.percl must be a non-empty string array")
    }

    return errors
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const errors = [...validateSdkMatrix(), ...validateContentIndex(), ...validateDocsIndex()]
    if (errors.length > 0) {
        process.stderr.write(`${errors.join("\n")}\n`)
        process.exit(1)
    }
    process.stdout.write("SDK and content catalog validation passed.\n")
}
