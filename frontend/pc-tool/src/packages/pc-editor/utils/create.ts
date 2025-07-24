import * as THREE from 'three';
import Editor from '../Editor';
import { IUserData, ObjectType } from '../type';
import { nanoid } from 'nanoid';
import { Box, Rect, Box2D, Vector2Of4, Polyline3D, Polygon3D, Segmentation3D } from 'pc-render';

export function setIdInfo(editor: Editor, userData: IUserData) {
    if (!userData.id) userData.id = THREE.MathUtils.generateUUID();
    if (!userData.trackId) {
        userData.trackId = nanoid(16);
    }
    if (!userData.trackName) {
        userData.trackName = editor.getId();
    }
}

export function createAnnotate3D(
    editor: Editor,
    position: THREE.Vector3,
    scale: THREE.Vector3,
    rotation: THREE.Euler,
    userData: IUserData = {},
) {
    let object = new Box();
    object.position.copy(position);
    object.scale.copy(scale);
    object.rotation.copy(rotation);
    object.userData = userData;
    object.matrixAutoUpdate = true;
    object.updateMatrixWorld();
    // object.dashed = !!userData.invisibleFlag;
    if (userData.id) {
        object.uuid = userData.id;
    }

    // setIdInfo(editor, userData);
    return object;
}

export function createAnnotateRect(
    editor: Editor,
    center: THREE.Vector2,
    size: THREE.Vector2,
    userData: IUserData = {},
) {
    let object = new Rect(center, size);
    object.userData = userData;
    // object.dashed = !!userData.invisibleFlag;
    // setIdInfo(editor, userData);

    return object;
}

export function createAnnotateBox2D(
    editor: Editor,
    positions1: Vector2Of4,
    positions2: Vector2Of4,
    userData: IUserData = {},
) {
    let object = new Box2D(positions1, positions2);
    object.userData = userData;
    // object.dashed = !!userData.invisibleFlag;
    // setIdInfo(editor, userData);

    return object;
}

// Extended 3D annotation creation functions
export function createAnnotate3DPolyline(
    editor: Editor,
    points: THREE.Vector3[] = [],
    userData: IUserData = {},
) {
    let object = new Polyline3D(points);
    object.userData = userData;
    object.matrixAutoUpdate = true;
    object.updateMatrixWorld();
    
    if (userData.id) {
        object.uuid = userData.id;
    }

    return object;
}

export function createAnnotate3DPolygon(
    editor: Editor,
    points: THREE.Vector3[] = [],
    userData: IUserData = {},
) {
    let object = new Polygon3D(points);
    object.userData = userData;
    object.matrixAutoUpdate = true;
    object.updateMatrixWorld();
    
    if (userData.id) {
        object.uuid = userData.id;
    }

    return object;
}

export function createAnnotate3DSegmentation(
    editor: Editor,
    points: THREE.Vector3[] = [],
    indices: number[] = [],
    userData: IUserData = {},
) {
    let object = new Segmentation3D(points, indices);
    object.userData = userData;
    object.matrixAutoUpdate = true;
    object.updateMatrixWorld();
    
    if (userData.id) {
        object.uuid = userData.id;
    }

    return object;
}

// Universal create function based on object type
export function createAnnotateByType(
    editor: Editor,
    objectType: ObjectType,
    data: any = {},
    userData: IUserData = {},
) {
    switch (objectType) {
        case ObjectType.TYPE_3D_BOX:
            return createAnnotate3D(
                editor,
                data.position || new THREE.Vector3(),
                data.scale || new THREE.Vector3(1, 1, 1),
                data.rotation || new THREE.Euler(),
                userData
            );
        case ObjectType.TYPE_3D_POLYLINE:
            return createAnnotate3DPolyline(editor, data.points || [], userData);
        case ObjectType.TYPE_3D_POLYGON:
            return createAnnotate3DPolygon(editor, data.points || [], userData);
        case ObjectType.TYPE_3D_SEGMENTATION:
            return createAnnotate3DSegmentation(editor, data.points || [], data.indices || [], userData);
        case ObjectType.TYPE_2D_RECT:
            return createAnnotateRect(
                editor,
                data.center || new THREE.Vector2(),
                data.size || new THREE.Vector2(1, 1),
                userData
            );
        case ObjectType.TYPE_2D_BOX:
            return createAnnotateBox2D(
                editor,
                data.positions1 || [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
                data.positions2 || [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
                userData
            );
        default:
            throw new Error(`Unsupported object type: ${objectType}`);
    }
}
