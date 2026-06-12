import { expect } from "chai"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import mapChars from "../../generation/commands/character-mapping.js"

const testDir = dirname(fileURLToPath(import.meta.url))
const apiInfo = JSON.parse(readFileSync(join(testDir, "../../generation/schema/generated-api-schema.json"), "utf-8"))
const localFlags = JSON.parse(readFileSync(join(testDir, "./test-local-flags.json"), "utf-8"))
const testingJson = JSON.parse(readFileSync(join(testDir, "./character-mapping-test.json"), "utf-8"))

describe("Tests the character-mapping", function () {
    const testedMap = mapChars(testingJson, localFlags)
    const charMap = new Map()
    charMap.set("variableOne", "v")
    charMap.set("variableTwo", "V")
    charMap.set("alias", "a")
    charMap.set("test", "t")
    charMap.set("allVariable", "A")
    charMap.set("variableThree", "t")
    charMap.set("variableTest", "T")
    charMap.set("4Lower", "l")
    charMap.set("rut", "r")
    charMap.set("race", "R")
    charMap.set("ru", "U")
    charMap.set("urn", "u")
    charMap.set("new", "n")
    charMap.set("nice", "N")
    charMap.set("run", "b")
    charMap.set("another", "A")
    Object.keys(localFlags).forEach((key: string) => charMap.set(key, localFlags[key].char))

    const hasDuplicates = (map: Map<string, string>, schema: any[]) => {
        const flags: Array<Array<string>> = separateCommandFlags(schema)
        const usedChars: Map<string, Array<string>> = new Map()
        for (const [key, val] of map) {
            if (usedChars !== undefined && usedChars.has(val)) {
                const arrayForChar: Array<string> = usedChars.get(val) || []
                if (
                    arrayForChar.some((flagWithVal) => {
                        return flags.some((command) => {
                            if (command.includes(flagWithVal) && command.includes(key)) {
                                return true
                            }
                            return false
                        })
                    })
                ) {
                    return true
                }
                arrayForChar.push(key)
            } else {
                usedChars.set(val, [key])
            }
        }
        return false
    }

    const separateCommandFlags = (apiSchema: any) =>
        apiSchema
            .map((topic: { commands: any }) => topic.commands)
            .flat(1)
            .map((command: { params: { name: string; required: string }[] }) =>
                command.params
                    .filter((param: { required: string }) => accessSpecifier(param) === "flags")
                    .map((param: { name: string }) => param.name)
            )
    it("Adds all characters", () => {
        expect(testedMap).to.length(16 + Object.keys(localFlags).length)
    })
    it("Correctly assigns characters", () => {
        for (const [key, val] of charMap) {
            expect(testedMap.get(key)).to.equal(val)
        }
    })
    it("Correctly detects duplicates", () => {
        const duplicateMap = new Map()
        duplicateMap.set("keyOne", "a")
        duplicateMap.set("keyTwo", "b")
        duplicateMap.set("keyThree", "a")
        expect(
            hasDuplicates(duplicateMap, [
                {
                    commands: [
                        { params: [{ name: "keyOne" }, { name: "keyTwo" }, { name: "keyThree" }] },
                    ],
                },
            ])
        ).to.be.true
    })
    it("Does not assign any duplicate characters in the example", () => {
        expect(hasDuplicates(charMap, testingJson)).to.be.false
    })
    it("Does not assign any duplicate characters in the actual CLI", () => {
        expect(hasDuplicates(mapChars(apiInfo, localFlags), apiInfo)).to.be.false
    })
    it("Warns when there are more than 52 unique flags", () => {
        const generatedSchema = [
            {
                topic: "accounts",
                commands: [
                    {
                        params: [...new Array(54).keys()].map((idx) => ({
                            name: `v${idx}`,
                            required: false,
                        })),
                    },
                ],
            },
        ]
        const testMap = mapChars(generatedSchema, localFlags)
        expect(testMap).to.length(52 + Object.keys(localFlags).length)
        expect(hasDuplicates(testMap, generatedSchema)).to.be.false
    })
})

function accessSpecifier(param: { required: string }) {
    return param.required ? "args" : "flags"
}
