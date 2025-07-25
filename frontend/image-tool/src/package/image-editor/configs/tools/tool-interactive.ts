import { Editor, IToolItemConfig, UIType } from '../..';
import { LoadStatus, ToolName } from '../../types/enum';
import InteractiveConfig from 'image-ui/components/Tools/components/InteractiveConfig.vue';

/**
 * interactive
 */
export const interactiveTool: IToolItemConfig = {
  action: ToolName.interactive,
  name: 'interactive',
  hotkey: '',
  title: 'interactive',
  hasMsg: (editor: Editor) => {
    const frame = editor.getCurrentFrame();
    return frame?.model?.state === LoadStatus.COMPLETE;
  },
  extra: () => InteractiveConfig,
  extraClass: true,
  getIcon: (editor: Editor) => {
    const icon = ToolName.interactive;
    const frame = editor.getCurrentFrame();
    return frame?.model?.state === LoadStatus.LOADING ? 'loading' : icon;
  },
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.interactive];
  },
  isActive: function (editor: Editor) {
    const frame = editor.getCurrentFrame();
    return frame?.model?.state === LoadStatus.LOADING;
  },
}; 