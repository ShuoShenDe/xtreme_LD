export interface TaskAttributes {
    name: string
    description: string | null
    planedworkload: number
    actualworkload: number
    rawdata: string
    start: number | null
    end: number | null
    duration: number | null
    rawframecount: number
    deliveredframecount: number
    planeddeliverydate: string | null
    actualdeliverydate: string | null
    score: number | null
    phase: string
    phaseprogress: Record<string, any> | null
    phaseoperators: Record<string, any> | null
    phasestatus: Record<string, any>
    phasemetadata: Record<string, any>
    phasedata: Record<string, any>
    asyncprocess: Record<string, any>
    history: any[]
    tags: string[]
    receivers: string[]
    operator: string | null
    qcversion: string | null
    creator: string
    created: string
    updated: string
    reserve: Record<string, any>
}

export interface TaskRelationships {
    project: {
        links: {
            self: string
            related: string
        }
        data: {
            type: string
            id: string
        }
    }
    batch: {
        links: {
            self: string
            related: string
        }
        data: null
    }
    trip: {
        links: {
            self: string
            related: string
        }
        data: {
            type: string
            id: string
        }
    }
}

export interface TaskData {
    type: 'tasks'
    id: string
    attributes: TaskAttributes
    relationships: TaskRelationships
    links: {
        self: string
    }
}

export interface TaskResponse {
    jsonapi?: {
        version: string
    }
    links?: {
        self: string
    }
    data: TaskData
}

export interface UpdateTaskData {
    name?: string
    description?: string | null
    planedworkload?: number
    actualworkload?: number
    rawdata?: string
    start?: number | null
    end?: number | null
    duration?: number | null
    rawframecount?: number
    deliveredframecount?: number
    planeddeliverydate?: string | null
    actualdeliverydate?: string | null
    score?: number | null
    phase?: string
    phaseprogress?: Record<string, any> | null
    phaseoperators?: Record<string, any> | null
    phasestatus?: Record<string, any>
    phasemetadata?: Record<string, any>
    phasedata?: Record<string, any>
    asyncprocess?: Record<string, any>
    history?: any[]
    tags?: string[]
    receivers?: string[]
    operator?: string | null
    qcversion?: string | null
    reserve?: Record<string, any>
    [key: string]: any
}
