import { ref, watchEffect } from 'vue';
import { useInjectEditor } from '../../context';
import {
  Event,
  ToolName,
  toolMap,
  IToolItemConfig,
  tools,
  LoadStatus,
  AnnotateModeEnum,
} from '../../../image-editor';
interface IToolConfig {
  toolItems: IToolItemConfig[];
  fixedItems: IToolItemConfig[];
  modelItems: IToolItemConfig[];
  polygonItems: IToolItemConfig[];
  issToolItems: IToolItemConfig[];
}

export default function useTool() {
  const editor = useInjectEditor();
  editor.on(Event.TOOL_CHANGE, onToolByHotkey);
  editor.on(Event.UPDATE_VIEW_MODE, updateItemList);
  editor.on(Event.CLASS_INITDATA, updateItemList);
  editor.on(Event.MODEL_LOADED, updateItemList);

  const hotKeyMap = new Map<string, ToolName>();
  const toolState = ref<IToolConfig>({
    toolItems: [],
    fixedItems: [],
    modelItems: [],
    polygonItems: [],
    issToolItems: [],
  });

  function updateItemList() {
    const { fixed, tools, model, issTools } = getCurModeTools();
    hotKeyMap.clear();
    const config: IToolConfig = {
      toolItems: [],
      fixedItems: [],
      modelItems: [],
      polygonItems: [],
      issToolItems: [],
    };
    config.toolItems = filterTools(tools);
    config.fixedItems = filterTools(fixed);
    config.modelItems = filterTools(model);
    config.polygonItems = [] as IToolItemConfig[];
    config.issToolItems = filterTools(issTools);
    const list = [...config.fixedItems, ...config.modelItems, ...config.polygonItems, ...config.issToolItems];
    updateFixedHotkey(list);
    updateCustomHotkey(config.toolItems);
    toolState.value = config;
  }
  watchEffect(updateItemList);
  function getCurModeTools() {
    return (tools as any)[editor.state.annotateMode];
  }
  /** filter tool*/
  function filterTools(list: IToolItemConfig[]) {
    return list.filter((item) => item.isDisplay(editor));
  }
  function updateFixedHotkey(list: IToolItemConfig[]) {
    list.forEach((item) => {
      const key = String(item.hotkey).toLocaleLowerCase();
      key && hotKeyMap.set(key, item.action);
    });
  }
  function updateCustomHotkey(list: IToolItemConfig[]) {
    list.forEach((item, index) => {
      const hotkey = ((index + 1) % 10) + '';
      item.order = index;
      item.hotkey = hotkey;
      hotKeyMap.set(hotkey, item.action);
    });
  }

  function onToolByHotkey(key: string) {
    key = key.toLocaleLowerCase();
    const actionName = hotKeyMap.get(key);
    if (!actionName || !toolMap[actionName]) return;
    onTool(actionName);
  }

  /** Select Tool */
  function onTool(name: string, args?: any) {
    try {
      switch (name) {
        case 'edit': {
          editor.actionManager.execute('selectTool');
          break;
        }
        case 'rect':
        case 'polygon':
        case 'polyline':
        case 'key-point':
        case 'comment-bubble':
        case 'iss':
        case 'iss-points': 
        case 'iss-rect': {
          editor.actionManager.execute('drawTool', name);
          break;
        }
        case 'addInterior': {
          editor.actionManager.execute('holeSelection', name);
          break;
        }
        case 'removeInterior': {
          editor.actionManager.execute('removeHoleSelection');
          break;
        }
        case 'clipPolygon': {
          editor.actionManager.execute('clipSelection', args);
          break;
        }
        default: {
          console.log('No matching case for tool:', name);
        }
      }
    } catch (error) {
      console.error('Error in onTool function:', error);
      console.error('Tool name:', name);
      console.error('Editor:', editor);
      
    }
  }

  return {
    toolState,
    onTool,
    updateItemList,
    updateCustomHotkey,
    // onClaim,
  };
}
