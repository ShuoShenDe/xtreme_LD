import { defineStore } from 'pinia'
import type { ProjectMeta, ProjectSettings, QcSettings, LabelSettings } from './types/projectMeta'
import { TaskResponse } from '@/ltmApi/types/task'
import { getTask } from '@/ltmApi/task'
import { ProjectResponse } from '@/ltmApi/types/project'
import { getProject } from '@/ltmApi/project'
import { setAuthInfoFromUrl } from '@/utils/auth'
import { useCommentStore } from './comment'

export const useProjectMetaStore = defineStore('projectMeta', {
    state: (): ProjectMeta => ({
        taskId: '',
        ltmUrl: '',
        phase: '',
        task: {} as TaskResponse,
        project: {} as ProjectResponse
    }),
    getters: {
        curProjectSettings: (state): ProjectSettings => {
            const allVerSettings = Object.values(state.project.data.attributes.settings)
            // 从 allVerSettings 中找到 current 为 true 的 settings
            const currentSettings = allVerSettings.find((setting: ProjectSettings) => setting.current)
            if (!currentSettings) {
                throw new Error('current project settings not found')
            }
            return currentSettings
        },
        curQcSettings(): QcSettings {
            return this.curProjectSettings.qcSettings
        },
        taskPhases(): string[] {
            return this.project.included?.filter((item) => item.type === 'taskphases').map((item) => item.attributes.name) || []
        },
        curLabelSettings(): LabelSettings {
            return this.curProjectSettings.labelSettings
        }
    },
    actions: {
        async fetchProjectMeta() {
            // 设置授权信息的逻辑在 xtreme1_relay.html 中实现了, 这里不需要了.
            // setAuthInfoFromUrl()
            const urlParams = new URLSearchParams(window.location.search)
            // 从 url 查询参数中获取 taskId, ltmUrl, phase
            this.taskId = urlParams.get('taskid') || ''
            this.ltmUrl = urlParams.get('ltm') || ''
            this.phase = urlParams.get('phase') || ''
            if (!this.taskId || !this.ltmUrl || !this.phase) {
                throw new Error('taskId, ltmUrl, phase is required')
            }
            const taskRes = await getTask(this.taskId)
            this.task = taskRes
            console.log('task: ', this.task)
            // project id 从 task 的返回值中获取
            const projectId = this.task.data.relationships.project.data.id
            const projectRes = await getProject(projectId, ['tripphases', 'taskphases'])
            this.project = projectRes
            console.log('project: ', this.project)
            // 获取所有评论
            const commentStore = useCommentStore()
            commentStore.fetchAllComments()
        }
    }
})
