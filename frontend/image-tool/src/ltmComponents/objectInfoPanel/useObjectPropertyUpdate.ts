import { useInjectBSEditor } from '@/businessNew/context';
import type { PropertyChangeEvent } from './types';

export function useObjectPropertyUpdate() {
  const editor = useInjectBSEditor();

  /**
   * 更新物体属性
   * @param event 属性变化事件
   */
  const updateObjectProperty = (event: PropertyChangeEvent) => {
    const { selectedObject, propSetting, newValue } = event;
    
    // 获取当前选中的物体
    const currentSelection = editor.selection;
    if (currentSelection.length === 0) {
      console.warn('ObjectInfoPanel - No objects selected for property update');
      return;
    }

    // 找到对应的编辑器物体对象
    const editorObject = currentSelection.find(obj => {
      return obj.uuid === selectedObject.uuid;
    });

    if (!editorObject) {
      console.warn('ObjectInfoPanel - Could not find corresponding editor object for property update');
      return;
    }

    // 根据属性类型执行不同的更新策略
    if (propSetting.propName.startsWith('userData.')) {
      // 更新 userData 属性
      updateUserDataProperty(editorObject, propSetting.propName, newValue);
    } else if (propSetting.propName.startsWith('attrs.')) {
      // 更新 attrs 属性
      updateAttrsProperty(editorObject, propSetting.propName, newValue);
    } else {
      // 更新其他属性
      updateOtherProperty(editorObject, propSetting.propName, newValue);
    }
  };

  /**
   * 更新 userData 属性
   */
  const updateUserDataProperty = (editorObject: any, propName: string, newValue: any) => {
    // 提取属性名（去掉 userData. 前缀）
    const propertyName = propName.replace('userData.', '');
    
    // 确保 userData 存在
    if (!editorObject.userData) {
      editorObject.userData = {};
    }

    // 使用 setAnnotatesUserData 更新用户数据
    // 这个方法会自动处理视图更新、样式更新、事件触发等
    editor.dataManager.setAnnotatesUserData([editorObject], {
      [propertyName]: newValue
    });
  };

  /**
   * 更新 attrs 属性
   */
  const updateAttrsProperty = (editorObject: any, propName: string, newValue: any) => {
    // 提取属性名（去掉 attrs. 前缀）
    const propertyName = propName.replace('attrs.', '');
    
    // 直接使用 setAnnotatesTransform 更新属性
    // 这个方法会自动处理 Konva 对象的属性更新、位置同步、事件触发等
    editor.dataManager.setAnnotatesTransform([editorObject], { [propertyName]: newValue });
  };

  /**
   * 更新其他属性
   */
  const updateOtherProperty = (editorObject: any, propName: string, newValue: any) => {
    // 直接设置属性
    editorObject[propName] = newValue;

    // 触发物体变化事件
    editor.dataManager.onAnnotatesChange([editorObject], 'other');
  };

  return {
    updateObjectProperty
  };
} 