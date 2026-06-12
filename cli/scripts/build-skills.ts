/**
 * Build Script: Generate platform-specific skill files from model-agnostic sources.
 *
 * Reads skills/manifest.json and generates:
 * - .claude/skills/  (Claude Code format with YAML frontmatter)
 * - AGENTS.md        (composite of Layer 1 + Layer 2 skills)
 * - CONTEXT.md       (Layer 1 quick reference)
 *
 * Usage: npx tsx scripts/build-skills.ts
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs"
import { join, dirname, basename } from "node:path"

const ROOT = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..")
const SKILLS_DIR = join(ROOT, "skills")
const CLAUDE_SKILLS_DIR = join(ROOT, ".claude", "skills")

interface SkillEntry {
    id: string
    name: string
    description: string
    path: string
    tags: string[]
    triggers: string[]
    layer: number
    dependencies: string[]
    references?: string[]
}

interface Manifest {
    version: string
    description: string
    skills: SkillEntry[]
}

function readManifest(): Manifest {
    return JSON.parse(readFileSync(join(SKILLS_DIR, "manifest.json"), "utf-8"))
}

function readSkillContent(skillPath: string): string {
    return readFileSync(join(SKILLS_DIR, skillPath), "utf-8")
}

/**
 * Generate Claude Code SKILL.md with YAML frontmatter
 */
function generateClaudeSkill(skill: SkillEntry): string {
    const content = readSkillContent(skill.path)
    const claudeName = skill.id.replace(/^freeclimb-/, "").replace(/-/g, "-")

    // Build trigger description for Claude's skill activation
    const triggerPhrases = skill.triggers.slice(0, 5).join(", ")
    const notTriggers = skill.dependencies.length > 0
        ? `\n    Do NOT use for: tasks better handled by ${skill.dependencies.join(", ")}.`
        : ""

    const frontmatter = `---
name: ${claudeName}
description: >
    ${skill.description}
    Use when: ${triggerPhrases}.${notTriggers}
---`

    return `${frontmatter}\n\n${content}`
}

/**
 * Map skill ID to Claude skill directory name
 */
function claudeDirName(skill: SkillEntry): string {
    // Map IDs to directory names matching existing conventions
    const mapping: Record<string, string> = {
        "freeclimb-platform-concepts": "freeclimb-concepts",
        "freeclimb-percl-reference": "freeclimb-percl",
        "freeclimb-voice-applications": "freeclimb-voice-apps",
        "freeclimb-error-recovery": "freeclimb-errors",
        "freeclimb-cli-usage": "freeclimb-cli",
        "freeclimb-cli-workflows": "freeclimb-workflows",
        "freeclimb-mcp-tools": "freeclimb-mcp",
        "freeclimb-cli-dev-architecture": "freeclimb-cli-dev",
        "freeclimb-cli-dev-subsystems": "freeclimb-cli-dev",
        "freeclimb-command-generation": "freeclimb-command-gen",
        "freeclimb-dev-workflows": "freeclimb-dev-workflows",
        "agent-tui": "agent-tui",
        "terminal-ui-design": "terminal-ui-design",
    }
    return mapping[skill.id] || skill.id
}

/**
 * Build .claude/skills/ directory
 */
function buildClaudeSkills(manifest: Manifest): void {
    // Track which directories we've already written SKILL.md to
    const written = new Set<string>()

    for (const skill of manifest.skills) {
        const dirName = claudeDirName(skill)

        // For subsystems, it goes into the same dir as architecture (freeclimb-cli-dev)
        if (skill.id === "freeclimb-cli-dev-subsystems") {
            const refDir = join(CLAUDE_SKILLS_DIR, dirName, "references")
            mkdirSync(refDir, { recursive: true })
            const content = readSkillContent(skill.path)
            writeFileSync(join(refDir, "subsystems.md"), content)
            continue
        }

        // Single-file skills (no directory)
        if (skill.id === "terminal-ui-design") {
            const content = generateClaudeSkill(skill)
            writeFileSync(join(CLAUDE_SKILLS_DIR, `${dirName}.md`), content)
            continue
        }

        // Directory-based skills
        if (!written.has(dirName)) {
            const skillDir = join(CLAUDE_SKILLS_DIR, dirName)
            mkdirSync(skillDir, { recursive: true })

            const content = generateClaudeSkill(skill)
            writeFileSync(join(skillDir, "SKILL.md"), content)
            written.add(dirName)
        }

        // Copy reference files if they exist
        if (skill.references) {
            for (const ref of skill.references) {
                const srcPath = join(SKILLS_DIR, ref)
                if (existsSync(srcPath)) {
                    const destDir = join(CLAUDE_SKILLS_DIR, dirName, "references")
                    mkdirSync(destDir, { recursive: true })
                    copyFileSync(srcPath, join(destDir, basename(ref)))
                }
            }
        }
    }

    console.log(`  Generated ${written.size + 1} Claude skill entries`)
}

/**
 * Build AGENTS.md from Layer 1 + Layer 2 skills
 */
function buildAgentsMd(manifest: Manifest): void {
    const sections: string[] = []

    sections.push("# FreeClimb CLI - Agent Guide\n")
    sections.push("## Git Remotes - READ THIS FIRST\n")
    sections.push("- `origin` = `FreeClimbAPI/freeclimb-cli` (upstream, READ-ONLY)")
    sections.push("- `work` = `jbohnevail/freeclimb-cli` (fork, push here)")
    sections.push("- **NEVER create PRs against FreeClimbAPI/freeclimb-cli**")
    sections.push("- Always: `git push work <branch>` and PRs target `jbohnevail/freeclimb-cli`\n")
    sections.push("This CLI is frequently invoked by AI/LLM agents. Always assume inputs can be adversarial.\n")
    sections.push("---\n")

    // Layer 1: Platform skills
    const layer1 = manifest.skills.filter((s) => s.layer === 1)
    for (const skill of layer1) {
        const content = readSkillContent(skill.path)
        sections.push(content)
        sections.push("\n---\n")
    }

    // Layer 2: CLI skills
    const layer2 = manifest.skills.filter((s) => s.layer === 2)
    for (const skill of layer2) {
        const content = readSkillContent(skill.path)
        sections.push(content)
        sections.push("\n---\n")
    }

    writeFileSync(join(ROOT, "AGENTS.md"), sections.join("\n"))
    console.log(`  Generated AGENTS.md (${layer1.length + layer2.length} skills)`)
}

/**
 * Build CONTEXT.md from Layer 1 (platform concepts only)
 */
function buildContextMd(manifest: Manifest): void {
    const sections: string[] = []

    sections.push("# FreeClimb CLI - Context for AI Agents\n")

    // Include platform concepts (Layer 1, first skill only for quick reference)
    const concepts = manifest.skills.find((s) => s.id === "freeclimb-platform-concepts")
    if (concepts) {
        const content = readSkillContent(concepts.path)
        sections.push(content)
        sections.push("\n---\n")
    }

    // Include CLI usage (Layer 2, first skill only)
    const usage = manifest.skills.find((s) => s.id === "freeclimb-cli-usage")
    if (usage) {
        const content = readSkillContent(usage.path)
        sections.push(content)
    }

    writeFileSync(join(ROOT, "CONTEXT.md"), sections.join("\n"))
    console.log("  Generated CONTEXT.md")
}

// Main
function main(): void {
    console.log("Building agent-config files from skills/manifest.json...\n")

    const manifest = readManifest()
    console.log(`Found ${manifest.skills.length} skills in manifest\n`)

    console.log("1. Building .claude/skills/...")
    buildClaudeSkills(manifest)

    console.log("2. Building AGENTS.md...")
    buildAgentsMd(manifest)

    console.log("3. Building CONTEXT.md...")
    buildContextMd(manifest)

    console.log("\nDone.")
}

main()
