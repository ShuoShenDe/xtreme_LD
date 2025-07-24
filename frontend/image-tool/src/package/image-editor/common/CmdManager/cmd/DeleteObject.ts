import CmdBase from '../CmdBase';
import type { ICmdOption } from './index';
import type { AnnotateObject, IFrame } from '../../../types';

export interface IDeleteObjectItem {
  objects: AnnotateObject | AnnotateObject[];
  frame?: IFrame;
}

interface IUndoData {
  subObjects: AnnotateObject[];
  topObjects: AnnotateObject[];
}

export type IDeleteObjectOption = IDeleteObjectItem | AnnotateObject | AnnotateObject[];

export default class DeleteObject extends CmdBase<ICmdOption['delete-object'], IUndoData> {
  name: string = 'delete-object';
  redo(): void {
    const editor = this.editor;
    const frame = editor.getCurrentFrame();

    if (!(this.data as any).objects) {
      const objects = Array.isArray(this.data) ? this.data : [this.data];
      const _data: IDeleteObjectItem = { objects: objects as AnnotateObject[] };
      this.data = _data;
    }

    const data = this.data as IDeleteObjectItem;
    if (!data.frame) data.frame = frame;
    const objects = data.objects as AnnotateObject[];

    if (!this.undoData) {
      const { subObjects, topObjects } = getObjects(objects);
      this.undoData = {
        subObjects,
        topObjects,
      };
    }

    const { subObjects, topObjects } = this.undoData;
    editor.dataManager.removeAnnotates([...subObjects, ...topObjects], data.frame);
  }
  undo(): void {
    const editor = this.editor;
    const data = this.data as IDeleteObjectItem;

    if (!this.undoData) return;

    const { topObjects, subObjects } = this.undoData;
    editor.dataManager.addAnnotates([...subObjects, ...topObjects], data.frame);
    
    // 强制重绘ISS对象，解决撤销后显示不正确的问题
    [...subObjects, ...topObjects].forEach(obj => {
      if (obj.toolType === 'ISS') {
        try {
          // 清除渲染缓存
          obj.clearCache();
          if (obj._clearCache) obj._clearCache();
          
          // 强制重新设置属性以触发重绘
          const currentAttrs = {
            x: obj.x(),
            y: obj.y(),
            scaleX: obj.scaleX(),
            scaleY: obj.scaleY(),
            rotation: obj.rotation(),
            points: obj.attrs.points
          };
          obj.setAttrs(currentAttrs);
          
          // 强制重绘图层
          const layer = obj.getLayer();
          if (layer) {
            layer.batchDraw();
          }
        } catch (error) {
          console.error('Failed to redraw ISS object:', error);
        }
      }
    });
  }
}

function getObjects(objects: AnnotateObject[]) {
  const map: any = {};
  objects.forEach((e) => {
    map[e.uuid] = true;
  });

  const subObjects = [] as AnnotateObject[];
  const topObjects = [] as AnnotateObject[];
  objects.forEach((e) => {
    topObjects.push(e);
  });

  return { subObjects, topObjects };
}
