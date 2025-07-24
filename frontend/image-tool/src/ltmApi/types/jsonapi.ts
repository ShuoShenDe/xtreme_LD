export interface JsonApiData {
    type: string
    id: string
    attributes: Record<string, any>
    relationships?: Record<string, any>
    links?: Record<string, string>
}

export interface JsonApiResponse {
    jsonapi?: {
        version: string
    }
    meta?: {
        count: number
    }
    links?: {
        self: string
    }
    data: JsonApiData | JsonApiData[]
    included?: JsonApiData[]
}

export interface JsonApiSingleResponse {
    data: JsonApiData
    included?: JsonApiData[]
    meta?: Record<string, any>
    links?: Record<string, string>
}

export interface JsonApiArrayResponse {
    data: JsonApiData[]
    included?: JsonApiData[]
    meta?: Record<string, any>
    links?: Record<string, string>
}
