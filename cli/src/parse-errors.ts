export function parse(output: any) {
    let code
    let title
    let suggestion
    let url

    const message = typeof output === "string" ? output : output?.message || String(output)

    if (message.includes("Invalid arguments spec")) {
        code = 1007
        title = "Invalid argument spec"
        suggestion = "Arguments should reflect the following: \n\n"
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    } else if (message.includes("Missing") && message.includes("required arg")) {
        code = 1008
        title = "Missing required arguments"
        suggestion = `Please include the required arguments and run your command again.\n\n${formatArg()}`
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    } else if (message.includes("Unexpected argument")) {
        code = 1010
        title = "Unexpected arguments"
        suggestion = `Please check for any argument and option flag typos. \nThis error also typically occurs as a result of improper option flag formatting for inputs with spaces.\n ${formatFlag()}`
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    } else if (message.includes("Missing required flag")) {
        code = 1009
        title = "Missing required flag"
        suggestion = `Please include the required flag and run your command again.\n\n${formatFlag()}`
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    } else if (message.includes("Expected") && message.includes("to be one of")) {
        code = 1011
        title = "Invalid Flag Input : Option"
        const lines = message.split("\n")
        suggestion = lines[0]
        for (let i = 1; i < lines.length; i++) {
            suggestion += `\n\t ${lines[i]}`
        }
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    } else {
        const lines = message.split("\n")
        let s = ""
        for (let i = 1; i < lines.length; i++) {
            s += `${lines[i]} `
        }
        code = 1013
        title = lines[0]
        suggestion = s === "" ? "Check formatting of command" : s
        url = "https://docs.freeclimb.com/reference/error-and-warning-dictionary"
    }
    return returnFormat(code, title, url, suggestion)
}

function returnFormat(code: number, message: string, url: string, suggestion: string) {
    return `
    Code : ${code}
    Message : ${message}
    Suggestion : ${suggestion}
    For further information on this error visit :
    ${url}
    `
}

function formatFlag() {
    return `\n\tFlags are formatted as follows: \n\tIf input has no space: \n\t\t--{flagName}={input}\n\t\t-{flagCharacter}={input}\n\tIf input includes spaces: \n\t\t--{flagName}="{spaced input}"\n\t\t-{flagCharacter}="{spaced input}"\n`
}

function formatArg() {
    return `Arguments are formatted as followed:\n\n\t {input} \n\t "{input}" \n\t '{input}'\n`
}
