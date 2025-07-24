# 质检汇总面板

当前 tabs 的第三个 tab 是预留的工具面板. 需要将其改为 `@/ltmComponents/qcSummaryPanel/QcSummaryPanel.vue`. 这个面板后续会用来存放整个任务质检信息的汇总. 暂时可以先只放一个按钮, 点击这个按钮会将当前的数据帧跳转到第 3 帧. 这个按钮主要用来测试切换数据帧功能. 数据帧切换可以参考 `useFlowIndex` 中的 `onIndex` 方法.

## 主体功能

请实现 `QcSummaryPanel.vue` 的功能. 目前这个面板中的功能都是不需要的, 其中的按钮也只是用来测试切换数据帧功能. 请删除其中的内容重新实现相关功能. 这个面板主要分为两个部分: 操作区和数据展示区. 操作区只能在 `projectMetaStore.phase` 为 `qc` 时显示. 数据区则总是展示.

操作区中包含两个按钮: `pass` 和 `reject`. 点击不同的按钮会将任务设置成不同的阶段. 设置的逻辑可以参考旧版代码 `ltmRef/components/QcPanel/QcOperation.vue` 中的逻辑. 新版程序的 `taskPhases` 从 `projectMetaStore` 中获取. 样式和布局旧版的感觉不是太好看, 可以重新设计.

数据展示区需要展示质检的版本号, 质检的根评论总数以及按评论状态区分的各个根评论的基本信息. 其中版本号通过 `projectMetaStore.task.data.attributes.qcversion` 获取. 这里各个状态的评论展示也是使用 `CommentTree` 组件, 但是更加简洁. 只需要显示根评论即可, 也不需要显示各个标签. 但是点击评论后需要将当前帧切换到对应评论的首次出现帧且这里展示的是所有的评论而不是某一帧的评论, 也不是按照评论类型区分而是按照评论状态区分. 相关逻辑可以参考旧版代码 `ltmRef/components/QcPanel/QcInfo.vue` 中的逻辑. 评论树的展示可以重点参考 `src/ltmComponents/commentTree/FrameCommentTree.vue`, `src/ltmComponents/qualityPanel/useFrameComment.ts` 中的逻辑. 当然也可以参考 `ObjectCommentTree`, `useObjectComment` 等评论树的逻辑.
