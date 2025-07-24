# 质检面板

`ltmRef/` 文件夹中存放了其他 viz 项目中的质检面板, 我希望将它迁移到本项目中. 并进行相应的调整, 如:

- 样式使用本项目风格的样式.
- UI 组件库和图标也使用本项目的 `ant-design-vue` 和 `@ant-design/icons-vue`.
- 不需要 i18n 进行国际化, 直接使用英文即可.

首先先仿照 viz 中的 `CollapsePanel.vue` 和 `QualityPanel.vue` 文件完成本项目中的 `CollapsePanel.vue` 和 `QualityPanel.vue` 文件. `CollapsePanel.vue` 文件主要是定义了一个折叠面板, 而 `QualityPanel.vue` 创建了四个折叠面板分别用来存放 `Object QC`, `Sensor QC`, `Current Frame QC` 和 `Task QC` 的折叠面板. 具体的数据内容先不实现, 后续再考虑数据的加载和显示.

## 质检评论的获取

在 `ltmRef/api_v1/comment.ts` 文件夹中包含了旧的质检评论获取的 API 定义, 这里的请求是基于标准的 jsonapi 定义的. comment 的数据库的表结构定义如下:

```ts
Comment: {
    category: String, //类型,比如 Project,Script,Pipeline,Trip,Task等
    belong: String, // 评论的主体，属于谁的评论trip或task的id
    parent: String, //父节点id,哪一个评论的回复
    content: String, //评论内容
    params: Object, //评论不同属性
    type: String, //任务评论的类型，如 task、sensor、frame、area、object
    target: String, //任务评论的目标，task 填写 task id、sensor 填写名称、frame 填写创建时的帧索引、area、object时写对应object_id.
    frames: Array(String), // 评论frame、area、object时，需要填写帧id
    version: String, //第几轮评论
    creator: String, //记录的创建或维护人
    created: Date, //记录的创建时间
    updated: Date, //记录的修改时间
}
```

请参考旧版本中的定义以及本项目中 `ltmApi/types/project.ts` 文件 project 的类型定义以及 `ltmApi/project.ts` 文件中 project 的实现完成 `ltmApi/types/comment.ts` 文件的类型定义以及 `ltmApi/comment.ts` 文件的实现. 两者都是 jsonapi 的接口定义.

## 评论树组件

`ltmRef/components/CommentTree/Comment.vue, CommentTree.vue, types.ts` 文件中包含了旧版评论树组件的实现, 请对应的在 `ltmComponents/commentTree/` 文件夹中实现. 使用本项目中的 `ant-design-vue` 和 `@ant-design/icons-vue` 组件库及图标. 以便供后续各个评论组件树实现时使用.

现在请仿照旧版的 `ltmRef/components/CommentTree/TaskCommentTree.vue` 文件, 在 `ltmComponents/commentTree/` 文件夹中实现 `TaskCommentTree.vue` 文件. 数据先直接使用假数据, 不用考虑复杂的配置解析和 store 中数据库中的数据到 commenttree 组件数据的转换. 然后仿照旧版 `ltmRef/components/QualityPanel.vue` 文件中的 `TaskCommentTree` 组件的使用在 `src/ltmComponents/qualityPanel/QualityPanel.vue` 文件中使用 `TaskCommentTree` 组件.

2025年6月30日: 现在已经完成了 `TaskQcDialog.vue` 的实现能够添加任务评论了, 现在可以进一步的完善 `TaskCommentTree.vue` 组件用来展示评论以及评论的回复. 首先移除测试使用的假数据, 然后参考 `ltmRef/components/CommentTree/TaskCommentTree.vue` 文件中的实现, 实现 `TaskCommentTree.vue` 文件.

- commentStore 中存放了所有的评论数据, 包括 task, sensor, frame, area, object 的评论, 这里需要过滤出 task 的评论数据. 另外数据库中 comment 的数据格式和 `CommentTree.vue` 组件的类型定义不一致, 需要进行转换. 这些方法也许放到现在的 `src/ltmComponents/qualityPanel/useTaskComment.ts` 文件中实现比较好, 你根据最佳实践自行选择实现位置.
- 数据库中 comment 的 `parent` 字段是父节点的 id, 如果为 `null` 表示是根节点.
- 渲染评论的时候需要读取 `projectMetaStore.curQcSettings.taskComponents` 中的配置, 如果配置了 `rejectReason`, 则需要将对应的数据按照配置渲染成 label.

## QC 设置

目前 `ProjectSettings` 中的 `qcSettings` 的类型为 `any`, 实际上这个配置的结构有一定的规则, 如下是一个配置示例:

```json
"qcSettings": {
    "frameInfo": {},
    "annotationComponents": {
        "area": {
            "objectInfo": [],
            "objectComponents": [
                {
                    "type": "rejectReason",
                    "valueName": "rejectReasons",
                    "options": [
                        {
                            "label": "漏标",
                            "value": "value3",
                            "forObject": false,
                            "forNonObject": true,
                            "description": "漏标"
                        }
                    ]
                },
                {
                    "type": "frameRange",
                    "valueName": "frameRange"
                },
                {
                    "type": "comment",
                    "valueName": "comment"
                }
            ]
        },
        "box3d": {
            "objectInfo": [
                {
                    "label": "id",
                    "propName": "id",
                    "propType": "Number",
                    "propTypeSettings": {},
                    "canCheck": false,
                    "valueName": "valueName1"
                },
                {
                    "label": "分类",
                    "propName": "type",
                    "propType": "String",
                    "propTypeSettings": {},
                    "canCheck": true,
                    "valueName": "wrongType"
                },
                {
                    "label": "分类标签真值",
                    "propName": "class_label_true",
                    "propType": "String",
                    "propTypeSettings": {},
                    "canCheck": true,
                    "valueName": "wrongClassLabelTrue"
                },
                {
                    "label": "子分类标签真值",
                    "propName": "subclass_label_true",
                    "propType": "String",
                    "propTypeSettings": {},
                    "canCheck": true,
                    "valueName": "wrongSubclassLabelTrue"
                }
            ],
            "objectComponents": [
                {
                    "type": "rejectReason",
                    "valueName": "rejectReasons",
                    "options": [
                        {
                            "label": "多标",
                            "value": "value2",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "多标"
                        },
                        {
                            "label": "漏标",
                            "value": "value3",
                            "forObject": false,
                            "forNonObject": true,
                            "description": "漏标"
                        },
                        {
                            "label": "不贴合",
                            "value": "value4",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "不贴合"
                        },
                        {
                            "label": "方向错误",
                            "value": "value5",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "方向错误"
                        },
                        {
                            "label": "ID变化",
                            "value": "value6",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "ID变化"
                        },
                        {
                            "label": "主分类错误",
                            "value": "value7",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "主分类错误"
                        },
                        {
                            "label": "子分类错误",
                            "value": "value8",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "子分类错误"
                        },
                        {
                            "label": "框旋转",
                            "value": "value9",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "框旋转"
                        },
                        {
                            "label": "移动状态错误",
                            "value": "value10",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "移动状态错误"
                        },
                        {
                            "label": "车门选项错误",
                            "value": "value11",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "车门选项错误"
                        },
                        {
                            "label": "CIPV错误",
                            "value": "value12",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "CIPV错误"
                        },
                        {
                            "label": "遮挡错误",
                            "value": "value13",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "遮挡错误"
                        },
                        {
                            "label": "截断错误",
                            "value": "value14",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "截断错误"
                        },
                        {
                            "label": "模糊错误",
                            "value": "value15",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "模糊错误"
                        },
                        {
                            "label": "车灯错误",
                            "value": "value16",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "车灯错误"
                        },
                        {
                            "label": "偏移属性错误",
                            "value": "value17",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "偏移属性错误"
                        },
                        {
                            "label": "三轮车选项错误",
                            "value": "value18",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "三轮车选项错误"
                        }
                    ]
                },
                {
                    "type": "frameRange",
                    "valueName": "frameRange"
                },
                {
                    "type": "comment",
                    "valueName": "comment"
                }
            ]
        },
        "box2d": {
            "objectInfo": [
                {
                    "label": "id",
                    "propName": "id",
                    "propType": "Number",
                    "propTypeSettings": {},
                    "canCheck": false,
                    "valueName": "valueName1"
                },
                {
                    "label": "分类",
                    "propName": "type",
                    "propType": "String",
                    "propTypeSettings": {},
                    "canCheck": true,
                    "valueName": "wrongType"
                }
            ],
            "objectComponents": [
                {
                    "type": "rejectReason",
                    "valueName": "rejectReasons",
                    "options": [
                        {
                            "label": "多标",
                            "value": "value2",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "多标"
                        },
                        {
                            "label": "漏标",
                            "value": "value3",
                            "forObject": false,
                            "forNonObject": true,
                            "description": "漏标"
                        },
                        {
                            "label": "不贴合",
                            "value": "value4",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "不贴合"
                        },
                        {
                            "label": "方向错误",
                            "value": "value5",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "方向错误"
                        },
                        {
                            "label": "ID变化",
                            "value": "value6",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "ID变化"
                        },
                        {
                            "label": "主分类错误",
                            "value": "value7",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "主分类错误"
                        },
                        {
                            "label": "子分类错误",
                            "value": "value8",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "子分类错误"
                        },
                        {
                            "label": "框旋转",
                            "value": "value9",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "框旋转"
                        },
                        {
                            "label": "移动状态错误",
                            "value": "value10",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "移动状态错误"
                        },
                        {
                            "label": "车门选项错误",
                            "value": "value11",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "车门选项错误"
                        },
                        {
                            "label": "CIPV错误",
                            "value": "value12",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "CIPV错误"
                        },
                        {
                            "label": "遮挡错误",
                            "value": "value13",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "遮挡错误"
                        },
                        {
                            "label": "截断错误",
                            "value": "value14",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "截断错误"
                        },
                        {
                            "label": "模糊错误",
                            "value": "value15",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "模糊错误"
                        },
                        {
                            "label": "车灯错误",
                            "value": "value16",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "车灯错误"
                        },
                        {
                            "label": "偏移属性错误",
                            "value": "value17",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "偏移属性错误"
                        },
                        {
                            "label": "三轮车选项错误",
                            "value": "value18",
                            "forObject": true,
                            "forNonObject": false,
                            "description": "三轮车选项错误"
                        }
                    ]
                },
                {
                    "type": "frameRange",
                    "valueName": "frameRange"
                },
                {
                    "type": "comment",
                    "valueName": "comment"
                }
            ]
        }
    },
    "sensorComponents": [
        {
            "type": "rejectReason",
            "valueName": "rejectReasons",
            "options": [
                {
                    "label": "传感器数据质量低",
                    "value": "value1",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "传感器数据质量低"
                }
            ]
        },
        {
            "type": "frameRange",
            "valueName": "frameRange"
        },
        {
            "type": "comment",
            "valueName": "comment"
        }
    ],
    "frameComponents": [
        {
            "type": "rejectReason",
            "valueName": "rejectReasons",
            "options": [
                {
                    "label": "本帧错误太多",
                    "value": "value1",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "本帧错误太多"
                }
            ]
        },
        {
            "type": "frameRange",
            "valueName": "frameRange"
        },
        {
            "type": "comment",
            "valueName": "comment"
        }
    ],
    "taskComponents": [
        {
            "type": "rejectReason",
            "valueName": "rejectReasons",
            "options": [
                {
                    "label": "整个任务错误太多",
                    "value": "value1",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "整个任务错误太多"
                }
            ]
        },
        {
            "type": "comment",
            "valueName": "comment"
        }
    ]
}
```

在 `ltmRef/store/types/comment.ts` 文件中定义了旧版的 `CommentMetadata` 类型, 请仿照旧版的定义, 在 `src/stores/types/projectMeta.ts` 文件中完成 `QcSettings` 的类型定义.

## 质检评论类型定义

目前 `CommentAttributes` 中 `params` 的类型为 `Record<string, any>`, 事实上这个字段的类型是有一定规则的. 下面是各个评论的示例:

```json
{
    "jsonapi": {
        "version": "1.0"
    },
    "meta": {
        "count": 5
    },
    "links": {
        "self": "/models/comments?filter%5Bcategory%5D=task&filter%5Bbelong%5D=LD46423e1b&filter%5Btype%5D=sensor%2Ctask%2Carea%2Cobject%2Cframe"
    },
    "data": [
        {
            "type": "comments",
            "id": "LD68537b7add0c69002fce11d7",
            "attributes": {
                "category": "task",
                "belong": "LD46423e1b",
                "parent": null,
                "content": "前两帧分类错误",
                "params": {
                    "annotationProps": {
                        "id": 1,
                        "annotation_type": "box2d",
                        "__sensorTopicId__": "1camera_front_wide",
                        "__topicId__": "5camera_front_wide",
                        "x1": 0.24852800369262695,
                        "y1": 0.49531668424606323
                    },
                    "sensorProps": {
                        "topicId": "1camera_front_wide",
                        "topicName": "camera_front_wide",
                        "type": "camera"
                    },
                    "commentProps": {
                        "sensorTopicId": "1camera_front_wide",
                        "type": "box2d",
                        "timestamp": 1738824089008,
                        "position": {
                            "x": 0.24852800369262695,
                            "y": 0.49531668424606323,
                            "z": 0
                        }
                    },
                    "objectPropChecks": {
                        "valueName1": false,
                        "wrongType": true
                    },
                    "rejectReasons": [
                        "value4",
                        "value7"
                    ],
                    "frameRange": {
                        "type": "custom",
                        "start": 1,
                        "end": 2
                    },
                    "status": [
                        {
                            "operator": "test",
                            "created": "2025-06-19T02:52:45.925Z",
                            "status": "open"
                        }
                    ]
                },
                "type": "object",
                "target": null,
                "frames": [
                    "0",
                    "1"
                ],
                "version": "1",
                "creator": "test",
                "created": "2025-06-19T02:52:45.925Z",
                "updated": "2025-06-19T02:52:42.468Z"
            },
            "links": {
                "self": "/models/comments/LD68537b7add0c69002fce11d7"
            }
        },
        {
            "type": "comments",
            "id": "LD68537baedd0c69002fce11d8",
            "attributes": {
                "category": "task",
                "belong": "LD46423e1b",
                "parent": null,
                "content": "漏标太多",
                "params": {
                    "rejectReasons": [
                        "value1"
                    ],
                    "frameRange": {
                        "type": "current",
                        "start": 0,
                        "end": 0
                    },
                    "status": [
                        {
                            "operator": "test",
                            "created": "2025-06-19T02:53:37.671Z",
                            "status": "open"
                        }
                    ]
                },
                "type": "frame",
                "target": null,
                "frames": [
                    "2"
                ],
                "version": "1",
                "creator": "test",
                "created": "2025-06-19T02:53:37.671Z",
                "updated": "2025-06-19T02:53:34.195Z"
            },
            "links": {
                "self": "/models/comments/LD68537baedd0c69002fce11d8"
            }
        },
        {
            "type": "comments",
            "id": "LD68537becdd0c69002fce11d9",
            "attributes": {
                "category": "task",
                "belong": "LD46423e1b",
                "parent": null,
                "content": "任务中太多目标物不贴合",
                "params": {
                    "rejectReasons": [
                        "value1"
                    ],
                    "status": [
                        {
                            "operator": "test",
                            "created": "2025-06-19T02:54:40.298Z",
                            "status": "open"
                        }
                    ]
                },
                "type": "task",
                "target": null,
                "frames": [
                    "2"
                ],
                "version": "1",
                "creator": "test",
                "created": "2025-06-19T02:54:40.298Z",
                "updated": "2025-06-19T02:54:36.818Z"
            },
            "links": {
                "self": "/models/comments/LD68537becdd0c69002fce11d9"
            }
        },
        {
            "type": "comments",
            "id": "LD68537c07dd0c69002fce11da",
            "attributes": {
                "category": "task",
                "belong": "LD46423e1b",
                "parent": null,
                "content": "后面的相机模糊",
                "params": {
                    "sensorProps": {
                        "topicId": "1camera_front_wide",
                        "topicName": "camera_front_wide",
                        "type": "camera"
                    },
                    "rejectReasons": [
                        "value1"
                    ],
                    "frameRange": {
                        "type": "custom",
                        "start": 3,
                        "end": 5
                    },
                    "status": [
                        {
                            "operator": "test",
                            "created": "2025-06-19T02:55:06.758Z",
                            "status": "open"
                        }
                    ]
                },
                "type": "sensor",
                "target": null,
                "frames": [
                    "2",
                    "3",
                    "4"
                ],
                "version": "1",
                "creator": "test",
                "created": "2025-06-19T02:55:06.758Z",
                "updated": "2025-06-19T02:55:03.280Z"
            },
            "links": {
                "self": "/models/comments/LD68537c07dd0c69002fce11da"
            }
        },
        {
            "type": "comments",
            "id": "LD685d24a6e798b6002f4ad539",
            "attributes": {
                "category": "task",
                "belong": "LD46423e1b",
                "parent": null,
                "content": null,
                "params": {
                    "annotationProps": {},
                    "sensorProps": {
                        "topicId": "1camera_front_wide",
                        "topicName": "camera_front_wide",
                        "type": "camera"
                    },
                    "commentProps": {
                        "sensorTopicId": "1camera_front_wide",
                        "type": "area",
                        "timestamp": 1738824089008,
                        "position": {
                            "x": 0.4935064935064935,
                            "y": 0.5387205387205388,
                            "z": 0
                        }
                    },
                    "objectPropChecks": {},
                    "rejectReasons": [
                        "value3"
                    ],
                    "frameRange": {
                        "type": "current",
                        "start": 0,
                        "end": 0
                    },
                    "status": [
                        {
                            "operator": "test",
                            "created": "2025-06-26T10:44:53.543Z",
                            "status": "open"
                        }
                    ]
                },
                "type": "area",
                "target": "edd39cb9-216b-4ab6-b688-f5e165796e80",
                "frames": [
                    "0"
                ],
                "version": "1",
                "creator": "test",
                "created": "2025-06-26T10:44:53.544Z",
                "updated": "2025-06-26T10:44:54.694Z"
            },
            "links": {
                "self": "/models/comments/LD685d24a6e798b6002f4ad539"
            }
        }
    ]
}
```

其中 `object` 类型的评论最为复杂, 需要记录标注物体的 `annotationProps` 其内部的属性确实不可预知, 可以为 `any`, 同样必定包括 `sensorProps` 其内部属性也不知道, `commentProps` 数据是 `object, area` 类型评论都有的属性, 内部属性字段也固定, 用来记录在哪个图像的哪个位置画一个评论气泡. `objectPropChecks` 内部的属性也不知道. 其他的属性也比较好理解, 请根据实际数据的情况完成 `ltmApi/types/comment.ts` 文件中 `Params` 的类型定义并使用.

## commentStore

在 `ltmRef/store/types/comment.ts` 和 `src/stores/modules/comment.ts` 文件中定义了旧版的 comment store. 新版的 store 类型定义我已经完成了基本的内容. 请完成 `src/stores/comment.ts` 的实现. 仿照旧版的 `fetchComments` 和 `fetchAllComments` 完成新版的 `fetchAllComments` 和 `currentFrameComments`的实现, 旧版的是分两次获取数据会浪费网络请求, 新版只需要一次获取数据. 然后当前帧的数据通过计算属性计算即可.

## TaskQcDialog

在 `ltmRef/components/qualityPanelSubComps/TaskQcDialog.vue` 文件中定义了旧版的任务质检评论对话框. 在 `ltmRef/components/QualityPanel.vue` 文件中使用. 请仿照旧版的 `TaskQcDialog.vue` 文件实现新版的 `src/ltmComponents/qualityPanel/TaskQcDialog.vue` 文件. 旧版的实现比较复杂, 新版实现的时候可以考虑使用更加清晰的方式.

- 组件传入的 comment 可以为 null, 当为 null 时, 表示是新增评论. 默认生成一个合法的空的 task comment 对象即可, 这一部分可以参考旧版的 `ltmRef/store/modules/comment.ts` 文件中的 `getDefaultTaskComment`.
- task comment 是最简单的评论类型, 目前只可能有 rejectReason 和 comment 两种类型的组件, 根据 `projectMetaStore.curQcSettings.taskComponents` 中的配置渲染即可.
- 在旧版的 store 和组件中有完整的实现, 这些实现功能没有问题, 因此你可以在实现的过程中进行参考. 但是请考虑编写更加清晰和简洁的代码. 使用 `ant-design-vue` 和 `@ant-design/icons-vue` 实现, 必要时可以考虑使用更加符合 vue3 的写法, 如像当前项目样使用 `useXxx.ts` 文件来封装逻辑.
- 如果需要创建 composable 请在 `src/ltmComponents/` 文件夹下相应的位置创建. 如果需要进行 i18n 翻译文件的创建, 应该在 `src/ltmLocales/` 文件夹下相应的位置创建.

2025年6月30日: 发现了几个问题请帮忙优化一下:

- 点击添加任务评论后, 虽然打印了 `Adding task comment` 等日志但是并没有弹出对话框.
- createDefaultTaskComment 中 `frames` 固定填写了 `[0]` 但最好填写当前帧的索引, 参考代码如下:

```ts
const editor = (window as any).editor as Editor
if (!editor) {
    console.error('Editor not initialized yet, cannot get current frame comments')
    return []
}
const currentFrame = editor.getCurrentFrame()
const frameIdx = editor.getFrameIndex(currentFrame.id)
```

- createDefaultTaskComment 中的 `version` 固定填写了 `1` 但是该值应该从 `projectMetaStore.task.data.attributes.qcversion` 中获取.
- `commentStore` 中除了 `currentFrameComments` 和 `fetchAllComments` 是当前必须的方法以外, 我发现还增加了很多其他的方法. 我觉得如果这些方法暂时不用的话还是先删除, 这样代码逻辑更加清晰一些. 后续如果需要使用再进行添加.

## FrameQcDialog

请仿照 `TaskQcDialog.vue` 文件中添加任务质检评论的代码完成 `src/ltmComponents/qualityPanel/FrameQcDialog.vue` 文件的实现. 这里只是增加了一个 `frameRange` 类型的组件. 同时在 `ltmRef/components/qualityPanelSubComps/FrameQcDialog.vue` 文件中有旧版本的实现, 也可以参考. 旧版本的 `ltmRef/store/modules/comment.ts` 文件中有如何获取默认的评论可以进行参考, 同时也可以参考 `src/ltmComponents/qualityPanel/useTaskComment.ts` 文件将相关的逻辑封装放到 `useFrameComment.ts` 文件中. 帧范围选择组件的最小值是 1, 最大值是 `window.editor.state.sceneIds.length`.另外需要注意的是数据库中存放的是索引数组, 索引从 0 开始, 和组件展示相差1.

## FrameCommentTree

请仿照 `TaskCommentTree.vue` 中的内容完成 `src/ltmComponents/commentTree/FrameCommentTree.vue` 文件的实现. 旧版的 `ltmRef/components/commentTree/FrameCommentTree.vue` 文件中有旧版本的实现, 也可以参考.

- commentStore 中存放了所有的评论数据, 包括 task, sensor, frame, area, object 的评论, 这里需要过滤出 frame 的评论数据, 注意这里只显示 `frames` 中包含当前帧的评论. 另外数据库中 comment 的数据格式和 `CommentTree.vue` 组件的类型定义不一致, 需要进行转换. 这些方法也许放到现在的 `src/ltmComponents/qualityPanel/useFrameComment.ts` 文件中实现比较好, 你根据最佳实践自行选择实现位置.
- 数据库中 comment 的 `parent` 字段是父节点的 id, 如果为 `null` 表示是根节点.
- 渲染评论的时候需要读取 `projectMetaStore.curQcSettings.frameComponents` 中的配置, 如果配置了 `rejectReason`, 则需要将对应的数据按照配置渲染成 label.

## SensorQcDialog

## useObjectComment

请在 `useObjectComment.ts` 文件中增加两个方法. 第一个方法用来测试设置图片中物体的高亮功能. 这个函数首先通过 `useResultsInject` 获取所有目标列表, 然后使用第一个目标的 `id` 设置高亮. 对应的示例代码如下:

```ts
function highlightObjectDirectly(objectId: string) {
  const object = editor.dataManager.getObject(objectId);
  if (object) {
    editor.mainView.setState(object, { select: true });
  }
}
```

其中 `objectId` 如果我分析的没错的话, 应该是在 `resultState.list.data.id` 中. 第二个方法是用来测试点击图片中的物体时, 侦听到对应的事件, 打印对应的选择物体日志即可. 最后在 `QualityPanel.vue` 文件中测试一下这两个函数.

## 评论气泡的绘制

请帮我分析一下现在的代码是如何在图片上绘制矩形, 多边形, 多段线的. 我希望增加一个绘制工具, 使用这个工具点击图片某个地方之后, 在图像上增加一个评论气泡, 表示这个地方有一个评论, 这个气泡和矩形一样是可以点击的. 因此我需要先了解一下这个项目现在的设计架构, 以便我扩展新的工具.

目前工具栏中还是只看到了 `edit, Bounding Box, Polygon, Polyline, Model` 这几个工具, 并没有新增的 `comment-bubble` 工具. 另外为了方便后续维护代码请将你上面分析的绘制工具架构放到 `docs/` 文件夹下的一个文档中.

2025年7月2日: 现在实现的这个工具点击一下是绘制一个点, 而不是一个类似于聊天气泡一样的图标, 请调整. 另外请再给我介绍一下, 哪里是控制是否显示这个工具的. 因为有的时候我需要隐藏这个工具.

2025年7月2日: 我增加了一个 `comment-bubble` 工具, 希望使用这个工具点击图标后在图片上渲染一个聊天气泡表示这里有一个评论, 为了简单的验证功能这里直接继承了 `Circle` 类, 现在功能验证完毕之后, 需要将这个工具改成继承 `Shape` 类, 并且绘制一个聊天气泡的形状. 请帮我分析一下如何实现.

- 从行为上它和 `Circle` 类很像, 就是点击一下就创建一个对象.
- 样式上, 它应该是一个矩形, 然后在其右下角有一个三角形组成.

2025年7月2日: 我新增的 `comment-bubble` 在添加的时候有一个粉色的填充, 但是使用选择工具然后鼠标放到气泡上的时候, 气泡的填充色就没有了. 请问如何控制气泡的样式. 比如悬停, 选中时的填充和边框颜色.

2025年7月2日: 新增的 `comment-bubble` 工具创建的对象会出现在 `resultState.list.data` 中, 但是这不是我希望的, 这个工具只是创建一个评论对象. 我希望单独对这个工具的行为作出修改. 如下:

- 创建的气泡对象不需要在 `resultState.list.data` 中存储, 而是触发一个事件将气泡的属性放到回调函数中. 后续我需要在 `qualityPanel/useObjectComment.ts` 文件中捕获这个事件. 然后将气泡参数和评论的内容一起存放到数据库中.
- 能够通过代码创建一个气泡. 我会将气泡的参数从数据库中读出, 然后在图片上渲染一个气泡. 这个气泡的参数和 `comment-bubble` 工具创建的气泡一致.
- 能够通过代码删除一个气泡. 当一个评论被删除的时候图片上的气泡也应该被删除.
- 能够捕获气泡的点击事件. 当点击气泡的时候, 我需要同步的高亮对应的评论.
- 气泡的上方不需要显示 `Class Required` 的提示.

其实这些功能其他工具创建的对象都有, 只是将这些行为绑定到 `resultState.list.data` 中创建的对象上. 但是我希望单独对 `comment-bubble` 工具创建的对象进行处理. 请帮我分析一下如何实现.

2025年7月3日: 关于气泡工具请帮我修复几个问题:

- 通过气泡工具创建的气泡会触发 `handleCommentBubbleCreate` 函数, 但是这个函数的参数并没有给出气泡的 id. 导致我无法调用 `deleteBubble` 或者 `highlightBubble` 操作它.
- 通过 `createBubbleByCommentId` 创建的气泡, 通过 `deleteBubbleByCommentId` 函数无法删除.
- 点击气泡后并没有触发 `handleCommentBubbleClick` 函数. 我看触发了如下的事件, 其实不触发 `handleCommentBubbleClick` 也行, 我在 `handleSelect` 统一处理目标或者气泡的选择. 那请将 `handleCommentBubbleClick` 相关的代码删除, 包括 `CommentBubbleManager.ts` 中的触发事件代码.
- 请你通篇考虑使用气泡工具, 图片上的气泡, 将来右侧评论列表中的评论三者之间的关系, 分析一下现在的代码和相关回调函数是否足够满足需求. 气泡工具创建的气泡会绑定到一个评论上, 用户选择气泡会高亮评论, 同样选择评论也会高亮气泡. 气泡的 id 和评论的 id 是相互绑定的. 首次加载页面的时候会根据评论中存放的气泡参数在图像上渲染气泡.

## AreaQcDialog

现在已经完成了气泡工具的基本功能, 现在需要完成 `AreaQcDialog` 的实现. 功能如下:

- 首先评论气泡工具只有在 `projectMetaStore.phase` 为 `qc` 的时候才能使用, 当用户使用评论工具的时候, 右侧的面板自动切换到 `QualityPanel.vue` 组件. 当用户离开 `QualityPanel.vue` 组件的时候, 如果当前工具为气泡工具, 自动切换到 edit 工具.
- 当用户使用评论气泡工具创建一个气泡的时候, 会触发 `handleCommentBubbleCreate` 函数, 此时会弹出 `AreaQcDialog` 对话框. 对话框中的组件由 `projectMetaStore.curQcSettings.annotationComponents.area` 中的配置决定. 常用组件的类型有 `rejectReason`, `comment`, `frameRange`, 可以参考 `ltmRef/components/qualityPanelSubComps/AreaQcDialog.vue` 文件中的旧版实现, 也可以参考 `src/ltmComponents/qualityPanel/FrameQcDialog.vue` 文件中的实现. 旧版实现中有一个 "基本信息和可评价属性" 部分, 这一部分内容在实际使用中基本不使用, 因此可以删除. 也就是说对话框组件和 `FrameQcDialog.vue` 中的组件一致.
- 创建用于保存到数据库中的 area 评论时, 需要将气泡的参数和对话框中的组件参数一起保存到数据库中. 这一部分可以参考 `ltmRef/store/modules/comment.ts` 文件中的 `createDefaultAreaComment` 函数. 但是请注意, 新版中的 commentProps 和旧版中的差距很大了, 这里保存 `handleCommentBubbleCreate` 函数中的参数以便能够调用 `createBubbleByCommentId` 将数据库中的评论渲染到图片上.
- area comment 和后续需要添加的 object comment 的功能基本一致, 都是将一个评论和图片上的某个区域关联, 因此功能都封装到 `useObjectComment.ts` 文件中. 目前这个文件中包含了很多测试代码, 后续再统一删除, `useObjectComment.ts` 文件中创建默认的 comment 的代码可以参考 `useTaskComment.ts` 文件.

## ObjectCommentTree

请完成 `src/ltmComponents/commentTree/ObjectCommentTree.vue` 文件的实现. 旧版的 `ltmRef/components/commentTree/ObjectCommentTree.vue` 文件中有旧版本的实现, 可以参考. 要求如下:

- commentStore 中存放了所有的评论数据, 包括 task, sensor, frame, area, object 的评论, 这里需要过滤出 area, object 的评论数据, 注意这里只显示 `frames` 中包含当前帧的评论. 另外数据库中 comment 的数据格式和 `CommentTree.vue` 组件的类型定义不一致, 需要进行转换. 这些方法可以放到 `src/ltmComponents/qualityPanel/useAreaComment.ts` 和 `useObjectComment.ts` 文件中. 这两种评论都会在图片上渲染出一个气泡, 气泡的参数存放到 `attributes.params.bubbleConfig` 中. 可以根据该参数调用 `createBubbleByCommentId` 函数将气泡渲染到图片上.
- 数据库中 comment 的 `parent` 字段是父节点的 id, 如果为 `null` 表示是根节点.
- 渲染 area 评论的时候需要读取 `projectMetaStore.curQcSettings.annotationComponents.area` 中的配置, 如果配置了 `rejectReason`, 则需要将对应的数据按照配置渲染成 label.
- 渲染 object 评论的时候也需要渲染相应的标签, 但是目前还没有实现 object 评论的创建, 因此暂时不需要处理.
- 需要将气泡的 id 和评论的 id 绑定在一起, 在点击气泡的时候可以高亮评论, 同样在点击评论的时候可以高亮气泡.
- 部分功能可以参考新版的 `FrameCommentTree.vue` 文件中的实现.

2025年7月3日: 有如下几个问题请修复:

- 虽然点击评论能够高亮气泡, 但是这个高亮只是视觉上高亮了, 点击其他图片上的物体, 这个高亮没有取消. 之前 `useObjectComment.ts` 中的 `highlightObjectDirectly` 高亮物体也存在这个问题, 通过设置 `editor.dataManager.getObject(objectId)` 在 editor 中高亮, 实现了和鼠标点击高亮一样的效果, 可以供你参考.
- 使用评论工具创建评论时, 如果点击对话框中的取消按钮, 应该调用 `deleteBubble` 函数删除气泡.
- 使用评论工具创建评论后, 可能是因为评论还没有写入到数据库中得不到 id, 因此没有将场景中的气泡和评论进行关联, 两者的互相选择都没有实现同步高亮. 旧版代码是每次创建一个评论后, 重新从数据库中获取所有的评论, 也删除图片上的所有气泡重新渲染. 这个办法虽然会浪费网络带宽, 但是我觉得可以避免很多 bug, 你可以参考一下.
- 点击图片中的气泡并没有反向使得对应的评论高亮.
- 不同评论模块(Object QC, Sensor QC, Current Frame QC, Task QC)的评论都是可以有一个评论高亮的, 我希望当用户选择一个评论时, 取消其他评论的高亮. 旧版本代码是将所有高亮的评论都在 `commentStore.highlightCommentIds` 中管理, 你可以参考一下.

2025年7月3日: 还有如下问题请修复:

- 使用评论工具创建气泡, 在对话框中点击取消后没有正确的删除气泡. 
- 创建评论在对话框中点击确定, 虽然可以正确创建评论, 但是给出 "useObjectComment.ts:231 气泡管理器未初始化" 错误. 另外图片上会重复创建一个气泡, 反复切换 `QualityPanel.vue` 组件, 气泡会重复创建. 关于 `QualityPanel.vue` 组件切换 unmounted 之前就会触发很多 bug, 能否做到切换 tab 栏也不让 `QualityPanel.vue` 组件卸载. 如果做不到就需要考虑其 onmounted 和 onunmounted 的逻辑, 比如在 onmounted 中判断当前是否有高亮的气泡, 如果有相应的评论也应该高亮. 当然现在高亮的逻辑统一在 commentStore 中管理了.
- 我希望页面加载的时候, 能够自动将数据库中的评论渲染到图片上. 即和旧代码一样在 `fetchAllComments()` 函数中渲染气泡到图片上.

2025年7月3日: 目前只有切换到 `QualityPanel.vue` 组件的时候, 才会渲染气泡到图片上, 我希望页面加载获取数据后就能够渲染气泡. 于是我在 app.vue 上测试了一个添加气泡的代码, 但是我发现一旦在 `app.vue` 中执行了 `const objectCommentManager = useObjectCommentManager();` 就会报很多错误, 部分错误如下:

```txt
context.ts:22 [Vue warn]: injection "Symbol(image-editor)" not found. 
  at <App>
warn$1 @ runtime-core.esm-bundler.js:51
inject @ runtime-core.esm-bundler.js:4057
useInjectBSEditor @ context.ts:22
useObjectComment @ useObjectComment.ts:16
setup @ App.vue:18
```

这应该是 `image-editor` 还没有准备好的问题, 请问如何解决这个问题. 能不能虚拟一个假的组件, 这个组件在 app.vue 加载之后再加载, 这样就可以模拟现在切换到 `qualitypanel.vue` 挂载 `objectcommenttree.vue` 组件. 可以在这个虚拟组件中调用 `objectCommentManager.createBubbleByCommentId` 函数.

2025年7月4日: 使用评论工具再图片点击创建一个评论气泡时, 弹出 `AreaQcDialog` 对话框, 然后终端出现大量如下的日志, 感觉像是创建了两遍, 而且点击 cancel 之后气泡没有消失.

```txt
创建气泡: {bubbleId: 'comment-bubble-2', commentId: undefined, userData: {…}}
CommentBubbleManager.ts:160 气泡已添加到渲染层，当前气泡数量: 2
CommentBubbleManager.ts:161 气泡组子元素数量: 2
CommentBubbleManager.ts:162 气泡属性: {visible: true, x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40}
CommentBubbleInitializer.vue:88 === 评论气泡创建完成事件 ===
CommentBubbleInitializer.vue:89 气泡ID: comment-bubble-2
CommentBubbleInitializer.vue:90 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
useObjectComment.ts:94 === 评论气泡创建完成事件 ===
useObjectComment.ts:95 气泡ID: comment-bubble-2
useObjectComment.ts:96 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
useObjectComment.ts:94 === 评论气泡创建完成事件 ===
useObjectComment.ts:95 气泡ID: comment-bubble-2
useObjectComment.ts:96 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
CommentBubbleInitializer.vue:60 === 评论气泡创建事件 ===
CommentBubbleInitializer.vue:61 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
QualityPanel.vue:456 收到区域评论创建事件: {comment: {…}, bubbleConfig: {…}}
useObjectComment.ts:66 === 评论气泡创建事件 ===
useObjectComment.ts:67 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
QualityPanel.vue:456 收到区域评论创建事件: {comment: {…}, bubbleConfig: {…}}
useObjectComment.ts:66 === 评论气泡创建事件 ===
useObjectComment.ts:67 气泡配置: {x: 1801.2631578947367, y: 712.4210526315791, width: 60, height: 40, tailWidth: 16, …}
QualityPanel.vue:456 收到区域评论创建事件: {comment: {…}, bubbleConfig: {…}}
```

2025年7月4日: ObjectCommentTree.vue 文件中, 气泡的高亮和取消高亮逻辑是正确的. 但是用户点击 `FrameCommentTree.vue, TaskCommentTree.vue` 文件中的评论时, 并没有考虑之前高亮的气泡, 而是直接高亮了点击的评论. 也许气泡高亮的逻辑应该封装到 `setHighlightCommentIds` 函数中, 这个函数首先清除所有高亮的气泡, 然后高亮点击的评论, 这样其他 commeTree 调用 `setHighlightCommentIds` 函数时就能正确处理气泡关系了, 当然直接在其他 commentTree 中调用清除气泡高亮的函数也行.

2025年7月7日: 请调整 `useObjectComment.ts` 文件中的 `convertToTreeCommentData` 函数, 使得评论的标签能够正确显示. 下面是一个典型的评论数据:

```json
{
    "type": "comments",
    "id": "LD686b2dad464dc0002f177c09",
    "attributes": {
        "category": "task",
        "belong": "LD685a5864dfe138002fdb5ceb",
        "parent": null,
        "content": "box2d 评论",
        "params": {
            "annotationProps": {
                "attrs": {
                    "draggable": true,
                    "x": 983.1031,
                    "y": 1076.3307,
                    "stroke": "#7dfaf2",
                    "cursor": "pointer",
                    "skipStageScale": true,
                    "selectable": true,
                    "fill": "rgba(125,250,242,0)",
                    "strokeWidth": 2,
                    "hitStrokeWidth": 15.157894736842104,
                    "width": 587.0894000000001,
                    "height": 388.94679999999994,
                    "points": [
                        {
                            "x": 983.1031,
                            "y": 1076.3307
                        },
                        {
                            "x": 1570.1925,
                            "y": 1076.3307
                        },
                        {
                            "x": 1570.1925,
                            "y": 1465.2775
                        },
                        {
                            "x": 983.1031,
                            "y": 1465.2775
                        }
                    ],
                    "rotation": 0,
                    "fillColorRgba": {
                        "r": 125,
                        "g": 250,
                        "b": 242,
                        "a": 0
                    }
                },
                "className": "rect",
                "userData": {
                    "color": "#7dfaf2",
                    "classType": "Car",
                    "classId": "6",
                    "attrs": {},
                    "trackId": "t7vW83-rQvv5ne1Y",
                    "trackName": "1",
                    "sourceId": "-1",
                    "sourceType": "DATA_FLOW"
                }
            },
            "objectPropChecks": {
                "valueName1": false,
                "wrongType": true
            },
            "rejectReasons": [
                "value2"
            ],
            "frameRange": {
                "type": "current",
                "start": 1,
                "end": 1
            },
            "bubbleConfig": {
                "x": 1246.6478000000002,
                "y": 1026.3307,
                "width": 60,
                "height": 40,
                "tailWidth": 16,
                "tailHeight": 16
            },
            "status": [
                {
                    "operator": "test",
                    "created": "2025-07-07T02:15:00.712Z",
                    "status": "open"
                }
            ]
        },
        "type": "object",
        "target": null,
        "frames": [
            "0"
        ],
        "version": "1",
        "creator": "test",
        "created": "2025-07-07T02:14:36.979Z",
        "updated": "2025-07-07T02:15:09.931Z"
    },
    "links": {
        "self": "/models/comments/LD686b2dad464dc0002f177c09"
    }
}
```

下面是这个评论典型的配置 `qcSettings.annotationComponents.box2d` 配置:

```json
"box2d": {
"objectInfo": [
    {
    "label": "trackName",
    "propName": "userData.trackName",
    "propType": "Number",
    "propTypeSettings": {},
    "canCheck": false,
    "valueName": "valueName1"
    },
    {
    "label": "分类",
    "propName": "userData.classType",
    "propType": "String",
    "propTypeSettings": {},
    "canCheck": true,
    "valueName": "wrongType"
    }
],
"objectComponents": [
    {
    "type": "rejectReason",
    "valueName": "rejectReasons",
    "options": [
        {
        "label": "多标",
        "value": "value2",
        "forObject": true,
        "forNonObject": false,
        "description": "多标"
        },
        {
        "label": "漏标",
        "value": "value3",
        "forObject": false,
        "forNonObject": true,
        "description": "漏标"
        },
        {
        "label": "不贴合",
        "value": "value4",
        "forObject": true,
        "forNonObject": false,
        "description": "不贴合"
        },
        {
        "label": "方向错误",
        "value": "value5",
        "forObject": true,
        "forNonObject": false,
        "description": "方向错误"
        },
        {
        "label": "ID变化",
        "value": "value6",
        "forObject": true,
        "forNonObject": false,
        "description": "ID变化"
        },
        {
        "label": "主分类错误",
        "value": "value7",
        "forObject": true,
        "forNonObject": false,
        "description": "主分类错误"
        },
        {
        "label": "子分类错误",
        "value": "value8",
        "forObject": true,
        "forNonObject": false,
        "description": "子分类错误"
        },
        {
        "label": "框旋转",
        "value": "value9",
        "forObject": true,
        "forNonObject": false,
        "description": "框旋转"
        },
        {
        "label": "移动状态错误",
        "value": "value10",
        "forObject": true,
        "forNonObject": false,
        "description": "移动状态错误"
        },
        {
        "label": "车门选项错误",
        "value": "value11",
        "forObject": true,
        "forNonObject": false,
        "description": "车门选项错误"
        },
        {
        "label": "CIPV错误",
        "value": "value12",
        "forObject": true,
        "forNonObject": false,
        "description": "CIPV错误"
        },
        {
        "label": "遮挡错误",
        "value": "value13",
        "forObject": true,
        "forNonObject": false,
        "description": "遮挡错误"
        },
        {
        "label": "截断错误",
        "value": "value14",
        "forObject": true,
        "forNonObject": false,
        "description": "截断错误"
        },
        {
        "label": "模糊错误",
        "value": "value15",
        "forObject": true,
        "forNonObject": false,
        "description": "模糊错误"
        },
        {
        "label": "车灯错误",
        "value": "value16",
        "forObject": true,
        "forNonObject": false,
        "description": "车灯错误"
        },
        {
        "label": "偏移属性错误",
        "value": "value17",
        "forObject": true,
        "forNonObject": false,
        "description": "偏移属性错误"
        },
        {
        "label": "三轮车选项错误",
        "value": "value18",
        "forObject": true,
        "forNonObject": false,
        "description": "三轮车选项错误"
        }
    ]
    },
    {
    "type": "frameRange",
    "valueName": "frameRange"
    },
    {
    "type": "comment",
    "valueName": "comment"
    }
]
}
```

这里需要显示状态标签, 只读属性标签, 错误属性标签, 拒绝原因标签. 这些标签的颜色各不相同. 首先状态标签的渲染这里保持不动即可. 其他属性的渲染需要借助 qcSettings 中的配置,需要根据评论的 `attributes.params.annotationProps.className` 获取对应的配置. 这里 `rect` 对应的配置是 `box2d`. 如果找不到对应的配置, 控制台给出警告并忽略后续标签的渲染. 找到配置后按照如下方式渲染对应的标签.

- 只读属性标签. 这个标签用来展示被评论物体的关键信息. 只读属性是 `objectInfo` 中的 `canCheck` 为 false 的属性. 这些属性在 `attributes.params.annotationProps` 中, 需要根据 `objectInfo` 中的 `propName` 获取对应的属性值. 如果获取不到, 控制台给出警告并忽略这个标签的渲染. 比如这里就会渲染出内容为 `trackName: 1` 的标签. 颜色为 `LABEL_COLORS.OBJECT_TEXT`.
- 错误属性标签. 这个标签用来展示被评论物体的错误属性. 这个标签的渲染满足如下两个条件:
  - 配置中 `objectInfo` 中的 `canCheck` 为 true 的属性.
  - 评论的 `attributes.params.objectPropChecks` 中对应的属性值为 true.
比如这里就会渲染出内容为 `分类` 的标签. 标签的颜色偏红表示错误. 颜色为 `LABEL_COLORS.PROP_ERROR_TEXT`.
- 拒绝原因标签. 这里直接参考 `useAreaComment.ts` 文件中的 `convertToTreeCommentData` 函数中的拒绝原因渲染逻辑即可.

## ObjectQcDialog

接下来请完成 `ObjectQcDialog.vue` 文件的实现. 功能如下:

- ObjectQcDialog 和 AreaQcDialog 一样, 创建的评论都会在图片上渲染一个气泡, 气泡的参数存放到 `attributes.params.bubbleConfig` 中. 可以根据该参数调用 `createBubbleByCommentId` 函数将气泡渲染到图片上. 不同的是 ObjectQcDialog 的气泡是和图片上的物体关联的. 对于选中的物体 `className` 为 `rect` 的物体, 将气泡放到其上方中心位置即可. 对于其他类型的物体, 如 `polygon` 我还没有想好放哪, 可以先随便放置一个合适的位置. 选中物体时对应物体的属性如下(CommentBubbleInitializer.vue 中 handleSelect 的日志):

```txt
attrs: {draggable: true, x: 983.1031, y: 1076.3307, stroke: '#7dfaf2', cursor: 'pointer', …}
boundRect: undefined
className:"rect"
colorKey:"#6c50aa"
createdAt:undefined
createdBy:undefined
eventListeners:{mousedown: Array(1), touchstart: Array(1), xChange: Array(1), yChange: Array(1), widthChange: Array(3), …}
frame:Proxy(Object) {id: 29, datasetId: 3, needSave: false, model: undefined, sceneId: '__UNSERIES__', …}
index:0
lastTime:undefined
object:undefined
parent:ShapeRoot {_id: 9, eventListeners: {…}, attrs: {…}, index: 0, _allEventListeners: null, …}
state:{hover: false, select: true}
statePriority:(2) ['hover', 'select']
updateTime:undefined
userData:{color: '#7dfaf2', classType: 'Car', backId: undefined, classId: '6', attrs: {…}, …}
uuid:"e30f4b8d-01a3-4ace-a5b1-f9070cd72fd1"
version:undefined
_allEventListeners:null
_attachedDepsListeners:Map(2) {'hasFill' => true, 'hasStroke' => true}
_batchingTransformChange:false
_cache:Map(11) {'hasShadow' => false, 'visible' => true, 'absoluteOpacity' => 1, 'transform' => _Transform, 'absoluteTransform' => _Transform, …}
_dragEventId:null
_editable:true
_filterUpToDate:false
_id:10
```
从上面的日志中看出, 这里并没有包含选择物体的位置和大小属性. 需要补充到

- `ltmRef/components/qualityPanelSubComps/ObjectQcDialog.vue` 文件是旧版本的实现, 可供参考. 也可以参考 `src/ltmComponents/qualityPanel/FrameQcDialog.vue` 文件中的实现. 和 `FrameQcDialog.vue` 相比这里多了一个基本信息和可评价属性. 即这个对话框可以展示选择物体的某些属性以及用户可以对这些属性进行评价.
- 对话框组件的展示由 `projectMetaStore.curQcSettings.annotationComponents.[xxx]` 中的配置决定. 如果选择的是 `rect` 类型的物体, 这里 `xxx` 为 `box2d`. 对于其他类型的物体, 当用户选择物体并创建该对话框时, 提示用户暂时不支持对该类型的物体添加评论. 常用组件的类型有 `rejectReason`, `comment`, `frameRange`, 可以直接参考 `FrameQcDialogvue` 文件中实现. 对于新增的 `objectInfo` 配置的渲染, 主要参考旧版实现. 一个典型的 `box2d` 配置如下:

```json
{
"box2d": {
    "objectInfo": [
        {
            "label": "trackName",
            "propName": "userData.trackName",
            "propType": "Number",
            "propTypeSettings": {},
            "canCheck": false,
            "valueName": "valueName1"
        },
        {
            "label": "分类",
            "propName": "userData.classType",
            "propType": "String",
            "propTypeSettings": {},
            "canCheck": true,
            "valueName": "wrongType"
        }
    ],
    "objectComponents": [
        {
            "type": "rejectReason",
            "valueName": "rejectReasons",
            "options": [
                {
                    "label": "多标",
                    "value": "value2",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "多标"
                },
                {
                    "label": "不贴合",
                    "value": "value4",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "不贴合"
                },
                {
                    "label": "方向错误",
                    "value": "value5",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "方向错误"
                },
                {
                    "label": "ID变化",
                    "value": "value6",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "ID变化"
                },
                {
                    "label": "主分类错误",
                    "value": "value7",
                    "forObject": true,
                    "forNonObject": false,
                    "description": "主分类错误"
                }
            ]
        },
        {
            "type": "frameRange",
            "valueName": "frameRange"
        },
        {
            "type": "comment",
            "valueName": "comment"
        }
    ]
}
}
```

如果选择的物体属性包括 `userData.trackName`, `userData.classType` 字段, 那么在基本信息和可评价属性中就会渲染出一个只读的 trackName 组件和一个前面可以勾选的分类组件.

- 旧版的 `ltmRef/store/modules/comment.ts` 文件中有一个 `createDefaultObjectComment` 函数, 可以参考这个函数创建默认的 object 评论. 不过其中气泡的参数 `bubbleConfig` 参数的填写应该参考新版 `useAreaComment.ts` 文件中的 `createDefaultAreaComment` 函数. 最终存放到数据库中一个典型的数据格式如下, 其中 `annotationProps` 中保留选中物体中的部分属性, 这里只需要保留 `attrs` 和 `userData` 字段, `bubbleConfig` 中保留渲染气泡的参数, 用来绘制评论气泡, 作用和 area 评论中的气泡一样, objectPropCheck 保存用户评论物体属性的结果, 对于只读的属性, 可以直接写成 false, 其他字段的意义很明显就不解释了:

```json
{
"type": "comments",
"id": "LD68537b7add0c69002fce11d7",
"attributes": {
    "category": "task",
    "belong": "LD46423e1b",
    "parent": null,
    "content": "前两帧分类错误",
    "params": {
        "annotationProps": {
            "attrs": {"x": 1321.2631578947369, "y": 866.5263157894738, "width": 60, "height": 40},
            "userData": {"trackName": "123", "classType": "Car"}
        },
        "bubbleConfig": {
            "x": 1321.2631578947369,
            "y": 866.5263157894738,
            "width": 60,
            "height": 40,
            "tailWidth": 16,
            "tailHeight": 16
        },
        "objectPropChecks": {
            "valueName1": false,
            "wrongType": true
        },
        "rejectReasons": [
            "value4"
        ],
        "frameRange": {
            "type": "custom",
            "start": 1,
            "end": 2
        },
        "status": [
            {
                "operator": "test",
                "created": "2025-06-19T02:52:45.925Z",
                "status": "open"
            }
        ]
    },
    "type": "object",
    "target": null,
    "frames": [
        "0",
        "1"
    ],
    "version": "1",
    "creator": "test",
    "created": "2025-06-19T02:52:45.925Z",
    "updated": "2025-06-19T02:52:42.468Z"
},
"links": {
    "self": "/models/comments/LD68537b7add0c69002fce11d7"
}
}
```

- 当用户触发 `QualityPanel.vue` 组件中的 `handleAddComment('object')` 函数时, 首先判断当前是否选中了一个 `rect` 类型的物体. 如果没有选中提示用户请先选择一个物体, 如果选中了就弹出上面的对话框.

## Qc 配置优化

目前 `QcCommentTypeEnum` 的取值为 `area, box2d, box3d`. 而实际物体的 `className` 取值为 `rect, polygon, polyline`. 因此代码中经常会进行 `box2d` -> `rect` 的转换. 请将 `QcCommentTypeEnum` 的取值改为 `area, rect, polygon, polyline`. 并修改代码中相关的逻辑. 即配置文件中直接使用 `className` 作为配置的 key. 另外需要注意的是, 如果选择的物体的 `className` 没有对应的配置, 则在控制台给出对应的警告. 修改完毕之后代码中应该不会存在类似如下的硬编码:

```ts
let configKey = 'box2d' // 默认使用 box2d 配置
if (className === 'rect') {
configKey = 'box2d'
} else if (className === 'polygon') {
configKey = 'polygon'
} else {
// 对于其他类型的物体，暂时不支持
console.warn(`不支持的物体类型: ${className}`)
configKey = 'box2d' // 暂时使用 box2d 配置
}
```
