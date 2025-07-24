import CmdBase from '../CmdBase';
import * as THREE from 'three';
import { Polyline3D, Polygon3D, Segmentation3D } from 'pc-render';

export interface IUpdatePointsTransformOption {
    object: Polyline3D | Polygon3D | Segmentation3D;
    pointIndex: number;
    newPosition: THREE.Vector3;
}

export default class UpdatePointsTransform extends CmdBase<
    IUpdatePointsTransformOption,
    { pointIndex: number; oldPosition: THREE.Vector3 }
> {
    redo(): void {
        const { object, pointIndex, newPosition } = this.data;
        const editor = this.editor;

        if (!this.undoData) {
            // Save old position for undo
            const oldPosition = object.points[pointIndex].clone();
            this.undoData = { pointIndex, oldPosition };
        }

        // Update the point position
        const newPoints = [...object.points];
        newPoints[pointIndex].copy(newPosition);

        if (object instanceof Polyline3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        } else if (object instanceof Polygon3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        } else if (object instanceof Segmentation3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        }
    }

    undo(): void {
        if (!this.undoData) return;

        const { object } = this.data;
        const { pointIndex, oldPosition } = this.undoData;
        const editor = this.editor;

        // Restore old position
        const newPoints = [...object.points];
        newPoints[pointIndex].copy(oldPosition);

        if (object instanceof Polyline3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        } else if (object instanceof Polygon3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        } else if (object instanceof Segmentation3D) {
            editor.dataManager.setAnnotatesTransform(object, {
                points: newPoints
            });
        }
    }

    canMerge(cmd: CmdBase): boolean {
        const offsetTime = Math.abs(this.updateTime - cmd.updateTime);
        return cmd instanceof UpdatePointsTransform &&
            this.data.object === cmd.data.object &&
            this.data.pointIndex === cmd.data.pointIndex &&
            offsetTime < 500;
    }

    merge(cmd: UpdatePointsTransform) {
        this.data.newPosition.copy(cmd.data.newPosition);
        this.updateTime = new Date().getTime();
    }
} 