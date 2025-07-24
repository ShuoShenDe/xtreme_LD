import { Ref } from 'vue';
import { IClassItem, IObjectItem, IState } from './type';
import { useInjectBSEditor } from '../../../context';
import { debounce } from 'lodash';
import { IFrame, IUserData } from 'image-editor';
import { getObjectInfo } from './utils';

export const animation = {
  onEnter(node: any, done: any) {},
  onLeave(node: any, done: any) {
    done();
  },
};

export default function useList(state: IState, domRef: Ref<HTMLDivElement | undefined>) {
  const editor = useInjectBSEditor();

  /** list scroll */
  const scrollSelectToView = debounce(() => {
    if (!domRef.value) return;

    const item = domRef.value.querySelector('.result-data-list .list > .item.active');
    if (item) {
      if (!isSelectVisible(item as any, domRef.value)) {
        item.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }
    }
  }, 100);
  function isSelectVisible(dom: HTMLDivElement, parent: HTMLDivElement) {
    const parentBox = parent.getBoundingClientRect();
    const domBox = dom.getBoundingClientRect();

    if (domBox.y + domBox.height > parentBox.y + parentBox.height || domBox.y < parentBox.y)
      return false;
    return true;
  }
  function getClassInfo(userData: IUserData) {
    let className = '';
    let classId = '';
    let isModel = false;
    if (!userData.classId && userData.modelClass) {
      isModel = true;
      classId = '__Model__##' + userData.modelClass;
      className = userData.modelClass;
    } else {
      classId = userData.classId || '';
      const classConfig = editor.getClassType(classId);
      className = classConfig ? classConfig.name : '';
    }
    return { className, isModel, classId };
  }
  function getClassList() {
    const classMap: Record<string, IClassItem> = {};
    const classTypes = editor.state.classTypes || [];
    classTypes.forEach((config) => {
      if (config && config.id) {
        const classItem: IClassItem = {
          data: [],
          alias: config.alias,
          color: config.color || '#ffffff',
          id: config.id,
          name: config.name,
          classType: config.name,
          classId: config.id,
          toolType: config.toolType,
          key: config.id,
        };
        classMap[config.id] = classItem;
      }
    });
    return classMap;
  }

  const update = debounce(() => {
    if (state.updateListFlag) {
      state.updateSelectFlag = true;
      updateList();
    }
    if (state.updateSelectFlag) {
      updateSelect();
    }
    scrollSelectToView();
  }, 100);
  function onUpdateList() {
    state.updateListFlag = true;
    update();
  }
  function onSelect() {
    state.updateSelectFlag = true;
    update();
  }

  function updateList() {
    // 检查 editor 是否已初始化
    if (!editor || !editor.state) {
      return;
    }
    
    const isShowAll = false;
    let frames: IFrame[] = [];
    if (isShowAll) {
      frames = editor.state.frames || [];
    } else {
      const currentFrame = editor.getCurrentFrame();
      if (currentFrame) {
        frames = [currentFrame];
      } else {
        // 如果当前帧不存在，返回空数组，避免错误
        frames = [];
      }
    }
    
    // 检查是否有有效的帧
    if (frames.length === 0) {
      state.list = [];
      state.objectN = 0;
      return;
    }
    
    const filter = editor.getRenderFilter();
    let objN = 0;

    // class items
    const classMap = getClassList();
    // object items
    frames.forEach((f) => {
      if (!f || !f.id) {
        return;
      }
      // 🔧 修复：使用getAllFrameObjects获取所有类型的对象（包括ISS）
      let objs = editor.dataManager.getAllFrameObjects(f.id) || [];
      objs = objs.filter((e) => filter(e));
      
      objs.forEach((obj) => {
        const userData = editor.getUserData(obj);
        const trackName = userData.trackName || '';
        const trackId = userData.trackId || '';
        const { isModel, classId, className } = getClassInfo(userData);
        const classConfig = editor.getClassType(classId);
        const toolType = classConfig ? classConfig.toolType : obj.toolType;
        let classItem = classMap[classId];
        if (!classItem) {
          classItem = {
            data: [],
            alias: classConfig?.label,
            color: 'rgb(252, 177, 122)',
            id: classId,
            name: classId ? className : editor.lang('Class Required'),
            classType: className,
            classId: classId,
            toolType,
            isModel: isModel,
            visible: false,
            key: classId,
          };
          classMap[classId] = classItem;
        }
        const objItem: IObjectItem = {
          id: obj.uuid,
          trackId,
          trackName,
          name: trackName,
          classType: classConfig?.name || '',
          classId,
          toolType,
          visible: obj.showVisible,
          isModel: false,
          frame: obj.frame,
          key: obj.uuid + Date.now(),
        };
        objItem.attrLabel = classConfig ? editor.getValidAttrs(userData) : '';
        const infos = getObjectInfo(obj);
        objItem.sizeLabel = infos.join(' | ');
        classItem.data.push(objItem);
        objN++;
        if (obj.showVisible) classItem.visible = true;
      });
    });
    const list: IClassItem[] = [];
    Object.values(classMap).forEach((e) => {
      if (e.data.length === 0) return;
      if (e.id === '') list.unshift(e);
      else list.push(e);
    });
    state.list = list;
    state.objectN = objN;
  }
  function updateSelect() {
    const selection = editor.selection;
    
    // 清空之前的选中状态
    state.selectMap = {};
    
    if (selection.length === 0) {
      state.activeClass = [];
      state.updateSelectFlag = false;
      return;
    }
    
    // 处理每个选中的对象
    selection.forEach((object) => {
      state.selectMap[object.uuid] = true;
      
      const userData = editor.getUserData(object);
      const { classId } = getClassInfo(userData);
      if (state.activeClass.indexOf(classId) < 0) {
        state.activeClass = [...state.activeClass, classId];
      }
    });
    
          state.updateSelectFlag = false;
  }

  return {
    update,
    onUpdateList,
    onSelect,
  };
}
