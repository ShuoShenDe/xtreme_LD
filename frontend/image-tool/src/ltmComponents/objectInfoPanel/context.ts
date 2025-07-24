import { provide, inject, type InjectionKey } from 'vue';
import { AnnotateObject, IAttr, IClassType, ToolType } from 'image-editor';

export interface IAttrItem extends IAttr {
  value: any;
}

export interface IEditClassState {
  searchVal: string;
  value: string;
  objects: AnnotateObject[];
  objectId: string[];
  trackId: string[];
  trackName: string[];
  toolType: ToolType;
  classType: string;
  classList: IClassType[];
  classId: string;
  attrs: IAttrItem[];
  pointsLimit: number;
  isMultiple: boolean;
  posX: number;
  posY: number;
  isSkeleton: boolean;
  reset: () => void;
}

const EditClassStateKey: InjectionKey<IEditClassState> = Symbol('EditClassState');

export function useProvide(state: IEditClassState) {
  provide(EditClassStateKey, state);
}

export function useInject(): IEditClassState {
  const state = inject(EditClassStateKey);
  if (!state) {
    throw new Error('useInject must be used within a component that provides EditClassState');
  }
  return state;
} 