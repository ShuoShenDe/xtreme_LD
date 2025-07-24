# 绘制工具架构分析

## 1. 核心架构组件

### 工具管理流程
1. **工具配置** (`src/package/image-editor/configs/tools/`) - 定义工具的UI配置
2. **工具映射** (`src/package/image-editor/ImageView/shapeTool/index.ts`) - 工具名称到工具类的映射
3. **工具执行** (`src/package/image-editor/common/ActionManager/action/tool.ts`) - 通过ActionManager执行工具
4. **工具类** (`src/package/image-editor/ImageView/shapeTool/`) - 具体的绘制工具实现

### 绘制流程
1. 用户点击工具 → `useTool.ts` 的 `onTool()` 方法
2. 调用 `editor.actionManager.execute('drawTool', name)`
3. `drawTool` action 调用 `editor.mainView.enableDraw(type)`
4. `enableDraw` 获取对应的 `ShapeTool` 实例并调用 `tool.draw()`
5. 工具开始监听鼠标事件，绘制完成后触发 `object` 事件
6. 通过 `handleDrawToCmd` 将绘制的对象添加到画布

## 2. 现有工具类型
- **RectTool** - 矩形工具（拖拽绘制）
- **PolygonTool** - 多边形工具（点击添加点）
- **PolylineTool** - 多段线工具（点击添加点）
- **KeyPointTool** - 关键点工具（单次点击）

## 3. 关键类结构

**ShapeTool (基类):**
- `draw()` - 开始绘制
- `stopDraw()` - 停止绘制
- `onMouseDown/onMouseUp/onMouseMove` - 鼠标事件处理
- `onDraw()` - 绘制完成回调

**Shape (基类):**
- 继承自 Konva.Shape
- 实现 `IAnnotateObject` 接口
- 支持拖拽、选择等交互

## 4. 新增工具的扩展方式

- 新建 ShapeTool 子类，实现 draw/stopDraw/onMouseDown 等方法
- 新建 Shape 子类，实现 _sceneFunc 绘制形状
- 在 toolMap、tool-instance.ts、icons.ts、config.ts 等处注册
- 在 UIType、BsUIType、baseEditUI 等配置中注册

## 5. 典型交互流程

1. 选择工具栏工具，激活对应 ShapeTool
2. 在画布上操作，ShapeTool 监听鼠标事件并创建 Shape
3. Shape 通过命令系统添加到画布和数据结构
4. 支持撤销、重做、编辑、删除等操作

## 6. 维护建议

- 新增工具优先放到独立目录，减少与上游冲突
- 工具注册和 UI 配置需同步，避免工具不显示
- 鼠标事件、命令系统、Shape 结构需保持一致性

在 `src/package/image-editor/configs/icons.ts` 文件中定义了各个工具的图标, 图标目前使用的是 `iconfont` 图标库而不是 `ant-design/icons-vue` 图标库. 因此如果不对代码进行改造的话, 只能使用 `public/iconfont/` 文件夹中的图标. 因为对应的 `iconfont` 的项目也没有权限.

## 7. 工具显示/隐藏控制机制

### 1. isDisplay 方法
- 每个工具的配置（如 tool-instance.ts）都有 isDisplay 方法，决定该工具是否显示。
- 例如：
  ```ts
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_commentBubble];
  }
  ```
- 只要 isDisplay 返回 true，该工具就会显示在工具栏。

### 2. modeConfig.ui
- modeConfig.ui 是一个对象，key 为 UIType，value 为 boolean，决定每个工具的显示/隐藏。
- 业务层（如 baseEditUI、allUI、modeConfig）决定了 modeConfig.ui 里有哪些工具是 true。
- 你可以在业务代码里动态设置 `editor.state.modeConfig.ui[UIType.tool_commentBubble] = false`，前端会自动隐藏该工具。

### 3. 动态隐藏方法
- 运行时隐藏：
  ```js
  editor.state.modeConfig.ui['tool_commentBubble'] = false;
  editor.emit('update_view_mode'); // 触发刷新
  ```
- 只要 isDisplay 返回 false，工具就不会渲染。

### 4. 典型业务流程
- 业务初始化时根据 baseEditUI 等生成 modeConfig.ui。
- 运行时可通过修改 modeConfig.ui 动态控制工具显示。

---

如需扩展更多自定义工具，建议参考 KeyPointTool/CommentBubbleTool 的实现方式。 