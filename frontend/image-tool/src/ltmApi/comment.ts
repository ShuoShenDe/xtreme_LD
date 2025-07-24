import http from '@/utils/http'
import type { 
    SingleCommentResponse,
    MultipleCommentsResponse,
    CommentFilter, 
    CreateCommentData, 
    UpdateCommentData 
} from './types/comment'
import { useProjectMetaStore } from '@/stores/projectMeta'

enum Api {
    GetComments = '/api/v1/xtreme1_relay/forward/jsonapi/models/comments',
    CreateComment = '/api/v1/xtreme1_relay/forward/jsonapi/models/comments',
    DeleteComment = '/api/v1/xtreme1_relay/forward/jsonapi/models/comments/{id}',
    UpdateComment = '/api/v1/xtreme1_relay/forward/jsonapi/models/comments/{id}'
}

/**
 * 获取评论列表
 * @param filters 过滤参数
 * @returns Promise<MultipleCommentsResponse>
 */
export const getComments = (filters?: CommentFilter) => {
    const queryParams = new URLSearchParams()
    const projectMetaStore = useProjectMetaStore()

    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                queryParams.append(`filter[${key}]`, value)
            } else {
                queryParams.append(`filter[${key}]`, '')
            }
        })
    }

    const url = `${projectMetaStore.ltmUrl}${Api.GetComments}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    return http.get<MultipleCommentsResponse>({
        url
    })
}

/**
 * 创建评论
 * @param data 评论数据
 * @returns Promise<SingleCommentResponse>
 */
export const createComment = (data: CreateCommentData) => {
    const projectMetaStore = useProjectMetaStore()
    // 确保数值类型的字段被转换为字符串
    const processedData = {
        ...data,
        frames: data.frames?.map(frame => frame.toString()),
        version: data.version?.toString()
    }

    return http.post<SingleCommentResponse>({
        url: `${projectMetaStore.ltmUrl}${Api.CreateComment}`,
        data: {
            data: {
                type: 'comments',
                attributes: processedData
            }
        },
        headers: {
            'Content-Type': 'application/vnd.api+json'
        }
    })
}

/**
 * 删除评论
 * @param id 评论ID
 * @returns Promise<SingleCommentResponse>
 */
export const deleteComment = (id: string) => {
    const projectMetaStore = useProjectMetaStore()
    return http.delete<SingleCommentResponse>({
        url: `${projectMetaStore.ltmUrl}${Api.DeleteComment.replace('{id}', id)}`
    })
}

/**
 * 更新评论
 * @param id 评论ID
 * @param data 要更新的数据
 * @returns Promise<SingleCommentResponse>
 */
export const updateComment = (id: string, data: UpdateCommentData) => {
    const projectMetaStore = useProjectMetaStore()
    return http.patch<SingleCommentResponse>({
        url: `${projectMetaStore.ltmUrl}${Api.UpdateComment.replace('{id}', id)}`,
        data: {
            data: {
                type: 'comments',
                id,
                attributes: data
            }
        },
        headers: {
            'Content-Type': 'application/vnd.api+json'
        }
    })
}
