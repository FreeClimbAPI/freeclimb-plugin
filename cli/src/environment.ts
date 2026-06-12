import * as path from "node:path"
import { config } from "dotenv"
import * as fs from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const currentDir = dirname(fileURLToPath(import.meta.url))

export class Environment {
    private dataPath: string

    constructor(newDataPath = `${currentDir}/../`) {
        // newDataPath is of type string, and we get type inference from the default argument
        this.dataPath = newDataPath
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true })
        }
        this.loadVarsFromFile()
    }

    static getString(name: string) {
        const value = process.env[name] || ""
        return value
    }

    static setString(name: string, value: string) {
        process.env[name] = value
    }

    private editPersistentVariable(name: string, replacement: string) {
        const envPath = path.join(this.dataPath, "/.env")
        if (!fs.existsSync(envPath)) {
            fs.writeFileSync(envPath, "") // create a blank file if it does not exist already
        }
        const prevContents = fs.readFileSync(envPath, "utf-8")
        let newContents = prevContents
        const regex = new RegExp(`^(${name}=[\\S\\s]+\n)$`, "gm")
        if (regex.exec(prevContents) === null) {
            // if the file does not have this variable set yet
            if (prevContents.length > 0) {
                // the file is not empty but doesn't have this particular variable
                newContents = prevContents + "\n" + replacement // we add a newline at the beginning to leave the previous line unchanged
            }
            // otherwise if the file is empty, no newline is needed at the beginning
            newContents = prevContents + replacement
        } else {
            newContents = prevContents.replace(regex, replacement)
        }
        if (newContents.charAt(newContents.length - 1) !== "\n") {
            newContents += "\n" // the file should end with a newline
        }
        fs.writeFileSync(envPath, newContents)
    }

    private loadVarsFromFile() {
        config({
            path: path.join(this.dataPath, "/.env"),
        }) // this dotenv method loads the values from .env file into process memory
    }

    setStringPersist(name: string, value: string) {
        this.editPersistentVariable(name, `${name}=${value}`)
    }

    clearString(name: string) {
        this.editPersistentVariable(name, "")
    }
}

export const env = {
    get accountId() {
        // Support both new FREECLIMB_ prefix and legacy ACCOUNT_ID
        return (
            Environment.getString("FREECLIMB_ACCOUNT_ID") ||
            Environment.getString("ACCOUNT_ID")
        )
    },
    get apiKey() {
        // Support both new FREECLIMB_ prefix and legacy API_KEY
        return (
            Environment.getString("FREECLIMB_API_KEY") ||
            Environment.getString("API_KEY")
        )
    },
}
