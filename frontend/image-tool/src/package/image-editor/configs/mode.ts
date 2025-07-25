import { IModeConfig, OPType } from '../types';
import { IActionName } from '../common/ActionManager';

function toMap<T extends string>(arr: T[]) {
  const map = {} as Record<T, boolean>;
  arr.forEach((e) => (map[e] = true));
  return map;
}

export const UIType = {
  // ****** left tool**********
  edit: 'edit',
  tool_rect: 'tool_rect',
  tool_polygon: 'tool_polygon',
  tool_line: 'tool_line',
  tool_keyPoint: 'tool_keyPoint',
  tool_iss: 'tool_iss',
  tool_issRect: 'tool_issRect',
  tool_issPoints: 'tool_issPoints',
  tool_commentBubble: 'tool_commentBubble',
  model: 'model',
  // interactive: 'interactive',
  setting: 'setting',
  info: 'info',
};

export type IUIType = keyof typeof UIType;

const empty: IModeConfig<IUIType, IActionName> = {
  name: 'empty',
  op: OPType.VIEW,
  ui: toMap([] as IUIType[]),
  actions: {} as any,
};

const edit: IModeConfig<IUIType, IActionName> = {
  name: 'edit',
  op: OPType.EDIT,
  ui: toMap([
    'edit',
    'tool_rect',
    'tool_polygon',
    'tool_line', 
    'tool_keyPoint',
    'tool_iss',
    'tool_issRect',
    'tool_issPoints',
    'tool_commentBubble',
    'model',
    'setting',
    'info'
  ] as IUIType[]),
  actions: {} as any,
};

export const modes = { empty, edit };

export type IModeType = keyof typeof modes;

export const ModeKeys = Object.keys(modes).filter((e) => e !== 'all') as IModeType[];
