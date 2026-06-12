import { createApiAxios } from "../http.js"
import type { PreviousAppUrls } from "./state.js"

export interface TempAppUrls {
    callConnectUrl: string
    smsUrl: string
    statusCallbackUrl: string
    voiceUrl: string
}

function buildWebhookUrls(tunnelUrl: string): TempAppUrls {
    return {
        voiceUrl: `${tunnelUrl}/voice`,
        smsUrl: `${tunnelUrl}/sms`,
        statusCallbackUrl: `${tunnelUrl}/status`,
        callConnectUrl: `${tunnelUrl}/call-connect`,
    }
}

export async function getAppUrls(applicationId: string): Promise<PreviousAppUrls> {
    const client = await createApiAxios()
    const response = await client.get(`/Applications/${applicationId}`)
    return {
        voiceUrl: response.data.voiceUrl || null,
        smsUrl: response.data.smsUrl || null,
        statusCallbackUrl: response.data.statusCallbackUrl || null,
        callConnectUrl: response.data.callConnectUrl || null,
    }
}

export async function createTempApp(
    tunnelUrl: string,
): Promise<{ alias: string; applicationId: string }> {
    const client = await createApiAxios()
    const alias = `fc-cli-dev-${Date.now()}`
    const urls = buildWebhookUrls(tunnelUrl)

    const response = await client.post("/Applications", {
        alias,
        ...urls,
    })

    return {
        applicationId: response.data.applicationId,
        alias,
    }
}

export async function updateAppUrls(applicationId: string, tunnelUrl: string): Promise<void> {
    const client = await createApiAxios()
    const urls = buildWebhookUrls(tunnelUrl)

    await client.post(`/Applications/${applicationId}`, urls)
}

export async function restoreAppUrls(applicationId: string, urls: PreviousAppUrls): Promise<void> {
    const client = await createApiAxios()
    await client.post(`/Applications/${applicationId}`, {
        voiceUrl: urls.voiceUrl || "",
        smsUrl: urls.smsUrl || "",
        statusCallbackUrl: urls.statusCallbackUrl || "",
        callConnectUrl: urls.callConnectUrl || "",
    })
}

export async function deleteTempApp(applicationId: string): Promise<void> {
    const client = await createApiAxios()
    await client.delete(`/Applications/${applicationId}`)
}
