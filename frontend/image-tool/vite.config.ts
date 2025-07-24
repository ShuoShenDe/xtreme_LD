import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
const fs = require('fs');

const localConfig = getLocalConfig();

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

function pathResolve(dir: string) {
  return resolve(__dirname, dir);
}
const config = defineConfig({
  server: {
    open: true,
    port: 3300,
    proxy: {
      '/api': {
        changeOrigin: true,
        target: 'http://localhost:8190',
      },
      '/efficiency': {
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/efficiency/, ''),
        target: 'http://localhost:8001'
      },
    },
  },
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^\/@\//, replacement: pathResolve('src/') + '/' },
      { find: '@', replacement: pathResolve('src/') + '/' },
      {
        find: /^image-editor/,
        replacement: '/src/package/image-editor',
      },
      {
        find: /^image-ui/,
        replacement: '/src/package/image-ui',
      },
      {
        find: /^@efficiency/,
        replacement: pathResolve('../efficiency') + '/',
      },
    ],
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    // Vue 3 特性标志
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    // vue-i18n 特性标志
    __VUE_I18N_FULL_INSTALL__: false,
    __VUE_I18N_LEGACY_API__: false,
    __VUE_I18N_PROD_DEVTOOLS__: false,
  }
});

module.exports = mergeConfig(config, localConfig);

function getLocalConfig() {
  // 添加调试信息
  console.log('Vite Config Debug Info:');
  console.log('  process.env.CI:', process.env.CI);
  console.log('  process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('  process.env.VITE_CI:', process.env.VITE_CI);
  
  // CI环境中使用CI专用的Mock配置
  const isCI = process.env.CI === 'true';
  const isTestEnv = process.env.NODE_ENV === 'test';
  const isViteCI = process.env.VITE_CI === 'true';
  
  console.log('  Condition check:', { isCI, isTestEnv, isViteCI });
  
  if (isCI || isTestEnv || isViteCI) {
    let ciFile = pathResolve('./vite.config.ci.js');
    console.log('  Looking for CI config at:', ciFile);
    console.log('  CI config exists:', fs.existsSync(ciFile));
    
    if (fs.existsSync(ciFile)) {
      try {
        console.log('✅ Loading CI mock configuration...');
        const ciConfig = require(ciFile);
        console.log('  CI config loaded successfully');
        return ciConfig;
      } catch (e) {
        console.warn('❌ Failed to load CI config:', e);
      }
    } else {
      console.warn('⚠️ CI config file not found at:', ciFile);
    }
  }
  
  // 本地开发环境使用local配置
  let file = pathResolve('./vite.config.local.js');
  console.log('  Looking for local config at:', file);
  console.log('  Local config exists:', fs.existsSync(file));
  
  let config = {};
  if (fs.existsSync(file)) {
    try {
      config = require(file);
      console.log('✅ Local config loaded');
    } catch (e) {
      console.warn('❌ Failed to load local config:', e);
    }
  } else {
    console.log('ℹ️ No local config found, using default');
  }
  
  return config;
}
