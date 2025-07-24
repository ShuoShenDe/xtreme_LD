import http from '@/utils/http'
import type { TaskResponse, UpdateTaskData } from './types/task'
import { useProjectMetaStore } from '@/stores/projectMeta'
import { addUpdateFields } from '@/utils/auth'

enum Api {
    GetTask = '/api/v1/xtreme1_relay/forward/jsonapi/models/tasks/{id}',
    UpdateTask = '/api/v1/xtreme1_relay/forward/jsonapi/models/tasks/{id}'
}

export const getTask = (id: string) => {
    const projectMetaStore = useProjectMetaStore()
    return http.get<TaskResponse>({
        url: `${projectMetaStore.ltmUrl}${Api.GetTask.replace('{id}', id)}`
    })
}

/**
 * 更新任务
 * @param id 任务ID
 * @param data 要更新的数据
 */
export const updateTask = (id: string, data: UpdateTaskData) => {
    const projectMetaStore = useProjectMetaStore()
    return http.patch<void>({
        url: `${projectMetaStore.ltmUrl}${Api.UpdateTask.replace('{id}', id)}`,
        data: {
            data: {
                type: 'tasks',
                id,
                attributes: addUpdateFields(data)
            }
        },
        headers: {
            'Content-Type': 'application/vnd.api+json'
        }
    })
}
