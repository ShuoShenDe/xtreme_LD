<template>
    <ConfigProvider :locale="currentLocale">
        <Suspense>
            <template #default>
                <AsyncApp />
            </template>
            <template #fallback>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>{{ t('app.loading.title') }}</p>
                </div>
            </template>
            <template #error="{ error }">
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h3>{{ t('app.error.title') }}</h3>
                    <p>{{ error.message }}</p>
                    <button @click="handleRetry" class="retry-btn">
                        {{ t('app.error.retry') }}
                    </button>
                </div>
            </template>
        </Suspense>
    </ConfigProvider>
</template>

<script setup lang="ts">
    import { ConfigProvider } from 'ant-design-vue';
    import enUS from 'ant-design-vue/es/locale/en_US';
    import zhCN from 'ant-design-vue/es/locale/zh_CN';
    import { Suspense } from 'vue';
    import AsyncApp from './AsyncApp.vue';
    import { computed, onMounted } from 'vue';
    import { useI18n } from 'vue-i18n';
    import { useProjectMetaStore } from './stores/projectMeta';
    import { setDevAuthToken } from './utils/dev-auth';

    const { t } = useI18n();

    const version = import.meta.env.VITE_APP_VERSION;
    console.log('version: ', version);

    // 根据 localStorage 中的 lang 值动态设置语言
    const currentLocale = computed(() => {
        const lang = localStorage.getItem('lang');
        return lang === 'zh-CN' ? zhCN : enUS;
    });

    // 处理重新加载
    const handleRetry = () => {
        window.location.reload();
    };
    onMounted(() => {
        // 开发环境下自动设置认证token（仅在需要时）
        if (import.meta.env.DEV) {
            setDevAuthToken();
        }
        useProjectMetaStore().fetchProjectMeta();
    });
</script>

<style scoped>
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f0f2f5;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e6e6e6;
    border-top: 4px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-container p {
    color: #666;
    font-size: 14px;
    margin: 0;
}

.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: #f0f2f5;
    text-align: center;
}

.error-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.error-container h3 {
    color: #ff4d4f;
    margin: 0 0 8px 0;
    font-size: 18px;
}

.error-container p {
    color: #666;
    margin: 0 0 24px 0;
    font-size: 14px;
    max-width: 400px;
}

.retry-btn {
    padding: 8px 16px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
}

.retry-btn:hover {
    background: #40a9ff;
}
</style>
