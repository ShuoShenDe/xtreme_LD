# 杂项

## 打印版本

`image-tool` 中可以在 `src/App.vue` 中打印版本号, 而 `pc-tool` 中没有这个功能. 请在 `pc-tool` 中添加这个功能.

## 语言切换

目前项目中使用的 i18n 是英文. 请调整代码, 让 antd 和 editor 中的 i18n 通过读取 local storage 中的 `lang` 来切换语言. `lang` 的取值为 `en-US` 或 `zh-CN`. 需要注意的是 editor 中的 i18n 需要通过 `editor.state.lang` 来切换语言且取值为 `en` 或 `zh`.

请参考 `image-tool` 中的 header 中的语言切换按钮, 实现 `pc-tool` 中的语言切换按钮. 只需要设置 local storage 中的 `lang` 为 `en-US` 或 `zh-CN`, 然后刷新页面即可. 语言切换逻辑在其他组件加载的时候已经实现了.

## 添加 Stats 拖拽功能

请仿照 `image-tool` 中的 Stats 拖拽功能, 实现 `pc-tool` 中的 Stats 拖拽功能.
