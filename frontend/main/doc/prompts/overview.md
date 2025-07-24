# Overview

## 项目的布局

这是一个开源项目中的前端子项目. 我希望基于这个项目进行一些修改. 首先我需要了解一下这个项目的基本框架并先做简单的样式和布局修改. 我看到这个项目登录后的默认页面是 `recents` 页面, 这个页面只定义了子页面区域. 整个页面的左侧导航栏是在哪里定义的呢? 请通过路由的配置文件帮我了解页面布局相关的代码.

从实际效果看, 这个项目应该没有用到 `layouts` 目录中的所有布局. 页面上只有左边一个导航栏, 右边是子页面区域. 请根据路由或者 `App.vue` 文件的具体使用逻辑, 帮我分析实际上是在哪里定义的左侧的导航栏. 比如我希望修改左侧导航栏中的 logo, 请帮我找到相关的代码.

左侧导航栏的层级关系:

```text
layouts/default/index.vue
  └── LayoutSideBar (sider/index.vue)
       └── LayoutSider (sider/LayoutSider.vue)
            └── LayoutMenu (menu/index.vue)
                 └── AppLogo (components/Application/src/AppLogo.vue)
```
