import { createApiAxios } from "../http.js"

export interface NumberInfo {
    alias: string | null
    applicationId: string | null
    phoneNumber: string
    phoneNumberId: string
}

export async function getNumber(phoneNumberId: string): Promise<NumberInfo> {
    const client = await createApiAxios()
    const response = await client.get(`/IncomingPhoneNumbers/${phoneNumberId}`)
    return {
        phoneNumberId: response.data.phoneNumberId,
        phoneNumber: response.data.phoneNumber,
        applicationId: response.data.applicationId || null,
        alias: response.data.alias || null,
    }
}

export async function assignNumber(
    phoneNumberId: string,
    applicationId: string,
): Promise<string | null> {
    const current = await getNumber(phoneNumberId)
    const previousApplicationId = current.applicationId

    const client = await createApiAxios()
    await client.post(`/IncomingPhoneNumbers/${phoneNumberId}`, {
        applicationId,
    })

    return previousApplicationId
}

export async function restoreNumber(
    phoneNumberId: string,
    previousApplicationId: string | null,
): Promise<void> {
    const client = await createApiAxios()
    // Pass empty string to unassign if the number had no previous application
    await client.post(`/IncomingPhoneNumbers/${phoneNumberId}`, {
        applicationId: previousApplicationId || "",
    })
}
