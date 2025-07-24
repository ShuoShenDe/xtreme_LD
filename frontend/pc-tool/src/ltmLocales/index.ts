import { App } from "vue";
import { createI18n } from "vue-i18n";
import type { I18n } from "vue-i18n";

export async function createI18nOptions() {
  let locale = localStorage.getItem("lang") || "en";
  if (locale === "en-US") {
    locale = "en";
  }

  // 加载所有语言包并合并嵌套结构
  const [zhCN, en] = await Promise.all([
    import("./langs/zh-CN"),
    import("./langs/en"),
  ]);
  console.log(en)

  // 调试输出语言包结构

  return {
    locale,
    messages: {
      "zh-CN": zhCN.default,
      en: en.default,
    },
    fallbackLocale: "en",
    legacy: false,
    globalInjection: true,
    missingWarn: false,
    silentTranslationWarn: true,
  };
}

export const createI18nInstance = async () => {
  const options = await createI18nOptions();
  const i18n = createI18n(options);
  return i18n;
};

export default async function (app: App) {
  const i18n = await createI18nInstance();
  app.use(i18n);
}
