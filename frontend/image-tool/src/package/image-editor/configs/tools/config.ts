import { IToolItemConfig } from '../..';
import { AnnotateModeEnum, ToolName } from '../../types/enum';
import { editTool, rectTool, polygonTool, lineTool, keyPointTool, issTool, issRectTool, issPointsTool, commentBubbleTool, interactiveTool, modelTool } from './index';

interface IToolMode {
  fixed: IToolItemConfig[];
  model: IToolItemConfig[];
  tools: IToolItemConfig[];
  issTools: IToolItemConfig[];
}

export const toolMap: Record<ToolName, IToolItemConfig> = {
  [ToolName.default]: editTool,
  [ToolName.edit]: editTool,
  [ToolName.rect]: rectTool,
  [ToolName.polygon]: polygonTool,
  [ToolName.polyline]: lineTool,
  [ToolName['key-point']]: keyPointTool,
  [ToolName.iss]: issTool,
  [ToolName['iss-rect']]: issRectTool,
  [ToolName['iss-points']]: issPointsTool,
  [ToolName['comment-bubble']]: commentBubbleTool,
  [ToolName.model]: modelTool,
  // [ToolName.interactive]: interactiveTool,
};

// fixed tools
const tools_fixed: IToolItemConfig[] = [toolMap[ToolName.edit]];
// instance
const tools_graph: IToolItemConfig[] = [
  toolMap[ToolName.rect],
  toolMap[ToolName.polygon],
  toolMap[ToolName.polyline],
  // toolMap[ToolName['key-point']],
  toolMap[ToolName['comment-bubble']]
];
// ISS tools
const tools_iss: IToolItemConfig[] = [
  toolMap[ToolName.iss],
  toolMap[ToolName['iss-rect']],
  toolMap[ToolName['iss-points']],
];
// segment
const tools_segment: IToolItemConfig[] = [];
// model
const tools_model: IToolItemConfig[] = [toolMap[ToolName.model] /*, toolMap[ToolName.interactive]*/];
// segment model
const tools_model_seg: IToolItemConfig[] = [];
// instance tools
export const tools_instance: IToolMode = {
  fixed: tools_fixed,
  model: tools_model,
  tools: tools_graph,
  issTools: tools_iss,
};
// segment tools
export const tools_segmentation: IToolMode = {
  fixed: tools_fixed,
  model: tools_model_seg,
  tools: tools_segment,
  issTools: tools_iss,
};
export const tools = {
  [AnnotateModeEnum.INSTANCE]: tools_instance,
  [AnnotateModeEnum.SEGMENTATION]: tools_segmentation,
};
