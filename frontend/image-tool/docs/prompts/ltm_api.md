# LTM API

## task

2025年6月19日: 我的后端数据都是通过 jsonapi 的形式返回的. 下面是数据库中定义的一张 `task` 表的结构:

```ts
Task: {
    project: ["Project", "tasks"],
    batch: ["Batch", "tasks"],
    trip: ["Trip", "tasks"],
    name: String,
    description: String,
    planedworkload: Number, //预计工作量,单位分钟
    actualworkload: Number, //实际工作量,单位分钟
    rawdata: String, //任务第1阶段的输入数据，待处理数据在连接器存储的相对位置路径,如果是自动化的项目,这个路径是通过计算自动生成的
    start: Number, //数据片段的采集开始时间,单位纳秒
    end: Number, //数据片段的采集停止时间,单位纳秒
    duration: Number, //数据片段的持续时间,单位纳秒
    rawframecount: Number, //原始数据帧数
    deliveredframecount: Number, //交付数据帧数
    planeddeliverydate: Date, //计划交付日期
    actualdeliverydate: Date, //实际交付日期
    score: Number, //质量得分
    phase: String, //任务在Taskphase流程中的phase名称
    phaseprogress: Object, //所在phase的当前处理帧数,{phase1: xxx, phase2: yyy, ...}
    phaseoperators: Object, //所在phase的操作人员,用于管理员指派某个phase只能由谁操作，{phase1: [x1,x2], phase2: [y1], ...}
    phasestatus: Object,  //所在phase的当前处理帧数,{phase1:[{user,status,time},...], phase2: [], ...}
    phasemetadata: Object, // 所在phase的数据元信息
    phasedata: Object, //所在phase的输出数据路径,如果是自动化的项目,这个路径是通过计算自动生成的 {phase1:[v1_path, v2_path], phase2:[], ...}
    asyncprocess: Object, //异步处理过程 {phase1:[{id:x,status:y}, ...], v2_path:[]]
    history: Array(String), //任务的变更历史记录
    tags: Array(String),
    receivers: Array(String), //可以看到这条任务的人员列表，在管理员没有指派phaseoperators时，他们可以自由领取任务
    operator: String, //领取任务正在操作的人
    qcversion: String, //质检版本, 每次任务 phase 变成 QC 时, 质检版本号+1
    creator: String, //记录的创建或维护人
    created: Date, //记录的创建时间
    updated: Date, //记录的修改时间
    reserve: Object, //保留字段
}
```

下面是获取单一 `task` 的接口响应:

```json
{
    "jsonapi": {
        "version": "1.0"
    },
    "links": {
        "self": "/models/tasks/LD46423e1b"
    },
    "data": {
        "type": "tasks",
        "id": "LD46423e1b",
        "attributes": {
            "name": "label_demo_task_250516",
            "description": null,
            "planedworkload": 0,
            "actualworkload": 0,
            "rawdata": "LD_Jeely_Guanglun_4D/lidar_2025-02-08-16-48-37/label_demo_task_250516/label_demo_task_250516.bag",
            "start": null,
            "end": null,
            "duration": null,
            "rawframecount": 0,
            "deliveredframecount": 0,
            "planeddeliverydate": null,
            "actualdeliverydate": null,
            "score": null,
            "phase": "QC",
            "phaseprogress": null,
            "phaseoperators": {
                "TODO": "test"
            },
            "phasestatus": {
            },
            "phasemetadata": {
            },
            "phasedata": {
            },
            "asyncprocess": {
            },
            "history": [],
            "tags": [],
            "receivers": [
                "test"
            ],
            "operator": "test",
            "qcversion": null,
            "creator": "test",
            "created": "2025-05-16T09:13:49.737Z",
            "updated": "2025-06-12T05:17:29.883Z",
            "reserve": {}
        },
        "relationships": {
            "project": {
                "links": {
                    "self": "/models/tasks/LD46423e1b/relationships/project",
                    "related": "/models/tasks/LD46423e1b/project"
                },
                "data": {
                    "type": "projects",
                    "id": "LDa5682c79"
                }
            },
            "batch": {
                "links": {
                    "self": "/models/tasks/LD46423e1b/relationships/batch",
                    "related": "/models/tasks/LD46423e1b/batch"
                },
                "data": null
            },
            "trip": {
                "links": {
                    "self": "/models/tasks/LD46423e1b/relationships/trip",
                    "related": "/models/tasks/LD46423e1b/trip"
                },
                "data": {
                    "type": "trips",
                    "id": "LDdca4c59d"
                }
            }
        },
        "links": {
            "self": "/models/tasks/LD46423e1b"
        }
    }
}
```

请问我这里定义的相关类型是否合适, 如果不合适请帮忙进行修改.

## project

请仿照 task 数据的获取完成 project 类型的定义和数据获取. 二者都是 jsonapi 的形式返回. project 表结构定义如下:

```ts
Project: {
    connectors: Array(String), //项目的数据连接器,目前固定3个：原始数据存储、交付数据存储、过程数据存储,可以指向1个连接器
    pipeline: ["Pipeline", "projects"],
    batchphases: [Array("Batchphase"), "project"], // 原batchboardcolumns
    tripphases: [Array("Tripphase"), "project"], // 原tripboardcolumns
    taskphases: [Array("Taskphase"), "project"], // 原taskboardcolumns
    batches: [Array("Batch"), "project"],
    trips: [Array("Trip"), "project"],
    tasks: [Array("Task"), "project"],
    name: String, //项目名称
    description: String,
    status: String, //Project Progress (Delivered, In Progress, To Do, )
    type: String, //Type (2D/3D/4D/BEV/VLM)
    rawframecount: Number, //原始数据总帧数
    labeledframecount: Number, //标注数据总帧数
    deliveredframecount: Number, //交付数据总帧数
    planeddeliverydate: Date, //计划交付日期
    actualdeliverydate: Date, //实际交付日期
    receivers: Array(String), //可以查看项目属性的人员列表
    tags: Array(String),
    creator: String, //记录的创建或维护人
    created: Date, //记录的创建时间
    updated: Date, //记录的修改时间
    tooltype: String,
    items: Number,
    team: String,
    owner: String,
    createdtime: Date,
    settings: Object, //项目配置信息
    metadata: Object, // 临时方案，解决数据初始化程序不知道主传感器是谁，直接将metadata.json保存到这里
    reserve: Object, //保留字段
}
```
