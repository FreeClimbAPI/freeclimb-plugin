import { apiRequest, publicRequest } from "./http.js"
import { rejectControlChars, validatePhoneNumber, validateResourceId } from "./validation.js"

export interface FreeClimbPage<T = Record<string, unknown>> {
    end?: number
    nextPageUri?: string
    numPages?: number
    page?: number
    pageSize?: number
    start?: number
    total?: number
    [listKey: string]: T[] | number | string | undefined
}

export interface CallListParams {
    from?: string
    status?: string
    to?: string
}

export interface MessageListParams {
    from?: string
    to?: string
}

export interface AvailableNumberSearchParams {
    areaCode?: string
    country?: string
    smsEnabled?: boolean
    voiceEnabled?: boolean
}

export interface LogListParams {
    maxItems?: number
}

export interface RecordingListParams {
    callId?: string
}

export interface ConferenceListParams {
    status?: string
}

const DEFAULT_LOG_MAX_ITEMS = 100
const DEFAULT_AVAILABLE_NUMBER_COUNTRY = "US"

export async function getAccount(): Promise<Record<string, unknown>> {
    const { data } = await apiRequest<Record<string, unknown>>({ method: "GET", path: "" })
    return data
}

export async function listCalls(params: CallListParams = {}): Promise<FreeClimbPage> {
    validatePhoneNumber(params.to, "to")
    validatePhoneNumber(params.from, "from")
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Calls",
        params: { to: params.to, from: params.from, status: params.status },
    })
    return data
}

export async function getCall(callId: string): Promise<Record<string, unknown>> {
    validateResourceId(callId, "callId")
    const { data } = await apiRequest<Record<string, unknown>>({
        method: "GET",
        path: `/Calls/${callId}`,
    })
    return data
}

export async function listMessages(params: MessageListParams = {}): Promise<FreeClimbPage> {
    validatePhoneNumber(params.to, "to")
    validatePhoneNumber(params.from, "from")
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Messages",
        params: { to: params.to, from: params.from },
    })
    return data
}

export async function getMessage(messageId: string): Promise<Record<string, unknown>> {
    validateResourceId(messageId, "messageId")
    const { data } = await apiRequest<Record<string, unknown>>({
        method: "GET",
        path: `/Messages/${messageId}`,
    })
    return data
}

export async function listIncomingNumbers(
    params?: Record<string, unknown>,
): Promise<FreeClimbPage> {
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/IncomingPhoneNumbers",
        params,
    })
    return data
}

export async function getIncomingNumber(phoneNumberId: string): Promise<Record<string, unknown>> {
    validateResourceId(phoneNumberId, "phoneNumberId")
    const { data } = await apiRequest<Record<string, unknown>>({
        method: "GET",
        path: `/IncomingPhoneNumbers/${phoneNumberId}`,
    })
    return data
}

export async function searchAvailableNumbers(
    params: AvailableNumberSearchParams = {},
): Promise<FreeClimbPage> {
    const { data } = await publicRequest<FreeClimbPage>({
        method: "GET",
        path: "/AvailablePhoneNumbers",
        auth: true,
        params: {
            areaCode: params.areaCode,
            country: params.country || DEFAULT_AVAILABLE_NUMBER_COUNTRY,
            smsEnabled: params.smsEnabled,
            voiceEnabled: params.voiceEnabled,
        },
    })
    return data
}

export async function listApplications(
    params?: Record<string, unknown>,
): Promise<FreeClimbPage> {
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Applications",
        params,
    })
    return data
}

export async function getApplication(applicationId: string): Promise<Record<string, unknown>> {
    validateResourceId(applicationId, "applicationId")
    const { data } = await apiRequest<Record<string, unknown>>({
        method: "GET",
        path: `/Applications/${applicationId}`,
    })
    return data
}

export async function listLogs(params: LogListParams = {}): Promise<FreeClimbPage> {
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Logs",
        params: { maxItems: params.maxItems || DEFAULT_LOG_MAX_ITEMS },
    })
    return data
}

export async function filterLogs(
    pql: string,
    params: LogListParams = {},
): Promise<FreeClimbPage> {
    rejectControlChars(pql, "pql")
    const { data } = await apiRequest<FreeClimbPage>({
        method: "POST",
        path: "/Logs",
        data: { pql },
    })
    if (!params.maxItems || !Array.isArray(data.logs)) return data
    return { ...data, logs: data.logs.slice(0, params.maxItems) }
}

export async function listRecordings(params: RecordingListParams = {}): Promise<FreeClimbPage> {
    if (params.callId) validateResourceId(params.callId, "callId")
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Recordings",
        params: { callId: params.callId },
    })
    return data
}

export async function listConferences(
    params: ConferenceListParams = {},
): Promise<FreeClimbPage> {
    const { data } = await apiRequest<FreeClimbPage>({
        method: "GET",
        path: "/Conferences",
        params: { status: params.status },
    })
    return data
}

export async function listQueues(params?: Record<string, unknown>): Promise<FreeClimbPage> {
    const { data } = await apiRequest<FreeClimbPage>({ method: "GET", path: "/Queues", params })
    return data
}

export type ResourceReader = (params?: Record<string, unknown>) => Promise<unknown>

function readLogs(params?: Record<string, unknown>): Promise<unknown> {
    const pql = params?.pql as string | undefined
    const maxItems = params?.maxItems as number | undefined
    if (pql) return filterLogs(pql, { maxItems })
    return listLogs({ maxItems })
}

export const readResources: Record<string, ResourceReader> = {
    calls: (params) => listCalls(params as CallListParams),
    sms: (params) => listMessages(params as MessageListParams),
    queues: (params) => listQueues(params),
    conferences: (params) => listConferences(params as ConferenceListParams),
    account: () => getAccount(),
    logs: (params) => readLogs(params),
    numbers: (params) => listIncomingNumbers(params),
    applications: (params) => listApplications(params),
    recordings: (params) => listRecordings(params as RecordingListParams),
}
