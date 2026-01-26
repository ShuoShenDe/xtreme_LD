import { computed } from 'vue';
import { useInjectBSEditor } from '../../context';
import Event from '../../configs/event';

export default function useFlowIndex() {
  const editor = useInjectBSEditor();
  const { state } = editor;

  const indexInfo = computed(() => {
    let total = 1;
    let currentIndex = 0;
    if (state.isSeriesFrame) {
      total = state.sceneIds.length;
      currentIndex = state.sceneIndex; // Keep 0-based for Flowindex component
    } else {
      total = state.frames.length;
      currentIndex = state.frameIndex; // Keep 0-based for Flowindex component
    }
    return {
      total,
      currentIndex,
    };
  });

  async function onIndex(args: { index: number }) {
    const { index } = args;
    
    const { frames } = editor.state;
    if (state.isSeriesFrame) {
      const { sceneIds, sceneIndex } = state;
      if (index < 0 || index >= sceneIds.length) {
        return;
      }
      const needSave = frames.findIndex((e) => e.needSave) !== -1;
      if (needSave) {
        const result = await editor.save();
        if (!result) return;
      }
      await editor.loadManager.loadSceneData(index);
      editor.emit(Event.SCENE_CHANGE, { preScene: sceneIndex, newScene: index });
    } else {
      if (index < 0 || index >= frames.length) {
        return;
      }
      // Persist pending changes before switching frames
      const needSave = frames.findIndex((e) => e.needSave) !== -1;
      if (needSave) {
        const result = await editor.save();
        if (!result) return;
      }
      editor.switchFrame(index);
    }
  }
  return {
    indexInfo,
    onIndex,
  };
}
