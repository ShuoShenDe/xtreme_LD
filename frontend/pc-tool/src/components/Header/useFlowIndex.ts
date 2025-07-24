import { useInjectEditor } from '../../state';
import Event from '../../packages/pc-editor/config/event';

export default function useFlowIndex() {
    const editor = useInjectEditor();
    const { state } = editor;

    const indexInfo = () => {
        let total = 0;
        let currentIndex = 0;

        if (state.isSeriesFrame && state.sceneIds.length > 1) {
            // Scene navigation - always show scene info regardless of current frames
            total = state.sceneIds.length;
            currentIndex = state.sceneIndex; // Keep 0-based for scene navigation
        } else {
            // Frame navigation
            total = state.frames.length;
            currentIndex = state.frameIndex; // Keep 0-based for frame navigation
        }

        return {
            total,
            currentIndex,
            display: currentIndex + 1 // 1-based display
        };
    };

    const onIndex = async (index: number) => {
        // Convert from 1-based display to 0-based internal index
        const internalIndex = index - 1;

        if (state.isSeriesFrame) {
            const { sceneIds, sceneIndex } = state;
            
            if (internalIndex < 0 || internalIndex >= sceneIds.length) {
                return;
            }

            if (internalIndex === sceneIndex) {
                return;
            }

            try {
                await editor.loadManager.loadSceneData(internalIndex);
                editor.dispatchEvent({ type: Event.SCENE_CHANGE, data: { preScene: sceneIndex, newScene: internalIndex } });
            } catch (error) {
                // Handle error silently or show user message
            }
        } else {
            await editor.loadFrame(internalIndex);
        }
    };

    return {
        indexInfo,
        onIndex
    };
} 