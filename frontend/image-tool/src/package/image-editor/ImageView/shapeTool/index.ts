import ShapeTool, { ToolEvent } from './ShapeTool';
import RectTool from './RectTool';
import PolygonTool from './PolygonTool';
import PolylineTool from './PolylineTool';
import KeyPointTool from './KeyPointTool';
import CommentBubbleTool from './CommentBubbleTool';
import IssTool from './IssTool';
import IssRectTool from './IssRectTool';
import IssPointsTool from './IssPointsTool';

export { ShapeTool, RectTool, PolygonTool, PolylineTool, KeyPointTool, IssTool, IssRectTool, IssPointsTool, CommentBubbleTool };

export type ShapeToolCtr = new (view: any) => ShapeTool;

export const toolMap = {
  rect: RectTool,
  polyline: PolylineTool,
  polygon: PolygonTool,
  'key-point': KeyPointTool,
  iss: IssTool,
  'iss-rect': IssRectTool,
  'iss-points': IssPointsTool,
  'comment-bubble': CommentBubbleTool,
};

export const allTools = toolMap as Record<string, ShapeToolCtr>;

export type IToolName = keyof typeof toolMap;
export type { ToolEvent };
