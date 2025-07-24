export interface ProjectAttributes {
    name: string
    description: string | null
    status: string
    type: string
    rawframecount: number
    labeledframecount: number
    deliveredframecount: number
    planeddeliverydate: string | null
    actualdeliverydate: string | null
    receivers: string[]
    tags: string[]
    creator: string
    created: string
    updated: string
    tooltype: string
    items: number
    team: string
    owner: string
    createdtime: string
    settings: Record<string, any>
    metadata: Record<string, any>
    reserve: Record<string, any>
    connectors: string[]
}

export interface ProjectRelationships {
    pipeline: {
        links: {
            self: string
            related: string
        }
        data: {
            type: string
            id: string
        }
    }
    batchphases: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
    tripphases: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
    taskphases: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
    batches: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
    trips: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
    tasks: {
        links: {
            self: string
            related: string
        }
        data: Array<{
            type: string
            id: string
        }>
    }
}

export interface ProjectData {
    type: 'projects'
    id: string
    attributes: ProjectAttributes
    relationships: ProjectRelationships
    links: {
        self: string
    }
}

export interface IncludedData {
    type: string
    id: string
    attributes: Record<string, any>
    relationships: Record<string, any>
    links: {
        self: string
    }
}

export interface ProjectResponse {
    jsonapi?: {
        version: string
    }
    links?: {
        self: string
    }
    data: ProjectData
    included?: IncludedData[]
}
