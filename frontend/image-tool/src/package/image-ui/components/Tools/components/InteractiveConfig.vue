<template>
  <a-tooltip
    trigger="click"
    placement="right"
    v-model:visible="iState.visible"
    @visibleChange="updateMapClassList()"
  >
    <span
      class="tool-trigger"
      :style="{
        color: iState.visible ? 'rgb(23, 125, 220)' : '',
      }"
      title="Setting"
    >
      <EllipsisOutlined style="font-size: 14px; border-top: 1px solid #4e4e4e" />
    </span>
    <template #title>
      <div ref="containerRef" class="tool-info-tooltip" style="width: 230px; padding: 0 4px">
        <div
          style="padding-bottom: 4px; font-size: 14px; color: white; border-bottom: 1px solid gray"
        >
            Interactive Model Setting
        </div>
        <div class="title2">
          <span style="vertical-align: middle; margin-right: 10px">
            Model
          </span>
        </div>
        <div class="title2">
          <a-select
            :getPopupContainer="() => containerRef"
            v-model:value="interactiveConfig.model"
            style="width: 100%; font-size: 12px"
            :options="interactiveOptions"
            :field-names="{ label: 'name', value: 'name' }"
          >
          </a-select>
        </div>
        <div class="title2">
          <span style="vertical-align: middle; margin-right: 10px">
            Point Type
          </span>
        </div>
        <div class="title2">
          <a-select
            :getPopupContainer="() => containerRef"
            v-model:value="interactiveConfig.pointType"
            style="width: 100%; font-size: 12px"
            :options="pointTypeOptions"
            :field-names="{ label: 'label', value: 'value' }"
          >
          </a-select>
        </div>
        <div class="title2">
          <a-checkbox v-model:checked="interactiveConfig.predict">
            Tracking
          </a-checkbox>
        </div>
        <div class="title2">
          <a-checkbox v-model:checked="interactiveConfig.predict">
            Predict all in Model
          </a-checkbox>
        </div>
        <div v-show="!interactiveConfig.predict">
          <div v-show="interactiveConfig.confidence.length > 1">
            <div class="title2">Confidence</div>
            <div class="title2" style="display: flex; flex-direction: row">
              <div>
                <a-input-number
                  v-model:value="interactiveConfig.confidence[0]"
                  size="small"
                  :min="0"
                  :max="interactiveConfig.confidence[1]"
                  :step="0.1"
                  style="width: 60px"
                ></a-input-number>
              </div>
              <div style="flex: 1">
                <a-slider
                  range
                  style="margin-right: 10px; padding: 0"
                  v-model:value="interactiveConfig.confidence"
                  :min="0"
                  :max="1"
                  :step="0.1"
                />
              </div>
              <div>
                <a-input-number
                  v-model:value="interactiveConfig.confidence[1]"
                  size="small"
                  :min="interactiveConfig.confidence[0]"
                  :max="1"
                  :step="0.1"
                  style="width: 60px"
                />
              </div>
            </div>
          </div>

          <div class="title2" style="max-height: 60vh; overflow-y: auto">
            <a-tag
              style="user-select: none; cursor: pointer"
              :color="tag.selected ? '#177ddc' : ''"
              v-for="tag in curClasses"
              :key="tag.value"
              v-show="tag.isShow"
              @click="() => onTagSwitch(tag)"
            >
              {{ tag.label }}
              <CloseOutlined />
            </a-tag>
          </div>
        </div>
        <div class="title2" v-show="interactiveConfig.pointType === 'point'">
          <div style="margin-bottom: 8px; font-size: 11px; color: #999;">
            {{ isCollectingPoints ? 'Click on image to add points. Hold Shift for negative points.' : 'Click Start to begin collecting points' }}
          </div>
          <div style="max-height: 120px; overflow-y: auto; border: 1px solid #333; padding: 4px; background: #1a1a1a;">
            <div v-for="(point, index) in interactiveConfig.points" :key="index" style="margin-bottom: 4px; font-size: 11px;">
              <span style="color: #177ddc;">{{ index + 1 }}.</span>
              <span style="color: #52c41a;">x:{{ point.x.toFixed(1) }}, y:{{ point.y.toFixed(1) }}</span>
              <span :style="{ color: point.positive ? '#52c41a' : '#ff4d4f' }">
                ({{ point.positive ? 'positive' : 'negative' }})
              </span>
              <a-button 
                size="small" 
                type="text" 
                style="color: #ff4d4f; padding: 0 4px; height: auto;"
                @click="() => removePoint(index)"
              >
                ×
              </a-button>
            </div>
            <div v-if="interactiveConfig.points.length === 0" style="color: #666; font-style: italic; text-align: center;">
              {{ isCollectingPoints ? 'No points added' : 'No points collected yet' }}
            </div>
          </div>
          <div style="margin-top: 4px;">
            <a-button 
              size="small" 
              @click="clearPoints" 
              style="margin-right: 8px"
              :disabled="!isCollectingPoints"
            >
              Clear Points
            </a-button>
            <a-button 
              size="small" 
              @click="togglePointCollection" 
              :type="isCollectingPoints ? 'default' : 'primary'"
            >
              {{ isCollectingPoints ? 'Stop' : 'Start' }}
            </a-button>
          </div>
        </div>
        <div
          class="title2"
          style="margin-top: 10px; padding-top: 6px; text-align: right; border-top: 1px solid gray"
        >
          <a-button size="small" @click="onReset" style="margin-right: 10px">
            Reset
          </a-button>

        </div>
      </div>
    </template>
  </a-tooltip>
</template>
<script lang="ts" setup>
  import { CloseOutlined, EllipsisOutlined } from '@ant-design/icons-vue';
  import { computed, watch, ref, reactive, onMounted, onUnmounted } from 'vue';
  import { useInjectEditor } from '../../../context';
  import { IModel, IModelClass, LoadStatus, ModelCodeEnum, MsgType } from 'image-editor';
  import Konva from 'konva';

  // ***************Props and Emits***************
  const emit = defineEmits(['cancel', 'ok']);

  const editor = useInjectEditor();
  const { state } = editor;
  const containerRef = ref(null);
  const iState = reactive({
    visible: false,
    mapClassList: [] as IModelClass[],
  });
  
  // 创建interactive配置，类似modelConfig
  const interactiveConfig = reactive({
    model: '',
    pointType: 'point',
    predict: true,
    confidence: [0.5, 1] as [number, number],
    classes: {} as Record<string, Record<string, IModelClass>>,
    points: [] as Array<{x: number, y: number, positive: boolean}>,
  });
  
  // 添加收集points的状态控制
  const isCollectingPoints = ref(false);
  
  // 存储可视化点的Konva对象
  const visualPoints = ref<Konva.Node[]>([]);
  
  // 点类型选项
  const pointTypeOptions = [
    { label: 'Point', value: 'point' },
    { label: 'Box', value: 'box' }
  ];
  
  const loading = computed(() => {
    const frame = editor.getCurrentFrame();
    return frame?.model?.state === LoadStatus.LOADING;
  });
  
  // 过滤出interactive类型的模型
  const interactiveOptions = computed(() => {
    return state.models.filter((model: IModel) => model.code === ModelCodeEnum.IMAGE_INTERACTIVE);
  });
  
  const updateMapClassList = () => {
    if (!iState.visible) return;
    const model = state.models.find((e) => e.name === interactiveConfig.model) as IModel;
    let list = [] as IModelClass[];
    if (model && model.mapClass) {
      const curClassMap = interactiveConfig.classes[interactiveConfig.model];
      list = Object.values(model.mapClass).map((e) => {
        const mapClass = e.modelClasses.map((mc: any) => {
          if (curClassMap[mc.code]) curClassMap[mc.code].isShow = false;
          return mc.code;
        });
        return {
          label: e.className,
          value: e.classId,
          selected: true,
          isShow: true,
          mapClass,
        } as IModelClass;
      });
    }
    iState.mapClassList = list;
  };
  
  // 切换points收集状态
  const togglePointCollection = () => {
    isCollectingPoints.value = !isCollectingPoints.value;
    if (isCollectingPoints.value) {
      editor.showMsg(MsgType.info, '开始收集points，点击图像添加点，按住Shift添加负样本点');
    } else {
      editor.showMsg(MsgType.info, '停止收集points');
      // 停止收集时清空所有点
      clearPoints();
    }
  };
  
  // 鼠标点击事件处理
  const handleImageClick = async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isCollectingPoints.value || interactiveConfig.pointType !== 'point') return;
    
    const stage = editor.mainView.stage;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // 转换为图像坐标
    const transform = stage.getAbsoluteTransform().copy().invert();
    const imagePoint = transform.point(pointer);
    
    // 检查点击是否在图像范围内
    const imageWidth = editor.mainView.backgroundWidth;
    const imageHeight = editor.mainView.backgroundHeight;
    
    if (imagePoint.x >= 0 && imagePoint.x <= imageWidth && 
        imagePoint.y >= 0 && imagePoint.y <= imageHeight) {
      
      // 添加点，根据是否按住Shift键决定positive
      const positive = !e.evt.shiftKey;
      const newPoint = {
        x: imagePoint.x,
        y: imagePoint.y,
        positive: positive
      };
      
      interactiveConfig.points.push(newPoint);
      
      // 创建可视化点
      createVisualPoint(newPoint, interactiveConfig.points.length - 1);
      
      console.log('Added point:', newPoint);
      
      // 每点一次就调用AI模型
      await runInteractiveModel();
    }
  };
  
  // 创建可视化点
  const createVisualPoint = (point: {x: number, y: number, positive: boolean}, index: number) => {
    const stage = editor.mainView.stage;
    const layer = editor.mainView.helpLayer; // 使用帮助层
    
    // 创建圆形点
    const circle = new Konva.Circle({
      x: point.x,
      y: point.y,
      radius: 4,
      fill: point.positive ? '#52c41a' : '#ff4d4f', // 绿色为positive，红色为negative
      stroke: '#ffffff',
      strokeWidth: 1,
      draggable: false,
      listening: false, // 不监听事件，避免干扰
    });
    
    // 添加序号标签
    const text = new Konva.Text({
      x: point.x + 6,
      y: point.y - 10,
      text: String(index + 1),
      fontSize: 10,
      fill: '#ffffff',
      fontFamily: 'Arial',
      listening: false,
    });
    
    layer.add(circle);
    layer.add(text);
    layer.draw();
    
    // 存储到可视化点数组
    visualPoints.value.push(circle);
    visualPoints.value.push(text as any); // 也存储文本，方便一起删除
  };
  

  
  // 清空所有可视化点
  const clearAllVisualPoints = () => {
    visualPoints.value.forEach(point => {
      point.destroy();
    });
    visualPoints.value = [];
    
    const layer = editor.mainView.helpLayer;
    layer.draw();
  };
  
  // 键盘事件处理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && isCollectingPoints.value) {
      clearPoints();
      e.preventDefault();
    }
  };
  
  // 移除点
  const removePoint = (index: number) => {
    interactiveConfig.points.splice(index, 1);
    
    // 清空所有可视化点并重新创建
    clearAllVisualPoints();
    
    // 重新创建所有可视化点
    interactiveConfig.points.forEach((point, idx) => {
      createVisualPoint(point, idx);
    });
    
    // 移除点后也重新运行模型
    if (interactiveConfig.points.length > 0) {
      runInteractiveModel();
    }
  };
  
  // 清空所有点
  const clearPoints = () => {
    interactiveConfig.points = [];
    editor.showMsg(MsgType.info, '点集已清空');
    clearAllVisualPoints(); // 清空可视化点
  };
  
  // 监听鼠标事件和键盘事件
  onMounted(() => {
    const stage = editor.mainView.stage;
    stage.on('click', handleImageClick);
    
    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown);
  });
  
  onUnmounted(() => {
    const stage = editor.mainView.stage;
    stage.off('click', handleImageClick);
    
    // 移除键盘事件监听
    document.removeEventListener('keydown', handleKeyDown);
    
    // 清理可视化点
    clearAllVisualPoints();
  });
  
  watch(
    () => interactiveConfig.model,
    () => {
      const model = state.models.find((e) => e.name === interactiveConfig.model) as IModel;
      interactiveConfig.confidence = [0.5, 1];
      const classes = model?.classes || [];
      if (interactiveConfig.model && !interactiveConfig.classes[interactiveConfig.model]) {
        const classMap: Record<string, IModelClass> = {};
        classes.forEach((modelClass) => {
          classMap[modelClass.code] = {
            code: modelClass.code,
            name: modelClass.name,
            label: modelClass.name,
            value: modelClass.code,
            selected: true,
            isShow: true,
          };
        });
        interactiveConfig.classes[interactiveConfig.model] = classMap;
      }
      if (model) updateMapClassList();
    },
    { immediate: true },
  );
  
  watch(
    () => [interactiveOptions.value],
    () => {
      const model = interactiveOptions.value[0];
      if (model) interactiveConfig.model = model.name;
    },
    { immediate: true },
  );
  
  /**
   * interactive model class
   */
  const curClasses = computed(() => {
    return (Object.values(interactiveConfig.classes[interactiveConfig.model]) || []) as IModelClass[];
  });
  
  const flag = computed(() => {
    return !!curClasses.value.find((item) => !item.selected && item.isShow);
  });

  const onTagSwitch = function (classTag: IModelClass) {
    if (!classTag.isShow) return;
    classTag.selected = !classTag.selected;
    if (classTag.mapClass) {
      classTag.mapClass.forEach((code) => {
        const item = interactiveConfig.classes[interactiveConfig.model][code];
        item && (item.selected = classTag.selected);
      });
    }
  };
  
  function onSelectAll(selected?: boolean) {
    const _flag = typeof selected === 'boolean' ? selected : flag.value;
    Object.values(interactiveConfig.classes[interactiveConfig.model]).forEach((item) => {
      item.isShow && (item.selected = _flag);
    });
  }
  
  function onReset() {
    interactiveConfig.confidence = [0.5, 1];
    interactiveConfig.points = [];
    isCollectingPoints.value = false;
    onSelectAll(true);
    clearAllVisualPoints(); // 重置时清空可视化点
  }
  
  // 单独的运行交互式模型函数
  async function runInteractiveModel() {
    if (!interactiveConfig.model) {
      editor.showMsg(MsgType.warning, 'Please choose Model');
      return;
    }
    
    if (interactiveConfig.points.length === 0) {
      return; // 没有点就不运行
    }
    
    const frame = editor.getCurrentFrame();
    if (!frame) return;
    
    const model = state.models.find((e) => e.name === interactiveConfig.model) as IModel;
    if (!model) {
      editor.showMsg(MsgType.error, 'Model not found');
      return;
    }
    
    // 构建结果过滤参数
    const resultFilterParam: Record<string, any> = {
      classes: model?.classes.map((e) => e.value),
    };
    
    if (interactiveConfig.confidence[0]) resultFilterParam.minConfidence = interactiveConfig.confidence[0];
    if (interactiveConfig.confidence[1]) resultFilterParam.maxConfidence = interactiveConfig.confidence[1];
    
    if (!interactiveConfig.predict) {
      const selectedClasses = Object.values(interactiveConfig.classes[interactiveConfig.model]).reduce(
        (classes, item) => {
          if (item.selected) {
            classes.push(item.value);
          }
          return classes;
        },
        [] as string[],
      );
      if (selectedClasses.length <= 0) {
        editor.showMsg(MsgType.warning, 'Select at least one Class!');
        return;
      }
      resultFilterParam.classes = selectedClasses;
    }
    
    // 添加交互式数据
    resultFilterParam.interactiveData = {
      type: 'points',
      points: interactiveConfig.points
    };
    
    // 构建请求配置
    const config = {
      datasetId: (editor as any).bsState?.datasetId || '',
      dataIds: [+frame.id],
      modelId: +model.id,
      modelVersion: model?.version,
      dataType: 'SINGLE_DATA',
      modelCode: model.code,
      resultFilterParam,
    };
    
    
    console.log('Running interactive model with config:', config);
    
    try {
      // 导入API
      const { runModel } = await import('../../../../../businessNew/api/model');
      const result = await runModel(config);
      console.log('result', result);
      if (!result.data) throw new Error('Model Run Error');
      
      frame.model = {
        recordId: result.data,
        id: model.id,
        version: model.version,
        state: LoadStatus.LOADING,
        code: model.code,
      };
      
      // 开始轮询结果并渲染
      console.log('开始轮询结果');
      await pollAndRenderResult(result.data, model.code);
      
    } catch (error: any) {
      console.error('❌ Interactive model error:', error);
      editor.showMsg(MsgType.error, error.message || 'Model Run Error');
    }
  }
  
  // 轮询并渲染结果
  async function pollAndRenderResult(recordId: string, modelCode: string) {
    const maxAttempts = 30;
    const pollInterval = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const frame = editor.getCurrentFrame();
        if (!frame) return;
        
        // 手动调用一次API检查结果
        const { getModelResult } = await import('../../../../../businessNew/api/model');
        const data = await getModelResult([frame.id], recordId);
        console.log('data', data);
        if (data.data && data.data.modelDataResults) {
          const resultList = data.data.modelDataResults;
          const resultMap = {} as Record<string, any>;
          resultList.forEach((e: any) => {
            resultMap[e.dataId] = e;
          });
          
          const info = resultMap[frame.id];
          
          if (info) {
            const modelResult = info.modelResult;
            if (modelResult.code === 'OK') {
              const objects = (modelResult.objects || []) as any[];
              if (objects.length > 0) {
                // 更新frame.model状态
                if (frame.model) {
                  frame.model.state = LoadStatus.COMPLETE;
                }
                
                // 存储结果到DataManager
                (editor.dataManager as any).setModelResult(frame.id, { 
                  objects, 
                  modelCode 
                });
                
                // 渲染结果
                await renderInteractiveResult({ objects, modelCode });
                return;
              }
            } else {
              console.error('❌ Model failed:', modelResult.message);
              frame.model = undefined;
              editor.showMsg(MsgType.error, modelResult.message || 'Model processing failed');
              return;
            }
          }
        }
        
        // 如果还没完成，等待一段时间后继续
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        if (attempt === maxAttempts - 1) {
          editor.showMsg(MsgType.error, 'AI processing timeout');
          throw new Error('AI processing timeout');
        }
      }
    }
    
    editor.showMsg(MsgType.error, 'AI processing timeout');
    throw new Error('AI processing timeout');
  }
  
  // 渲染交互式模型结果
  async function renderInteractiveResult(modelResult: any) {
    
    try {
      const { objects } = modelResult;
      if (!objects || objects.length === 0) {
        editor.showMsg(MsgType.warning, 'No objects found in model result');
        return;
      }
      

      
      // 使用现有的转换逻辑
      const { convertObject2Annotate } = await import('../../../../../businessNew/utils');
      
      const annotates = await convertObject2Annotate(editor, objects.map((o: any) => ({
        classAttributes: Object.assign({ contour: o }, o.classAttributes || o || {}),
        ...o,
      })));
      console.log('annotates', annotates);
      // 初始化ID信息
      annotates.forEach((e: any) => {
        editor.initIDInfo(e);
      });
      
      if (annotates.length > 0) {
        // 添加到编辑器
        editor.cmdManager.withGroup(() => {
          if (editor.state.isSeriesFrame) {
            editor.cmdManager.execute('add-track', editor.createTrackObj(annotates));
          }
          editor.cmdManager.execute('add-object', annotates);
        });
        
        editor.showMsg(MsgType.success, `Created ${annotates.length} interactive annotation(s)`);
        
      }
      
    } catch (error) {
      console.error('❌ Interactive result rendering error:', error);
      editor.showMsg(MsgType.error, 'Failed to render interactive result');
    }
  }
  

  
  async function onInteractiveRun() {
    await runInteractiveModel();
  }
</script>

<style lang="less" scoped>
.tool-trigger {
  cursor: pointer;
  display: inline-block;
  padding: 4px;
  border-radius: 4px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.tool-info-tooltip {
  .title2 {
    margin: 8px 0;
    font-size: 12px;
    color: #bec1ca;
  }
}
</style> 