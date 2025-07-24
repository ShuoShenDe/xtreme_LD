import { createApp, DefineComponent } from 'vue';
import { Router } from 'vue-router';
import VueClipboard from 'vue-clipboard2';
// import { setupI18n } from '/@/locales/setupI18n';
import Antd from 'ant-design-vue';
// import 'ant-design-vue/dist/antd.css';
import 'ant-design-vue/dist/antd.dark.css';

import './style/index.less';
import { createPinia } from 'pinia';
import i18n from './ltmLocales';

export async function init(App: DefineComponent<{}, {}, any>, router?: Router) {
    const app = createApp(App);
    app.use(VueClipboard);
    app.use(Antd);
    app.use(createPinia())

    if (router) app.use(router);
    await i18n(app);

    // await setupI18n(app);

    app.mount('#app');
}
