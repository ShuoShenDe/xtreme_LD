import { defineStore } from 'pinia'
import type { CommentStore } from './types/comment'
import { getComments, createComment, deleteComment, updateComment } from '@/ltmApi/comment'
import Editor from '@/package/image-editor/Editor'
import { useProjectMetaStore } from './projectMeta'
import type { CommentData } from '@/ltmApi/types/comment'
import { getLoginUsername } from '@/utils/auth'

export const useCommentStore = defineStore('comment', {
    state: (): CommentStore => ({
        allComments: {
            data: [],
            jsonapi: {
                version: ''
            }
        },
        loading: false,
        error: null,
        highlightCommentIds: []
    }),
    getters: {
        currentFrameComments: (state) => {
            const editor = (window as any).editor as Editor
            if (!editor) {
                console.error('Editor not initialized yet, cannot get current frame comments')
                return []
            }
            const currentFrame = editor.getCurrentFrame()
            const frameIdx = editor.getFrameIndex(currentFrame.id)
            
            return state.allComments.data.filter(comment => {
                const frames = comment.attributes.frames
                if (!frames || frames.length === 0) {
                    return false
                }
                // 确保 frames 是数字数组进行比较
                const frameNumbers = frames.map((f: string | number) => Number(f))
                return frameNumbers.includes(frameIdx)
            })
        },
        
        // 获取加载状态
        isLoading: (state) => state.loading,
        
        // 获取错误信息
        errorMessage: (state) => state.error
    },
    actions: {
        async fetchAllComments() {
            const projectMetaStore = useProjectMetaStore()
            this.loading = true
            this.error = null
            
            try {
                // 检查 taskId 是否存在
                if (!projectMetaStore.taskId) {
                    throw new Error('taskId is required but not available')
                }
                
                // 只获取一次数据，获取所有评论（不区分帧和类型）
                const response = await getComments({
                    category: 'task',
                    belong: projectMetaStore.taskId as string,
                    type: 'task,object,area,frame,sensor'
                })
                
                if (response && response.data) {
                    // 确保数据是数组格式
                    const dataArr = Array.isArray(response.data) ? response.data : [response.data]
                    
                    if (dataArr.length > 0) {
                        // 处理评论数据，确保 frames 和 version 字段格式正确
                        this.allComments.data = dataArr.map(item => {
                            // 确保 frames 是数字数组
                            const frames = item.attributes.frames
                                ? item.attributes.frames.map((f: string | number) => Number(f))
                                : []
                            
                            // 确保 version 是数字
                            const version = item.attributes.version
                                ? Number(item.attributes.version)
                                : 1
                            
                            return {
                                ...item,
                                attributes: {
                                    ...item.attributes,
                                    frames,
                                    version,
                                    // 确保 params 存在
                                    params: item.attributes.params || { rejectReasons: [] }
                                }
                            }
                        })
                    } else {
                        this.allComments.data = []
                    }
                } else {
                    this.allComments.data = []
                }
            } catch (error) {
                this.error = error instanceof Error ? error.message : '获取所有评论失败'
                console.error('获取所有评论失败:', error)
            } finally {
                this.loading = false
            }
        },

        // 添加评论
        async addComment(comment: CommentData) {
            try {
                this.loading = true
                this.error = null

                // 从 comment 中提取需要的数据，移除 id 字段
                const { id, ...commentWithoutId } = comment

                // 对于非子评论, 添加评论状态为 open
                if (!commentWithoutId.attributes.parent) {
                    commentWithoutId.attributes.params!.status = [
                        {
                            operator: getLoginUsername(),
                            created: new Date().toISOString(),
                            status: 'open'
                        }
                    ]
                }

                // 处理 parent 字段，将 null 转换为 undefined
                const attributes = {
                    ...commentWithoutId.attributes,
                    parent: commentWithoutId.attributes.parent || undefined
                }

                // 调用 API 创建评论
                const response = await createComment(attributes)

                // 将新创建的评论添加到评论列表中
                if (response && response.data) {
                    this.allComments.data.push(response.data as CommentData)
                }

                return response.data as CommentData
            } catch (error) {
                this.error = error instanceof Error ? error.message : '添加评论失败'
                console.error('添加评论失败:', error)
                throw error
            } finally {
                this.loading = false
            }
        },

        // 删除评论
        async removeComment(commentId: string) {
            try {
                this.loading = true
                this.error = null

                // 调用 API 删除评论
                await deleteComment(commentId)

                // 从评论列表中移除该评论
                this.allComments.data = this.allComments.data.filter(
                    comment => comment.id !== commentId
                )

                return true
            } catch (error) {
                this.error = error instanceof Error ? error.message : '删除评论失败'
                console.error('删除评论失败:', error)
                throw error
            } finally {
                this.loading = false
            }
        },

        // 更新评论
        async updateComment(commentId: string, updateData: any) {
            try {
                this.loading = true
                this.error = null

                // 调用 API 更新评论
                const response = await updateComment(commentId, updateData)

                // 更新评论列表中的对应评论
                if (response && response.data) {
                    const index = this.allComments.data.findIndex(
                        comment => comment.id === commentId
                    )
                    if (index !== -1) {
                        this.allComments.data[index] = response.data as CommentData
                    }
                }

                return response.data as CommentData
            } catch (error) {
                this.error = error instanceof Error ? error.message : '更新评论失败'
                console.error('更新评论失败:', error)
                throw error
            } finally {
                this.loading = false
            }
        },

        // 清除错误信息
        clearError() {
            this.error = null
        },

        // 重置 store 状态
        reset() {
            this.allComments = {
                data: [],
                jsonapi: {
                    version: ''
                }
            }
            this.loading = false
            this.error = null
            this.highlightCommentIds = []
        },

        // 设置高亮的评论ID
        setHighlightCommentIds(commentIds: string[]) {
            this.highlightCommentIds = commentIds
        },

        // 添加高亮评论ID
        addHighlightCommentId(commentId: string) {
            if (!this.highlightCommentIds.includes(commentId)) {
                this.highlightCommentIds.push(commentId)
            }
        },

        // 移除高亮评论ID
        removeHighlightCommentId(commentId: string) {
            this.highlightCommentIds = this.highlightCommentIds.filter(id => id !== commentId)
        },

        // 清除所有高亮评论ID
        clearHighlightCommentIds() {
            this.highlightCommentIds = []
        }
    }
})