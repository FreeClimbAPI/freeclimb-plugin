export const prompts = {
    confirm: async (message: string, defaultValue = false) => {
        const { confirm } = await import("@inquirer/prompts")
        return confirm({ message, default: defaultValue })
    },
    password: async (message: string) => {
        const { password } = await import("@inquirer/prompts")
        return password({ message })
    },
}
