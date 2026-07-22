import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { getAccount, listIncomingNumbers, listApplications } from "@freeclimb/core"

const currentDir = dirname(fileURLToPath(import.meta.url))

function resolveSkillsDir(): string {
    const candidates = [
        process.env.FREECLIMB_MCP_SKILLS_DIR,
        join(currentDir, "../../cli/skills"),
        join(currentDir, "../../skills"),
    ].filter((c): c is string => Boolean(c))
    for (const candidate of candidates) {
        if (existsSync(join(candidate, "manifest.json"))) return candidate
    }
    return candidates[candidates.length - 1] ?? join(currentDir, "../../skills")
}

const SKILLS_DIR = resolveSkillsDir()
const PLUGIN_SKILLS_DIR = join(currentDir, "../../skills")

interface SkillManifestEntry {
    description: string
    id: string
    name: string
    path: string
    source?: "plugin-skill"
}

function resolveSkillPath(skill: SkillManifestEntry): string {
    if (skill.source === "plugin-skill") {
        return join(PLUGIN_SKILLS_DIR, skill.path, "SKILL.md")
    }
    return join(SKILLS_DIR, skill.path)
}

export interface SkillResource {
    description: string
    name: string
    path: string
    uri: string
}

export function discoverSkillResources(): SkillResource[] {
    const resources: SkillResource[] = []

    if (!existsSync(SKILLS_DIR)) return resources

    try {
        const manifest = JSON.parse(readFileSync(join(SKILLS_DIR, "manifest.json"), "utf-8"))
        for (const skill of manifest.skills as SkillManifestEntry[]) {
            const filePath = resolveSkillPath(skill)
            if (existsSync(filePath)) {
                resources.push({
                    uri: `freeclimb://skills/${skill.id}`,
                    name: skill.name,
                    description: skill.description,
                    path: filePath,
                })
            }
        }
    } catch {
        return resources
    }

    return resources
}

export interface ResourceDescriptor {
    description: string
    mimeType: string
    name: string
    uri: string
}

export function listFreeclimbResources(): ResourceDescriptor[] {
    const apiResources: ResourceDescriptor[] = [
        {
            uri: "freeclimb://account",
            name: "Account Info",
            description: "Current FreeClimb account information and status",
            mimeType: "application/json",
        },
        {
            uri: "freeclimb://numbers",
            name: "Phone Numbers",
            description: "All phone numbers owned by this account",
            mimeType: "application/json",
        },
        {
            uri: "freeclimb://applications",
            name: "Applications",
            description: "All applications configured in this account",
            mimeType: "application/json",
        },
    ]

    const skillResources = discoverSkillResources().map((s) => ({
        uri: s.uri,
        name: s.name,
        description: s.description,
        mimeType: "text/markdown",
    }))

    return [...apiResources, ...skillResources]
}

export interface ResourceContent {
    mimeType: string
    text: string
    uri: string
}

export async function readFreeclimbResource(uri: string): Promise<ResourceContent> {
    if (uri.startsWith("freeclimb://skills/")) {
        const skillResources = discoverSkillResources()
        const skill = skillResources.find((s) => s.uri === uri)
        if (!skill) {
            throw new Error(`Unknown skill resource: ${uri}`)
        }
        const content = readFileSync(skill.path, "utf-8")
        return { uri, mimeType: "text/markdown", text: content }
    }

    let data: unknown

    switch (uri) {
        case "freeclimb://account": {
            data = await getAccount()
            break
        }
        case "freeclimb://numbers": {
            data = await listIncomingNumbers()
            break
        }
        case "freeclimb://applications": {
            data = await listApplications()
            break
        }
        default: {
            throw new Error(`Unknown resource: ${uri}`)
        }
    }

    return { uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }
}
