import { createApp, DefineComponent } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.dark.css';

import Vue3ColorPicker from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';

import './style/index.less';

import App from './App.vue';
import { PcToolIntegration } from '@efficiency/integrations/PcToolIntegration';
import { imageToolEfficiency } from '@efficiency/index';

// 初始化 EFFM 系统
let effmIntegration: PcToolIntegration | null = null;

async function initializeEFFM(): Promise<PcToolIntegration | null> {
    try {
        // 初始化基础 efficiency 模块，并重新配置为pc-tool
        await imageToolEfficiency.initialize({
            userId: getUserId() || 'anonymous',
            projectId: getProjectId() || 'default',
            taskId: getTaskId() || 'default',
            customConfig: {
                toolType: 'pc-tool', // 重写工具类型
                storage: {
                    enabled: true,
                    maxSize: 10 * 1024 * 1024,
                    storageKey: 'xtreme1-pc-tool-efficiency-tracker',
                    clearOnStart: false,
                }
            }
        });

        // 获取tracker实例
        const tracker = imageToolEfficiency.trackerInstance;
        if (!tracker) {
            throw new Error('Failed to get tracker instance');
        }

        // 创建 pc-tool 集成
        const integration = new PcToolIntegration({
            tracker,
            enableAutoTracking: true,
            trackRenderingPerformance: true,
            trackUserInteractions: true,
            trackAnnotationEvents: true,
        });
        
        if (isDevelopment()) {
            // 将 EFFM 实例暴露到全局，方便调试
            (window as any).effm = integration;
            (window as any).effmTracker = tracker;
            (window as any).effmBase = imageToolEfficiency;
        }

        return integration;
    } catch (error) {
        // Failed to initialize EFFM for pc-tool
        return null;
    }
}

// 辅助函数：获取用户ID
function getUserId(): string {
    // 尝试从URL参数、localStorage或其他地方获取
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId') || 
           localStorage.getItem('pc-tool-userId') || 
           `user-${Date.now()}`;
}

// 辅助函数：获取项目ID
function getProjectId(): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('projectId') || 
           localStorage.getItem('pc-tool-projectId') || 
           'default-project';
}

// 辅助函数：获取任务ID
function getTaskId(): string {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('taskId') || 
           localStorage.getItem('pc-tool-taskId') || 
           `task-${Date.now()}`;
}



// 辅助函数：判断是否为开发环境
function isDevelopment(): boolean {
    return import.meta.env.DEV || 
           window.location.hostname === 'localhost';
}

// 获取全局 EFFM 实例
export function getEFFMIntegration(): PcToolIntegration | null {
    return effmIntegration;
}

import { createPinia } from 'pinia';
import i18n from './ltmLocales'

export async function init(App: DefineComponent<{}, {}, any>) {
    const app = createApp(App);
    app.use(Antd);
    app.use(Vue3ColorPicker);
    app.use(createPinia());
    await i18n(app);

    // 初始化 EFFM
    effmIntegration = await initializeEFFM();

    // 提供 EFFM 实例给整个应用
    if (effmIntegration) {
        app.provide('effmIntegration', effmIntegration);
    }

    app.mount('#app');

    // 页面卸载时清理 EFFM
    window.addEventListener('beforeunload', () => {
        if (effmIntegration) {
            effmIntegration.destroy();
        }
    });
}

(async () => {
    await init(App);
})();
