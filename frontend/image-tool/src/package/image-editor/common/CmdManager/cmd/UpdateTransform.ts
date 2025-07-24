import CmdBase from '../CmdBase';
import type { ICmdOption } from './index';
import { ITransform } from '../../../types';
import { AnnotateObject } from '../../../ImageView/shape';
import { cloneDeep } from 'lodash';

export interface IUpdateTransformOption {
  objects: AnnotateObject[] | AnnotateObject;
  transforms: ITransform[] | ITransform;
  fromData?: ITransform[] | ITransform;
}

export default class UpdateTransform extends CmdBase<
  ICmdOption['update-transform'],
  ICmdOption['update-transform']
> {
  name: string = 'update-transform';
  redo(): void {
    let editor = this.editor;

    let { objects, transforms } = this.data;
    if (!Array.isArray(objects)) objects = [objects];

    console.log('[UpdateTransform] redo called:', { 
      objects: objects.map(obj => ({ uuid: obj.uuid, attrs: obj.attrs })),
      transforms 
    });

    // 记录每个对象更新前的状态
    objects.forEach((obj, index) => {
      console.log(`[UpdateTransform] object ${index} before update:`, {
        uuid: obj.uuid,
        x: obj.x(),
        y: obj.y(),
        attrs: { ...obj.attrs },
        transform: obj.getTransform(),
        absoluteTransform: obj.getAbsoluteTransform(),
        position: obj.position()
      });
    });

    if (!this.undoData) {
      let undoData: IUpdateTransformOption = {
        objects: objects,
        transforms: [],
      };
      objects.forEach((object, index) => {
        const changePro = Array.isArray(transforms)
          ? transforms[index] || transforms[0]
          : transforms;
        const clonePro: Record<string, any> = {};
        Object.keys(changePro).forEach((key) => {
          clonePro[key] = cloneDeep(object.attrs[key]);
        });
        (undoData.transforms as ITransform[]).push(clonePro);
      });
      this.undoData = undoData;
      
      console.log('[UpdateTransform] undoData created:', undoData);
    }

    console.log('[UpdateTransform] calling setAnnotatesTransform');
    editor.dataManager.setAnnotatesTransform(objects, transforms);
    console.log('[UpdateTransform] setAnnotatesTransform completed');
    
    // 记录每个对象更新后的状态
    objects.forEach((obj, index) => {
      console.log(`[UpdateTransform] object ${index} after update:`, {
        uuid: obj.uuid,
        x: obj.x(),
        y: obj.y(),
        attrs: { ...obj.attrs },
        transform: obj.getTransform(),
        absoluteTransform: obj.getAbsoluteTransform(),
        position: obj.position()
      });
    });
  }
  undo(): void {
    if (!this.undoData) return;
    let editor = this.editor;
    let { transforms, objects } = this.undoData;
    if (!Array.isArray(objects)) objects = [objects];

    editor.dataManager.setAnnotatesTransform(objects, transforms);
  }
  canMerge(cmd: CmdBase): boolean {
    let offsetTime = Math.abs(this.updateTime - cmd.updateTime);
    return cmd instanceof UpdateTransform &&
      this.data.objects === cmd.data.objects &&
      !Array.isArray(this.data.transforms) &&
      offsetTime < 500
      ? true
      : false;
  }

  merge(cmd: UpdateTransform) {
    Object.assign(this.data.transforms, cmd.data.transforms);
    this.updateTime = new Date().getTime();
  }
}
