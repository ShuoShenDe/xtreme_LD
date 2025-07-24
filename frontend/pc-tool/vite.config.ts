const { defineConfig, mergeConfig } = require('vite');
const vue = require('@vitejs/plugin-vue');
const path = require('path');
const fs = require('fs');

let localConfig = getLocalConfig();
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
// https://vitejs.dev/config/
const config = defineConfig({
    server: {
        open: true,
        port: 3200,
        // api proxy when development
        proxy: {
            '/api': {
                changeOrigin: true,
                target: 'http://localhost:8190',
            },
            '/efficiency': {
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/efficiency/, ''),
                target: 'http://localhost:8001',
            },
        },
    },
    plugins: [vue()],
    resolve: {
        alias: [
            { find: 'pc-render', replacement: path.resolve(__dirname, './src/packages/pc-render') },
            { find: 'pc-editor', replacement: path.resolve(__dirname, './src/packages/pc-editor') },
            { find: '@efficiency', replacement: path.resolve(__dirname, '../efficiency') },
        ]
    },
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
        __VUE_I18N_FULL_INSTALL__: true,
        __VUE_I18N_LEGACY_API__: false,
        __VUE_I18N_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
});

module.exports = mergeConfig(config, localConfig);

function getLocalConfig() {
    // 添加调试信息
    console.log('PC-Tool Vite Config Debug Info:');
    console.log('  process.env.CI:', process.env.CI);
    console.log('  process.env.NODE_ENV:', process.env.NODE_ENV);
    console.log('  process.env.VITE_CI:', process.env.VITE_CI);
    
    // CI环境中使用CI专用的Mock配置
    const isCI = process.env.CI === 'true';
    const isTestEnv = process.env.NODE_ENV === 'test';
    const isViteCI = process.env.VITE_CI === 'true';
    
    console.log('  Condition check:', { isCI, isTestEnv, isViteCI });
    
    if (isCI || isTestEnv || isViteCI) {
        let ciFile = path.resolve(__dirname, './vite.config.ci.js');
        console.log('  Looking for PC-Tool CI config at:', ciFile);
        console.log('  PC-Tool CI config exists:', fs.existsSync(ciFile));
        
        if (fs.existsSync(ciFile)) {
            try {
                console.log('✅ Loading PC-Tool CI mock configuration...');
                const ciConfig = require(ciFile);
                console.log('  PC-Tool CI config loaded successfully');
                return ciConfig;
            } catch (e) {
                console.warn('❌ Failed to load PC-Tool CI config:', e);
            }
        } else {
            console.warn('⚠️ PC-Tool CI config file not found at:', ciFile);
        }
    }
    
    // 本地开发环境使用local配置
    let file = path.resolve(__dirname, './vite.config.local.js');
    console.log('  Looking for PC-Tool local config at:', file);
    console.log('  PC-Tool local config exists:', fs.existsSync(file));
    
    let config = {};
    if (fs.existsSync(file)) {
        try {
            config = require(file);
            console.log('✅ PC-Tool local config loaded');
        } catch (e) {
            console.warn('❌ Failed to load PC-Tool local config:', e);
        }
    } else {
        console.log('ℹ️ No PC-Tool local config found, using default');
    }
    
    return config;
}
