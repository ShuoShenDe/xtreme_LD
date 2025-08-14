import * as THREE from 'three';
import { Vector2Of4, AnnotateType } from 'pc-render';

// Type aliases for convenience
type Vector3 = THREE.Vector3;
type Vector2 = THREE.Vector2;

export * from './common/ActionManager/type';
export * from './common/CmdManager/type';
export * from './common/HotkeyManager/type';
export * from './config/type';

export type { IState } from './state';
export * from './uitype';
import { ColorModeEnum } from 'pc-render';
export { ColorModeEnum };
// export type { IMergeCodeData, IMergeStatus } from './common/TrackManager';

export enum AttrType {
    RADIO = 'RADIO',
    MULTI_SELECTION = 'MULTI_SELECTION',
    DROPDOWN = 'DROPDOWN',
    TEXT = 'TEXT',
}
export interface ITrackCount {
    object3D: number;
    // 每个2d视图中相应的统计值，有多个2d视图
    object2D: IInfo2D[];
    count: number;
}
export interface IInfo2D {
    [ObjectType.TYPE_2D_BOX]: number;
    [ObjectType.TYPE_2D_RECT]: number;
}
export interface IBSObject {
    isHolder: boolean;
    needValid?: boolean;
    frame: IFrame;
    // timeStamp
    lastTime: number;
    updateTime: number;
    createdAt?: string;
    createdBy?: any;
    classVersion?: number;
    version?: number;
}
export enum Const {
    Fixed = 'Fixed',
    Dynamic = 'Dynamic',
    Frozen = 'Frozen',
    Standard = 'Standard',
    True_Value = 'True_value',
    Predicted = 'Predicted',
    Copied = 'Copied',
}

export type ResultType = Const.Dynamic | Const.Fixed;
export type ResultStatus = Const.True_Value | Const.Predicted | Const.Copied;

export type LangType = 'zh' | 'en';

export type IHelper2D = 'aux_line' | 'aux_circle';

export enum ObjectType {
    TYPE_3D = '3d',
    TYPE_RECT = 'rect',
    TYPE_BOX2D = 'box2d',
    // new
    TYPE_3D_BOX = '3D_BOX',
    TYPE_2D_RECT = '2D_RECT',
    TYPE_2D_BOX = '2D_BOX',
    // Extended 3D Types
    TYPE_3D_POLYLINE = '3D_POLYLINE',
    TYPE_3D_POLYGON = '3D_POLYGON',
    TYPE_3D_SEGMENTATION = '3D_SEGMENTATION',
}

// export interface IModelRun {
//     id?: string;
//     modelClass?: string;
//     modelRunLabel?: string;
// }
export enum SourceType {
    TASK = 'TASK',
    DATA_FLOW = 'DATA_FLOW',
    MODEL = 'MODEL',
}

export interface IResultSource {
    name: string;
    sourceId: string;
    sourceType: SourceType;
    modelId?: string;
    modelName?: string;
}

export interface IObjectV2 {
    id?: string;
    type?: ObjectType;
    version?: number;
    createdBy?: number;
    createdAt?: string;

    trackId?: string;
    trackName?: string;
    classId?: string;
    className?: string;
    backId?: string;
    frontId?: string;
    classType?: string;
    classValues?: any[];
    // classValues?: Record<string, any>;
    modelConfidence?: number;
    modelClass?: string;
    contour: {
        viewIndex?: number;
        pointN?: number;
        points?: THREE.Vector3[] | THREE.Vector2[];
        center3D?: THREE.Vector3;
        rotation3D?: THREE.Vector3;
        size3D?: THREE.Vector3;
        // Extended 3D Types specific data
        polylineData?: {
            points: THREE.Vector3[];
            closed: boolean;
            length: number;
        };
        polygonData?: {
            points: THREE.Vector3[];
            triangles: number[];
            area: number;
            perimeter: number;
            centroid: THREE.Vector3;
        };
        segmentationData?: {
            points: THREE.Vector3[];
            indices: number[];
            colors: { r: number; g: number; b: number }[];
            brushRadius: number;
            pointCount: number;
            density: number;
        };
        [k: string]: any;
    };
    meta?: {
        [k: string]: any;
    };
    // other
    sourceId?: string;
    sourceType?: string;
}
export interface IUserData {
    id?: string;
    // track id
    trackId?: string;
    trackName?: string;
    isProjection?: boolean;
    // isStandard?: boolean;
    backId?: string;
    // model
    confidence?: number;
    modelRun?: string;
    modelClass?: string;
    modelRunLabel?: string;
    project?: string;
    classType?: string;
    classId?: string;
    attrs?: Record<string, any>;
    // info
    pointN?: number;
    // [key: string]: any;
    version?: number;
    createdBy?: any;
    createdAt?: string;
    sourceId?: string;
    sourceType?: string;
    viewIndex?: number;
}

export interface IObject extends IUserData {
    frontId?: string;
    uuid?: string;
    objType: ObjectType;
    viewIndex: number;

    points: Vector3[] | Vector2[];
    center3D: Vector3;
    rotation3D: Vector3;
    size3D: Vector3;
    [key: string]: any;
}

// export interface IUserInfo {
//     id: string;
// }

export interface IAttr {
    id: string;
    type: AttrType;
    name: string;
    label?: string;
    required: boolean;
    options: { value: any; label: string }[];

    classId: string;
    parent: string;
    parentAttr: string;
    parentValue: any;
    key: string;
    value: any;
    leafFlag?: boolean;
}

export interface IClassType {
    id: string;
    label: string;
    name: string;
    color: string;
    type?: '' | 'constraint' | 'standard';
    size3D?: Vector3;
    sizeMin?: Vector3;
    sizeMax?: Vector3;
    points?: [number, number];
    attrs: IAttr[];
}

export interface IImgViewConfig {
    cameraInternal: { fx: number; fy: number; cx: number; cy: number };
    cameraExternal: number[];
    imgSize: [number, number];
    imgUrl: string;
    imgObject: HTMLImageElement;
    // rowMajor?: boolean;
    name: string;
}

export interface IConfig {
    // prefix
    imgViewPrefix: string;
    singleViewPrefix: string;
    //
    showClassView: boolean;
    showImgView: boolean;
    showSingleImgView: boolean;
    showSideView: boolean;
    showOperationView: boolean;
    showLabel: boolean;
    // showCheckView: boolean;
    // showAnnotation: boolean;
    showAttr: boolean;
    enableShowAttr: boolean;
    // img view info
    filter2DByTrack: boolean;
    singleImgViewIndex: number;
    imgRegionIndex: number;
    // tool info
    activeRect: boolean;
    active3DBox: boolean;
    activePolyline3D: boolean;
    activePolygon3D: boolean;
    activeSegmentation3D: boolean;
    active2DBox: boolean;
    activeAnnotation: boolean;
    activeTranslate: boolean;
    activePointEdit: boolean;
    activeTrack: boolean;
    circleRadius: number;
    activeHelper2d: IHelper2D[];
    // project
    projectPoint4: boolean;
    projectPoint8: boolean;
    projectMap3d: boolean;
    boxMethod: 'AI' | 'STANDARD';
    //
    // type: string;
    pointSize: number;
    heightRange: [number, number];
    groundEnable: boolean;
    // setting
    pointColorMode: ColorModeEnum;
    pointIntensity: [number, number];
    pointGround: number;
    edgeColor: [string, string];
    singleColor: string;
    pointInfo: IPointInfo;
    pointColors: string[];
    pointHeight: [number, number];
    pointVelocity: [number, number];
    brightness: number; // 强度因子
    openIntensity: boolean;
    // renderProjectRect: boolean;
    renderRect: boolean;
    renderBox: boolean;
    renderProjectBox: boolean;
    renderProjectPoint: boolean;
    withoutTaskId: string;
    //
    FILTER_ALL: string;
    aspectRatio: number;
    maxViewHeight: string;
    maxViewWidth: string;
    limitRect2Image: boolean;

    autoLoad: boolean;
    backgroundColor: string;
}

export interface IAnnotationInfo {
    id: string;
    msg: string;
    position?: Vector3;
    objectId?: string;
}

export interface IPointInfo {
    count: number;
    vCount: number;
    min: Vector3;
    max: Vector3;
    hasIntensity: boolean;
    hasVelocity: boolean;
    hasRGB: boolean;
    intensityRange: Vector2;
    vRange: Vector2;
}

export enum StatusType {
    Default = '',
    Create = 'Create',
    Pick = 'Pick',
    Loading = 'Loading',
    Modal = 'Modal',
    Confirm = 'Confirm',
    // play
    Play = 'Play',
}

export interface IAnnotationTag {
    label: string;
    value: string;
    id: string;
}

export interface IModel {
    id: string;
    name: string;
    version: string;
    classes: { value: string; label: string }[];
    code: string;
}

export type LoadStatus = '' | 'loading' | 'complete' | 'error';

export interface IModelResult {
    recordId: string;
    id: string;
    version: string;
    state?: LoadStatus;
    config?: Record<string, any>;
}

export interface IClassification {
    id: string;
    name: string;
    label?: string;
    attrs: IClassificationAttr[];
}

export interface IClassificationAttr {
    classificationId: string;
    parent: string;
    parentAttr: string;
    parentValue: any;
    key: string;
    id: string;
    type: AttrType;
    name: string;
    label?: string;
    required: boolean;
    options: { value: any; label: string }[];
    value: any;
    leafFlag?: boolean;
}

export interface IFrame {
    datasetId?: string;
    // id
    id: string;
    // uuid
    // id: string;
    teamId?: string;
    sceneId?: string;
    pointsUrl: string;
    queryTime: string;
    loadState: LoadStatus;
    // model
    model?: IModelResult;
    // classification values
    classifications: IClassification[];
    // save
    needSave: boolean;
    resultExist?: boolean;
    // [k: string]: any;
    // flow
    dataStatus: 'INVALID' | 'VALID';
    annotationStatus: 'ANNOTATED' | 'NOT_ANNOTATED' | 'INVALID';
    sources?: IResultSource[];
    skipped: boolean;
}

export interface IFilter {
    value?: string;
    label: string;
    type: '' | 'project' | 'model';
    options?: { value: string; label: string }[];
}

export interface IModelClass {
    label: string;
    value: string;
    selected: boolean;
}

export interface IModelConfig {
    confidence: number[];
    predict: boolean;
    classes: { [key: string]: IModelClass[] };
    model: string;
    loading: boolean;
    start: number;
    duration: number;
}

export interface IAnnotationItem {
    id: string;
    msg: string;
    type: 'position' | 'object';
    data: any;
    step: {
        id: string;
        name: string;
    };
    comments: number;
    dataId: string;
    itemIndex: number;
    customValue: any;
    time: number;
    isResolve: boolean;
    tags: { id: string; name: string; key: string }[];
}

export type PointAttr = 'position' | 'color' | string;

export interface IDataResource {
    viewConfig: IImgViewConfig[];
    time: number;
    // position
    pointsUrl: string;
    pointsData: Record<PointAttr, number[]>;
    intensityRange?: [number, number];
    ground?: number;
    name?: string;
}

export interface IResourceLoader {
    data: IFrame;
    getResource: () => Promise<IDataResource>;
    onProgress?: (percent: number) => void;
}

export interface IFileConfig {
    dirName: string;
    name: string;
    url: string;
}

export interface ICheckStatus {
    frameIndex: number;
    hasObject: boolean;
    invisibleFlag: boolean;
    loadState: LoadStatus;
}

export interface ICheckConfig {
    type: '3d' | '2d';
    axis: 'z' | '-x' | '-y';
    trackId: string;
    imageIndex: number;
    imageMaxIndex: number;
    showImageMax: boolean;
    showAttr: boolean;
    showAttrType: 'single' | 'multi';
    status3D: ICheckStatus[];
    status2D: ICheckStatus[];
    subViewWidth: number;
    subViewHeight: number;
    subViewScale: number;
}
