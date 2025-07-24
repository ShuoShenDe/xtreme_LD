import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useInjectBSEditor } from '../../../context';
import { IState } from './type';
import { Event, StatusType } from 'image-editor';
import useList from './useList';

export default function useResults() {
  const editor = useInjectBSEditor();

  const domRef = ref<HTMLDivElement>();
  const resultState = reactive<IState>({
    list: [],
    objectN: 0,
    updateListFlag: true,
    updateSelectFlag: true,
    selectMap: {},
    activeClass: [],
  });
  const { onSelect, onUpdateList, update } = useList(resultState, domRef);

  // 检查 editor 是否已准备好的函数
  const isEditorReady = () => {
    // 更宽松的检查：只要editor和state存在即可，不强制要求status为Default
    // 因为在annotation创建过程中，status可能临时不是Default
    return editor && editor.state;
  };

  // 包装事件处理函数，添加状态检查
  const safeOnUpdateList = () => {
    if (isEditorReady()) {
      onUpdateList();
    }
  };

  const safeOnSelect = () => {
    if (isEditorReady()) {
      onSelect();
    }
  };

  // 组件挂载后设置事件监听器
  onMounted(() => {
    // 设置事件监听器
    editor.on(Event.FRAME_CHANGE, safeOnUpdateList);
    editor.on(Event.ANNOTATE_ADD, safeOnUpdateList);
    editor.on(Event.ANNOTATE_REMOVE, safeOnUpdateList);
    editor.on(Event.ANNOTATE_CHANGE, safeOnUpdateList);
    editor.on(Event.ANNOTATE_VISIBLE, safeOnUpdateList);
          editor.on(Event.ANNOTATE_CREATE, safeOnUpdateList);
    editor.on(Event.SELECT, safeOnSelect);

    // 延迟执行，确保 DOM 已经渲染完成
    setTimeout(() => {
      if (isEditorReady()) {
        update();
      } else {
        // 如果 editor 还没准备好，延迟重试
        const retryUpdate = () => {
          if (isEditorReady()) {
            update();
          } else {
            setTimeout(retryUpdate, 100);
          }
        };
        setTimeout(retryUpdate, 100);
      }
    }, 100);
  });

  // 组件卸载前清理事件监听器
  onBeforeUnmount(() => {
    editor.off(Event.FRAME_CHANGE, safeOnUpdateList);
    editor.off(Event.ANNOTATE_ADD, safeOnUpdateList);
    editor.off(Event.ANNOTATE_REMOVE, safeOnUpdateList);
    editor.off(Event.ANNOTATE_CHANGE, safeOnUpdateList);
    editor.off(Event.ANNOTATE_VISIBLE, safeOnUpdateList);
          editor.off(Event.ANNOTATE_CREATE, safeOnUpdateList);
    editor.off(Event.SELECT, safeOnSelect);
  });

  return { resultState, domRef, onUpdateList };
}
