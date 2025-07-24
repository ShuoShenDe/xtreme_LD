<template>
  <div class="object-edit-class" v-if="selectedObject">
    <div class="edit-class-header">
      <h4>{{ t('objectInfoPanel.editClass.title') }}</h4>
    </div>
    <div class="edit-class-content">
      <ClassList @onChangeClass="onClassChange" @onChangeAttrs="onAttChange" />
      <ClassAttrsCopy v-if="state.classId && !state.isMultiple" />
    </div>
    <div class="edit-class-footer">
      <div class="advance-item">
        <span>{{ t('objectInfoPanel.editClass.trackId') }}</span>
        <div class="item-content">
          <div class="item-info"> {{ String(state.trackId) }} </div>
          <copy-outlined class="copy-icon" :title="t('objectInfoPanel.editClass.copy')" @click="onCopyTrackId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { reactive, watch } from 'vue';
  import { useClipboard } from '@vueuse/core';
  import { CopyOutlined } from '@ant-design/icons-vue';
  import { debounce, cloneDeep } from 'lodash';
  import { useI18n } from 'vue-i18n';
  import {
    IClassType,
    AnnotateObject,
    ToolType,
    MsgType,
  } from 'image-editor';
  import { useInjectEditor } from 'image-ui/context';
  import { useProvide, IAttrItem } from '../context';
  import useUI from 'image-ui/hook/useUI';
  import useEditClass from '../useEditClass';
  import { provide } from 'vue';
  import { context as editClassContext } from 'image-ui/components/EditClass/context';

  import ClassList from 'image-ui/components/EditClass/components/classList.vue';
  import ClassAttrsCopy from 'image-ui/components/EditClass/components/classAttrsCopy.vue';

  const EVENT_SOURCE = 'object_edit_class';
  let currentObject = [] as AnnotateObject[];
  let currentAttrs = {} as any;
  const { canEdit } = useUI();
  const { copy } = useClipboard();
  const editor = useInjectEditor();
  const { t } = useI18n();
  const { getClassInfo, getUserDataAttrs, setAttrsDefaultValue } = useEditClass();

  // Props
  const props = defineProps<{
    selectedObject: AnnotateObject | null;
  }>();

  const state = reactive({
    searchVal: '',
    value: '',
    objects: [] as AnnotateObject[],
    objectId: [] as string[],
    trackId: [] as string[],
    trackName: [] as string[],
    toolType: ToolType.BOUNDING_BOX,
    classType: '',
    classList: [] as IClassType[],
    classId: '',
    attrs: [] as IAttrItem[],
    pointsLimit: 0,
    isMultiple: false,
    posX: 0,
    posY: 0,
    isSkeleton: false,
    reset: resetClassInfo,
  });

  useProvide(state as any);
  
  // 同时提供原有的 context 以支持 ClassAttrsCopy 组件
  provide(editClassContext, state as any);

  function resetClassInfo() {
    currentObject?.length > 0 && showObject(currentObject);
  }

  function onCopyTrackId() {
    copy(String(state.trackId));
    editor.showMsg(MsgType.success, t('objectInfoPanel.editClass.copySuccess'));
  }

  function showObject(object: AnnotateObject | AnnotateObject[]) {
    state.isMultiple = Array.isArray(object) && object.length > 1;
    const objects: AnnotateObject[] = Array.isArray(object) ? object : [object];
    state.objectId.length = 0;
    state.trackId.length = 0;
    state.trackName.length = 0;
    state.objects = objects;
    objects.forEach((obj) => {
      state.objectId.push(obj.uuid);
      state.trackId.push(obj.userData.trackId);
      state.trackName.push(obj.userData.trackName);
    });
    updateData();
  }

  function updateData() {
    console.log('object edit class updateData');

    state.isSkeleton = false;
    const objArr: AnnotateObject[] = [];
    state.objectId.forEach((id) => {
      const obj = editor.dataManager.getObject(id);
      if (obj) {
        objArr.push(obj);
        obj.userData.needCompose = true;
      }
    });
    if (objArr.length === 0) {
      state.objectId = [];
      return;
    }

    currentObject = objArr;
    const object = objArr[0];
    const userData = getClassInfo(object);
    state.pointsLimit = userData.pointsLimit || 0;
    const classConfig = editor.getClassType(userData.classId || '');

    state.classType = classConfig ? classConfig.name : '';
    state.classId = classConfig ? classConfig.id : '';
    state.toolType = classConfig?.toolType || userData.toolType || object.toolType;

    updateAttrInfo(object, state.classId);

    state.classList = editor.getClassList(state.toolType);
  }

  function onClassChange(classId: string) {
    const classConfig = editor.getClassType(classId);
    if (!classConfig) return;
    editor.trackManager.addChangedTrack(state.trackId);
    let objects: AnnotateObject[] = [];
    if (editor.state.isSeriesFrame) {
      objects = editor.trackManager.getObjects(state.trackId);
    } else objects = currentObject;

    editor.cmdManager.withGroup(() => {
      if (editor.state.isSeriesFrame) {
        const data = { classId: classId, classType: classConfig.name };
        const trackData = state.trackId.map((trackId) => {
          return { trackId, data };
        });
        editor.cmdManager.execute('update-track', trackData);
      }

      editor.cmdManager.execute('update-user-data', {
        objects,
        data: {
          classId: classId,
          classType: classConfig.name,
          attrs: {},
        },
      });
    });
    editor.mainView.draw();
  }

  const debounceUpdateAttr = debounce(() => {
    editor.withEventSource(EVENT_SOURCE, () => {
      const attrs = JSON.parse(JSON.stringify(currentAttrs));
      editor.cmdManager.execute('update-user-data', {
        objects: currentObject,
        data: {
          attrs,
        },
      });
    });
  }, 100);

  function onAttChange(name: string, value: any) {
    currentAttrs[name] = value;
    debounceUpdateAttr();
  }

  function updateAttrInfo(object: AnnotateObject, classId: string) {
    const classConfig = editor.getClassType(classId);
    if (!classConfig) return;
    const attrs = getUserDataAttrs(object);
    const newAttrs: any[] = cloneDeep(classConfig.attrs || []);
    setAttrsDefaultValue(newAttrs, attrs);
    state.attrs = newAttrs;
    currentAttrs = JSON.parse(JSON.stringify(attrs));
  }

  // Watch selectedObject changes
  watch(
    () => props.selectedObject,
    (newObject) => {
      if (newObject) {
        showObject(newObject);
      }
    },
    { immediate: true }
  );
</script>

<style lang="less" scoped>
  .object-edit-class {
    border-top: 1px solid #3d3d3d;
    margin-top: 16px;
    padding-top: 16px;
  }

  .edit-class-header {
    margin-bottom: 16px;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }
  }

  .edit-class-content {
    margin-bottom: 16px;
    
    // 覆盖原有组件的固定宽度，使其适应侧边栏
    :deep(.class-list) {
      width: 100% !important;
    }
    
    :deep(.class-attrs-card) {
      width: 100% !important;
    }
    
    :deep(.class-msg-warn) {
      width: 100% !important;
    }
  }

  .edit-class-footer {
    .advance-item {
      margin-bottom: 16px;
      text-align: left;

      span {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        color: #8c8c8c;
      }

      .item-content {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .item-info {
        display: inline-block;
        padding: 4px 8px;
        flex: 1;
        background-color: #4a5162;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        margin-right: 8px;
      }

      .copy-icon {
        font-size: 16px;
        cursor: pointer;
        color: #8c8c8c;

        &:hover {
          color: #2e8cf0;
        }
      }
    }
  }
</style> 