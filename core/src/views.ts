export type ViewColumnScope = "all" | "wide" | "compact"

export interface ViewColumn {
    header: string
    key: string
    date?: boolean
    scope?: ViewColumnScope
    value?: (row: Record<string, unknown>) => unknown
    width?: number
}

export interface ResourceView {
    columns: ViewColumn[]
    emptyMessage?: string
    eyebrow: string
    listKey: string
    statusKey?: string
    title: string
}

function capabilities(row: Record<string, unknown>): string {
    return [row.voiceEnabled ? "Voice" : null, row.smsEnabled ? "SMS" : null]
        .filter(Boolean)
        .join(" · ")
}

export const resourceViews = {
    calls: {
        listKey: "calls",
        emptyMessage: "No calls found",
        eyebrow: "FreeClimb · Voice",
        title: "Recent Calls",
        statusKey: "status",
        columns: [
            { key: "callId", header: "Call ID", width: 24, scope: "wide" },
            { key: "from", header: "From", width: 15 },
            { key: "to", header: "To", width: 15 },
            { key: "status", header: "Status", width: 12 },
            { key: "direction", header: "Direction", width: 10 },
            {
                key: "dateCreated",
                header: "Created",
                width: 22,
                date: true,
                value: (row) => row.startTime ?? row.dateCreated,
            },
        ],
    },
    sms: {
        listKey: "messages",
        emptyMessage: "No messages found",
        eyebrow: "FreeClimb · Messaging",
        title: "Recent SMS Messages",
        statusKey: "status",
        columns: [
            { key: "messageId", header: "Message ID", width: 24, scope: "wide" },
            { key: "from", header: "From", width: 15 },
            { key: "to", header: "To", width: 15 },
            { key: "text", header: "Message", scope: "compact" },
            { key: "status", header: "Status", width: 12 },
            { key: "direction", header: "Direction", width: 10, scope: "wide" },
            { key: "dateCreated", header: "Created", width: 22, date: true },
        ],
    },
    numbers: {
        listKey: "incomingPhoneNumbers",
        emptyMessage: "No incoming numbers found",
        eyebrow: "FreeClimb · Numbers",
        title: "Phone Numbers",
        columns: [
            { key: "phoneNumberId", header: "Number ID", width: 24, scope: "wide" },
            { key: "phoneNumber", header: "Phone Number", width: 15 },
            { key: "alias", header: "Alias", width: 20 },
            { key: "capabilities", header: "Capabilities", scope: "compact", value: capabilities },
            { key: "applicationId", header: "App ID", width: 24 },
        ],
    },
    availableNumbers: {
        listKey: "availablePhoneNumbers",
        emptyMessage: "No available numbers found",
        eyebrow: "FreeClimb · Numbers",
        title: "Available Numbers",
        columns: [
            { key: "phoneNumber", header: "Number", width: 15 },
            { key: "region", header: "Region", width: 12 },
            { key: "country", header: "Country", width: 10 },
            { key: "capabilities", header: "Capabilities", scope: "compact", value: capabilities },
            { key: "voiceEnabled", header: "Voice", width: 8, scope: "wide" },
            { key: "smsEnabled", header: "SMS", width: 8, scope: "wide" },
        ],
    },
    applications: {
        listKey: "applications",
        emptyMessage: "No applications found",
        eyebrow: "FreeClimb · Applications",
        title: "Applications",
        columns: [
            { key: "applicationId", header: "App ID", width: 24 },
            { key: "alias", header: "Alias", width: 20 },
            { key: "voiceUrl", header: "Voice URL", width: 40 },
            { key: "smsUrl", header: "SMS URL", scope: "compact" },
        ],
    },
    queues: {
        listKey: "queues",
        emptyMessage: "No queues found",
        eyebrow: "FreeClimb · Voice",
        title: "Call Queues",
        columns: [
            { key: "queueId", header: "Queue ID", width: 24 },
            { key: "alias", header: "Alias", width: 20 },
            {
                key: "currentSize",
                header: "Size",
                width: 8,
                value: (row) => row.currentSize ?? row.size,
            },
            { key: "maxSize", header: "Max", width: 8 },
            { key: "averageWaitTime", header: "Avg Wait", width: 10, scope: "wide" },
        ],
    },
    queueMembers: {
        listKey: "queueMembers",
        emptyMessage: "No queue members found",
        eyebrow: "FreeClimb · Voice",
        title: "Queue Members",
        columns: [
            { key: "callId", header: "Call ID", width: 24 },
            { key: "position", header: "Position", width: 10 },
            { key: "waitTime", header: "Wait Time", width: 10 },
            { key: "dateEnqueued", header: "Enqueued", width: 22, date: true },
        ],
    },
    conferences: {
        listKey: "conferences",
        emptyMessage: "No conferences found",
        eyebrow: "FreeClimb · Voice",
        title: "Conferences",
        statusKey: "status",
        columns: [
            { key: "conferenceId", header: "Conference ID", width: 24 },
            { key: "alias", header: "Alias", width: 20 },
            { key: "status", header: "Status", width: 12 },
            { key: "dateCreated", header: "Created", width: 22, date: true },
        ],
    },
    participants: {
        listKey: "participants",
        emptyMessage: "No participants found",
        eyebrow: "FreeClimb · Voice",
        title: "Conference Participants",
        columns: [
            { key: "callId", header: "Call ID", width: 24 },
            { key: "talk", header: "Talk", width: 8 },
            { key: "listen", header: "Listen", width: 8 },
            { key: "startConfOnEnter", header: "Starts Conf", width: 12 },
        ],
    },
    recordings: {
        listKey: "recordings",
        emptyMessage: "No recordings found",
        eyebrow: "FreeClimb · Recordings",
        title: "Recordings",
        columns: [
            { key: "recordingId", header: "Recording ID", width: 24 },
            { key: "callId", header: "Call ID", width: 24 },
            { key: "durationSec", header: "Duration", width: 10 },
            { key: "dateCreated", header: "Created", width: 22, date: true },
        ],
    },
    brands: {
        listKey: "brands",
        emptyMessage: "No brands found",
        eyebrow: "FreeClimb · 10DLC",
        title: "10DLC Brands",
        columns: [
            { key: "brandId", header: "Brand ID", width: 24 },
            { key: "displayName", header: "Display Name", width: 24 },
            { key: "entityType", header: "Entity Type", width: 14 },
            { key: "identityStatus", header: "Identity Status", width: 16 },
        ],
    },
    campaigns: {
        listKey: "campaigns",
        emptyMessage: "No campaigns found",
        eyebrow: "FreeClimb · 10DLC",
        title: "10DLC Campaigns",
        columns: [
            { key: "campaignId", header: "Campaign ID", width: 24 },
            { key: "brandId", header: "Brand ID", width: 24 },
            { key: "usecase", header: "Use Case", width: 16 },
            { key: "status", header: "Status", width: 12 },
        ],
        statusKey: "status",
    },
    exports: {
        listKey: "exports",
        emptyMessage: "No exports found",
        eyebrow: "FreeClimb · Exports",
        title: "Exports",
        statusKey: "status",
        columns: [
            { key: "exportId", header: "Export ID", width: 24 },
            { key: "resourceType", header: "Resource", width: 12 },
            { key: "status", header: "Status", width: 12 },
            { key: "dateCreated", header: "Created", width: 22, date: true },
        ],
    },
    blobs: {
        listKey: "blobs",
        emptyMessage: "No blobs found",
        eyebrow: "FreeClimb · Blob Store",
        title: "Blobs",
        columns: [
            { key: "blobId", header: "Blob ID", width: 24 },
            { key: "alias", header: "Alias", width: 20 },
            { key: "dateCreated", header: "Created", width: 22, date: true },
            { key: "dateUpdated", header: "Updated", width: 22, date: true },
        ],
    },
    logs: {
        listKey: "logs",
        emptyMessage: "No logs found",
        eyebrow: "FreeClimb · Logs",
        title: "Account Logs",
        statusKey: "level",
        columns: [
            {
                key: "timestamp",
                header: "Timestamp",
                width: 22,
                date: true,
                value: (row) => row.timestamp ?? row.dateCreated,
            },
            { key: "level", header: "Level", width: 8 },
            { key: "requestId", header: "Request ID", width: 24, scope: "wide" },
            { key: "message", header: "Message", width: 50 },
        ],
    },
} satisfies Record<string, ResourceView>

export type ResourceViewName = keyof typeof resourceViews

export const CLI_TOPIC_VIEWS: Record<string, ResourceViewName> = {
    calls: "calls",
    sms: "sms",
    applications: "applications",
    "incoming-numbers": "numbers",
    "available-numbers": "availableNumbers",
    "call-queues": "queues",
    "queue-members": "queueMembers",
    conferences: "conferences",
    "conference-participants": "participants",
    recordings: "recordings",
    logs: "logs",
    brands: "brands",
    campaigns: "campaigns",
    exports: "exports",
    blobs: "blobs",
}

export function getResourceView(name: string): ResourceView | undefined {
    return (resourceViews as Record<string, ResourceView>)[name]
}

export function getViewForCliTopic(topic: string): ResourceView | undefined {
    const name = CLI_TOPIC_VIEWS[topic]
    return name ? resourceViews[name] : undefined
}

export function viewColumns(view: ResourceView, surface: "wide" | "compact"): ViewColumn[] {
    return view.columns.filter((column) => {
        const scope = column.scope ?? "all"
        if (scope === "all") return true
        return scope === surface
    })
}

export function viewCellValue(column: ViewColumn, row: Record<string, unknown>): unknown {
    return column.value ? column.value(row) : row[column.key]
}
