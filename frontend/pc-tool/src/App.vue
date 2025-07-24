<template>
    <ConfigProvider :locale="antdLocale">
        <Editor :lang="editorLang" />
    </ConfigProvider>
</template>

<script setup lang="ts">
    import { ConfigProvider } from 'ant-design-vue';
    import Editor from './components/Editor/index.vue';

    import enUS from 'ant-design-vue/es/locale/en_US';
    import zhCN from 'ant-design-vue/es/locale/zh_CN';

    const version = import.meta.env.VITE_APP_VERSION;
    console.log('version: ', version);

    // 读取 localStorage.lang
    const lang = localStorage.getItem('lang') || 'en-US';
    const antdLocale = lang === 'zh-CN' ? zhCN : enUS;
    const editorLang = lang === 'zh-CN' ? 'zh' : 'en';
</script>
