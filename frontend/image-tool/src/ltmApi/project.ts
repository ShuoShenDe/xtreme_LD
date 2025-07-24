import http from '@/utils/http'
import type { ProjectResponse } from './types/project'
import { useProjectMetaStore } from '@/stores/projectMeta'

enum Api {
    GetProject = '/api/v1/xtreme1_relay/forward/jsonapi/models/projects/{id}'
}

/**
 * 获取单个项目详情
 * @param id 项目ID
 * @param include 包含的关联资源
 * @param fields 需要返回的指定字段，格式为 { resourceType: [fieldName] }
 */
export const getProject = (id: string, include?: string[], fields?: { [key: string]: string[] }) => {
    const projectMetaStore = useProjectMetaStore()
    const queryParams = new URLSearchParams()
    
    if (include) {
        queryParams.append('include', include.join(','))
    }

    if (fields) {
        Object.entries(fields).forEach(([resourceType, fieldList]) => {
            queryParams.append(`fields[${resourceType}]`, fieldList.join(','))
        })
    }
    
    const url = `${projectMetaStore.ltmUrl}${Api.GetProject.replace('{id}', id)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return http.get<ProjectResponse>({
        url
    })
}
