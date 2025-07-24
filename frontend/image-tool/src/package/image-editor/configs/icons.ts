import { h } from 'vue';
import { ToolName, ToolType } from '../types';

type AllTool = ToolType | ToolName | 'loading' | '';
const ToolIconClass: Record<AllTool, string> = {
  [ToolType.RECTANGLE]: 'iconfont icon-rect',
  [ToolType.BOUNDING_BOX]: 'iconfont icon-rect',
  [ToolName.rect]: 'iconfont icon-rect',

  [ToolType.POLYGON]: 'iconfont icon-polygon',
  [ToolName.polygon]: 'iconfont icon-polygon',

  [ToolType.POLYLINE]: 'iconfont icon-polyline',
  [ToolName.polyline]: 'iconfont icon-polyline',

  [ToolType.KEY_POINT]: 'iconfont icon-point',
  [ToolName['key-point']]: 'iconfont icon-point',

  [ToolType.ISS]: 'iconfont icon-polygon', 
  [ToolName.iss]: 'iconfont icon-polygon', 

  [ToolType.ISS_RECT]: 'iconfont icon-rect', 
  [ToolName['iss-rect']]: 'iconfont icon-rect', 

  [ToolType.ISS_POINTS]: 'iconfont icon-point', 
  [ToolName['iss-points']]: 'iconfont icon-point',

  [ToolType.COMMENT_BUBBLE]: 'iconfont icon-info',
  [ToolName['comment-bubble']]: 'iconfont icon-info',

  [ToolName.model]: 'iconfont icon-ai',

  [ToolName.interactive]: 'iconfont icon-ai',

  [ToolName.edit]: 'iconfont icon-arrow',
  loading: 'iconfont icon-loading loading',
  [ToolName.default]: '',
};
interface IToolIcon {
  tool: AllTool;
}
export const ToolIcon = (props: IToolIcon, ctx: any) => {
  const { tool } = props;
  let iconClass: string = ToolIconClass[tool] || '';
  return h('i', { style: 'font-size: 16px', class: iconClass });
};
