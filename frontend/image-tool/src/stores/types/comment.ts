import type { MultipleCommentsResponse } from '@/ltmApi/types/comment'

export interface CommentStore {
    allComments: MultipleCommentsResponse
    loading: boolean
    error: string | null
    highlightCommentIds: string[]
}
