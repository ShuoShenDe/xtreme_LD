# 对象信息面板

当前 tabs 的第四个 tab 是预留的 AnalyticsTab 面板. 需要将其改为 `@/ltmComponents/objectInfoPanel/ObjectInfoPanel.vue`. 这个面板主要用来展示选择对象的信息. 面板加载的时候获取当前选择的对象, 只展示第一个 `className` 为 `rect,polygon,polyline` 的对象信息. 先暂时给一个基本结构即可, 例如挂载时打印选择的对象, 侦听选择对象的事件变化并打印. 后续有补充更多细节, 包括使用 `json-editor-vue` 展示对象的属性或者根据配置文件以特定的组件展示部分对象属性. `config.ts` 中的图标也需要换成合适的图标.

## 主体功能

请帮忙完成 `ObjectInfoPanel.vue` 的实现并合理的组织 src/ltmComponents/objectInfoPanel 文件夹中的内容. 这个面板需要展示当前选择对象的属性. 目前的代码只是一个基本的框架, 需要进一步完善. 需求如下:

- 只展示选择列表中第一个的对象信息.
- 展示的模式分为 json 模式和组件模式两种. 默认是组件模式, 用户可切换.
- json 模式比较简单, 直接使用 `json-editor-vue` 展示对象的属性即可.
- 组件模式需要根据 `projectMetaStore.curLabelSettings` 中的配置来展示对象的属性. 这个配置文件会定义各个 `className` 的属性用何种组件展示. 如果选择的对象没有对应的配置, 则组件模式不展示任何信息同时在控制台给出警告.
- 下面是一个典型的 `labelSettings` 配置文件:

```json
"labelSettings": {
    "rect": {
    "commonProps": [
        {
        "label": "track name",
        "propName": "userData.trackName",
        "propType": "String",
        "propTypeSettings": {}
        },
        {
        "label": "class type",
        "propName": "userData.classType",
        "propType": "String",
        "propTypeSettings": {}
        }
    ],
    "objectProps": [
        {
        "label": "坐标x:",
        "propName": "attrs.x",
        "propType": "Number",
        "propTypeSettings": {
            "precision": 4
        }
        },
        {
        "label": "坐标y:",
        "propName": "attrs.y",
        "propType": "Number",
        "propTypeSettings": {
            "precision": 4
        }
        },
        {
        "label": "width",
        "propName": "attrs.width",
        "propType": "Number",
        "propTypeSettings": {
            "precision": 4
        }
        },
        {
        "label": "height",
        "propName": "attrs.height",
        "propType": "Number",
        "propTypeSettings": {
            "precision": 4
        }
        }
    ]
    }
}
```

这里定义了 `rect` 类型的对象需要以那些组件展示哪些属性. 首先所有类型的对象的属性都分成 `commonProps` 和 `objectProps` 两部分. 其中 `commonProps` 用来展示一些常用属性, 而一些高级, 不常用的属性则放在 `objectProps` 中. 对于某个具体的属性 `label` 定义了这个属性展示的标签, `propName` 定义了属性在对象中的路径, `propType` 定义了属性类型, 目前需要支持的属性类型包括 `Number, String, Boolean, StringMapping` 即可, `propTypeSettings` 定义了属性类型的设置. 如果发现 `propName` 对应的属性不存在, 则不展示这个属性.

在 `ltmRef/components/ObjInfoPanel.vue` 中有旧版代码, 可以参考. 同时在 `ltmRef/components/Objinfo/` 文件夹中有各个 `propType` 对应的组件定义. 新版本的代码应该也做成这样可以任意扩展 `propType` 的设计模式. 新版本组件需要额外增加一个组件颜色的参数, 方便后续高亮显示某个属性. 比如质检时发现某个物体的属性标错了, 可以用红色的背景色高亮该属性.

## 数据更新

2025年7月11日: 当用户修改完一个属性后, 请在 `handlePropertyChange` 回调函数中找到选择物体对应的属性并进行修改, 这样图像中对应的物体也会同步更新.

2025年7月11日: `ObjectProperties.vue` 中的的 `handlePropertyChange` 是不是向上传递到 `ObjectInfoPanel.vue` 中比较好. 在这里需要同时更新 `useObjectInfoPanel.ts` 中的 `selectedObject`, 因为它绑定了 object information 面板中的数据, 以及 `useObjectPropertyUpdate.ts` 中的 `updateObjectProperty`, 因为它绑定了图片中的标注对象. 当然如果你认为在 `ObjectProperties.vue` 中更新比较好, 也可以.

2025年7月11日: 下面是我需要更新属性的配置文件:

```json
"objectProps": [
    {
    "label": "坐标x:",
    "propName": "attrs.x",
    "propType": "Number",
    "propTypeSettings": {
        "precision": 4
    }
    },
    {
    "label": "坐标y:",
    "propName": "attrs.y",
    "propType": "Number",
    "propTypeSettings": {
        "precision": 4
    }
    },
    {
    "label": "width",
    "propName": "attrs.width",
    "propType": "Number",
    "propTypeSettings": {
        "precision": 4
    }
    },
    {
    "label": "height",
    "propName": "attrs.height",
    "propType": "Number",
    "propTypeSettings": {
        "precision": 4
    }
    }
]
```

我发现更新 `width` 和 `height` 属性后, 图像中的物体是正常更新的. 但是更新 `x` 和 `y` 属性后, 虽然图像中物体的四个角点和文字正常移动, 但是矩形框并没有移动. 请帮忙分析更新逻辑并修正. 通过鼠标拖拽可以正常的修改 x,y,width,height, 所以你的代码应该深入分析鼠标操作的流程, 这里通过输入控件应该达到和拖拽一样的效果. 这个问题比较棘手, 之前修改过很多版本都没有解决这个问题. 现在通过控件修改后虽然显示不正确, 但是保存数据重新刷新页面, 可以发现数据是正常保存的, 而且修改后通过鼠标再次拖拽, 画面也会瞬间变成正确的. 所有还是需要以深入分析鼠标拖拽事件作为切入点.

2025年7月11日: 通过在物体属性中的修改能够正常更新图片中的物体属性了. 但是当通过鼠标拖拽修改物体的 `x,y,width,height` 属性后, 虽然图像中的属性更新了但是 object info 面板中对应的属性值没有更新. 请帮忙完成这部分功能, 即 object info 面板的属性更新同步到图片中的物体属性同时图片中物体属性的更新也能正确同步到 `useObjectInfoPanel.ts` 中的 `selectedObject` 中.

## NumberEditor 更新优化

目前 `NumberEditor.vue` 组件还比较简陋, 无法通过配置文件配置 `min, max, step` 等属性. 请将 `a-input` 改为 `a-input-number`. 当配置文件中包含对应的属性时, 也同样设置到 `a-input-number` 中. 例如对于如下的配置文件:

```json
{
    "label": "height",
    "propName": "attrs.height",
    "propType": "Number",
    "propTypeSettings": {
        "precision": 4,
        "step": 1,
        "min": 0
    }
}
```

就会给 `a-input-number` 设置 `precision, step, min` 属性.

## 源编辑面板

请帮我分析一下, `ResultList.vue` 中点击物体的 `edit` 按钮触发 `onAction(IAction.edit, item)` 后, 在图像上方弹出的物体属性编辑面板这个组件在哪. 后续我希望直接将这个面板复制一份放到 `ObjectInfoPanel.vue` 中, 这样用户在 `ObjectInfoPanel.vue` 中也可以编辑物体的属性.

好的, 请根据你的分析将 `src/package/image-ui/components/EditClass/` 文件夹下的相关内容复制到 `objectInfoPanel/` 目录下, 进行相应的调整, 然后集成到 `ObjectInfoPanel.vue` 中的 `object-properties` 组件下方. 即用户在 `Component Mode` 下可以通过 `object-properties` 组件编辑一些属性, 也可以通过原来固有的 `EditClass` 组件编辑一些属性.
