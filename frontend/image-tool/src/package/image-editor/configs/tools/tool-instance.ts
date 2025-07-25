import { ToolName } from './../../types/enum';
import { Editor, IToolItemConfig, UIType } from '../..';

/**
 * tools
 */
// edit
export const editTool: IToolItemConfig = {
  action: ToolName.edit,
  name: 'Selection Tool',
  hotkey: 'Q',
  title: 'edit',
  getIcon: () => ToolName.edit,
  isDisplay: function (editor: Editor) {
    return true; // editor.state.modeConfig.ui[UIType.edit];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName.default;
  },
};
// rect
export const rectTool: IToolItemConfig = {
  action: ToolName.rect,
  name: 'Rectangle Tool',
  hotkey: 1,
  title: 'Bounding Box',
  getIcon: () => ToolName.rect,
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_rect];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName.rect;
  },
};
// polygon
export const polygonTool: IToolItemConfig = {
  action: ToolName.polygon,
  name: 'Polygon Tool',
  hotkey: 2,
  title: 'Polygon',
  getIcon: () => ToolName.polygon,
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_polygon];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName.polygon;
  },
};
// polyline
export const lineTool: IToolItemConfig = {
  action: ToolName.polyline,
  name: 'Polyline Tool',
  hotkey: 3,
  title: 'Polyline',
  getIcon: () => ToolName.polyline,
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_line];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName.polyline;
  },
};
// keypoint
export const keyPointTool: IToolItemConfig = {
  action: ToolName['key-point'],
  name: 'KeyPoint Tool',
  hotkey: 4,
  title: 'Key Point',
  getIcon: () => ToolName['key-point'],
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_keyPoint];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName['key-point'];
  },
};
// comment bubble
export const commentBubbleTool: IToolItemConfig = {
  action: ToolName['comment-bubble'],
  name: 'Comment Bubble Tool',
  hotkey: 5,
  title: 'Comment Bubble',
  getIcon: () => ToolName['comment-bubble'],
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_commentBubble];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName['comment-bubble'];
  },
};
// iss
export const issTool: IToolItemConfig = {
  action: ToolName.iss,
  name: 'ISS Tool',
  hotkey: 5,
  title: 'Instance Semantic Segmentation',
  getIcon: () => ToolName.iss,
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_iss];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName.iss;
  },
};

// iss-rect
export const issRectTool: IToolItemConfig = {
  action: ToolName['iss-rect'],
  name: 'ISS Rect Tool',
  hotkey: 6,
  title: 'ISS Rect with AI',
  getIcon: () => ToolName.rect, // 使用rect图标
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_iss];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName['iss-rect'];
  },
};

// iss-points
export const issPointsTool: IToolItemConfig = {
  action: ToolName['iss-points'],
  name: 'ISS Points Tool',
  hotkey: 7,
  title: 'ISS Points with AI',
  getIcon: () => ToolName['key-point'], // 使用key-point图标
  isDisplay: function (editor: Editor) {
    return editor.state.modeConfig.ui[UIType.tool_iss];
  },
  isActive: function (editor: Editor) {
    const state = editor.state;
    return state.activeTool === ToolName['iss-points'];
  },
};
