import {
    createApplication,
    updateApplication,
    deleteApplication,
} from "@freeclimb/core"
import { getApplication } from "../resources.js"
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
    const data = await getApplication(applicationId)
    return {
        voiceUrl: (data.voiceUrl as string) || null,
        smsUrl: (data.smsUrl as string) || null,
        statusCallbackUrl: (data.statusCallbackUrl as string) || null,
        callConnectUrl: (data.callConnectUrl as string) || null,
    }
}

export async function createTempApp(
    tunnelUrl: string,
): Promise<{ alias: string; applicationId: string }> {
    const alias = `fc-cli-dev-${Date.now()}`
    const urls = buildWebhookUrls(tunnelUrl)

    const data = await createApplication({
        alias,
        ...urls,
    })

    return {
        applicationId: data.applicationId as string,
        alias,
    }
}

export async function updateAppUrls(applicationId: string, tunnelUrl: string): Promise<void> {
    const urls = buildWebhookUrls(tunnelUrl)
    await updateApplication(applicationId, urls)
}

export async function restoreAppUrls(applicationId: string, urls: PreviousAppUrls): Promise<void> {
    await updateApplication(applicationId, {
        voiceUrl: urls.voiceUrl || "",
        smsUrl: urls.smsUrl || "",
        statusCallbackUrl: urls.statusCallbackUrl || "",
        callConnectUrl: urls.callConnectUrl || "",
    })
}

export async function deleteTempApp(applicationId: string): Promise<void> {
    await deleteApplication(applicationId)
}
