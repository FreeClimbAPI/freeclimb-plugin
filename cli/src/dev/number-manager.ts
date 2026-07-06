import { createApiAxios } from "../http.js"
import { getIncomingNumber } from "../resources.js"

export interface NumberInfo {
    alias: string | null
    applicationId: string | null
    phoneNumber: string
    phoneNumberId: string
}

export async function getNumber(phoneNumberId: string): Promise<NumberInfo> {
    const data = await getIncomingNumber(phoneNumberId)
    return {
        phoneNumberId: data.phoneNumberId as string,
        phoneNumber: data.phoneNumber as string,
        applicationId: (data.applicationId as string) || null,
        alias: (data.alias as string) || null,
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
