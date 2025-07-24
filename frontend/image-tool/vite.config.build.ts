const { defineConfig, mergeConfig } = require('vite');
const baseConfig = require('./vite.config');

// https://vitejs.dev/config/
module.exports = mergeConfig(baseConfig, {
    base: '/tool/image/',
    build: {
        outDir: '../dist/image-tool',
    },
    define: {
        // Vue 3 特性标志
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
        // vue-i18n 特性标志
        __VUE_I18N_FULL_INSTALL__: false,
        __VUE_I18N_LEGACY_API__: false,
        __VUE_I18N_PROD_DEVTOOLS__: false,
    }
});
