import { apiRequest } from "./http.js"
import { validateResourceId } from "./validation.js"

export interface ApplicationData {
    alias?: string
    callConnectUrl?: string
    smsFallbackUrl?: string
    smsUrl?: string
    statusCallbackUrl?: string
    voiceFallbackUrl?: string
    voiceUrl?: string
}

export interface IncomingNumberUpdate {
    alias?: string
    applicationId?: string | null
}

export async function createApplication(data: ApplicationData): Promise<Record<string, unknown>> {
    const response = await apiRequest<Record<string, unknown>>({
        method: "POST",
        path: "/Applications",
        data,
    })
    return response.data
}

export async function updateApplication(
    applicationId: string,
    data: ApplicationData,
): Promise<Record<string, unknown>> {
    validateResourceId(applicationId, "applicationId")
    const response = await apiRequest<Record<string, unknown>>({
        method: "POST",
        path: `/Applications/${applicationId}`,
        data,
    })
    return response.data
}

export async function deleteApplication(applicationId: string): Promise<void> {
    validateResourceId(applicationId, "applicationId")
    await apiRequest({ method: "DELETE", path: `/Applications/${applicationId}` })
}

export async function updateIncomingNumber(
    phoneNumberId: string,
    data: IncomingNumberUpdate,
): Promise<Record<string, unknown>> {
    validateResourceId(phoneNumberId, "phoneNumberId")
    const response = await apiRequest<Record<string, unknown>>({
        method: "POST",
        path: `/IncomingPhoneNumbers/${phoneNumberId}`,
        data,
    })
    return response.data
}

