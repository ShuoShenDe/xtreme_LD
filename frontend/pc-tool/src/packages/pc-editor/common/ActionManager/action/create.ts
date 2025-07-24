import {
    MainRenderView,
    CreateAction,
    Image2DRenderView,
    Box,
    Points,
    Event,
    utils,
    ITransform,
    Polyline3D,
    Polygon3D,
    Segmentation3D,
} from 'pc-render';
import * as THREE from 'three';
import * as _ from 'lodash';
import Editor from '../../../Editor';
import { define } from '../define';
import { getTransformFrom3Point, getMiniBox, getMiniBox1 } from '../../../utils';
import { IAnnotationInfo, StatusType, IUserData, Const, IObject } from '../../../type';
import EditorEvent from '../../../config/event';

function showLoading(position: THREE.Vector3, view: MainRenderView) {
    const wrap = document.createElement('div');
    wrap.className = 'loading-3d-wrap';
    const iconDiv = document.createElement('div');
    const icon = document.createElement('i');
    const msg = document.createElement('div');
    msg.className = 'loading-msg';
    icon.className = 'iconfont icon-loading loading create-status';
    iconDiv.appendChild(msg);
    iconDiv.appendChild(icon);
    wrap.appendChild(iconDiv);
    const update = () => {
        const pos = new THREE.Vector3().copy(position);
        const camera = view.camera;
        const matrix = utils.get(THREE.Matrix4, 1);
        matrix.copy(camera.projectionMatrix);
        matrix.multiply(camera.matrixWorldInverse);
        pos.applyMatrix4(matrix);
        const invisible = Math.abs(pos.z) > 1 || pos.x < -1 || pos.x > 1 || pos.y > 1 || pos.y < -1;
        iconDiv.style.display = invisible ? 'none' : 'block';
        pos.x = ((pos.x + 1) / 2) * view.width;
        pos.y = (-(pos.y - 1) / 2) * view.height;
        iconDiv.style.transform = `translate(${pos.x - 8}px, ${pos.y + 8}px) translateY(-100%)`;
    };
    const init = () => {
        view.container.appendChild(wrap);
        view.addEventListener(Event.RENDER_AFTER, update);
        update();
    };

    const clear = () => {
        view.removeEventListener(Event.RENDER_AFTER, update);
        view.container.removeChild(wrap);
    };
    const updateMsg = (message: string) => {
        msg.innerText = message;
    };
    init();
    return { clear, updateMsg };
}

export const createObjectWith3 = define({
    valid(editor: Editor) {
        let state = editor.state;
        return !state.config.showSingleImgView && state.modeConfig.actions['createObjectWith3'];
    },
    end(editor: Editor) {
        let action = this.action as CreateAction;
        action.end();
        editor.state.status = StatusType.Default;
    },
    execute(editor: Editor) {
        let view = editor.pc.renderViews.find((e) => e instanceof MainRenderView) as MainRenderView;
        if (view) {
            let action = view.getAction('create-obj') as CreateAction;
            this.action = action;

            editor.state.status = StatusType.Create;
            const config = editor.state.config;
            const isAIbox = config.boxMethod === 'AI';
            let points = editor.pc.groupPoints.children[0] as Points;
            let positions = points.geometry.attributes['position'] as THREE.BufferAttribute;
            return new Promise<any>((resolve) => {
                action.start(
                    {
                        type: isAIbox ? 'box' : 'points-3',
                        startClick: !isAIbox,
                        startMouseDown: isAIbox,
                    },
                    async (data: THREE.Vector2[]) => {
                        let transform: Required<
                            Pick<ITransform, 'position' | 'rotation' | 'scale'>
                        >;
                        if (isAIbox) {
                            const { clear, updateMsg } = showLoading(
                                view.canvasToWorld(
                                    new THREE.Vector2(
                                        (data[1].x + data[0].x) / 2,
                                        (data[1].y + data[0].y) / 2,
                                    ),
                                ),
                                view,
                            );
                            const createTask = editor.taskManager.createTask;
                            const projectPos = data.map((e) => view.getProjectPos(e));
                            const worldPos = data.map((e) => view.canvasToWorld(e));
                            const headAngle = Math.atan2(
                                worldPos[1].y - worldPos[0].y,
                                worldPos[1].x - worldPos[0].x,
                            );
                            const matrix = new THREE.Matrix4();
                            matrix.copy(view.camera.projectionMatrix);
                            matrix.multiply(view.camera.matrixWorldInverse);
                            const taskData = await createTask
                                .create(
                                    positions,
                                    projectPos,
                                    matrix,
                                    headAngle,
                                    true,
                                    config.heightRange,
                                )
                                .catch(() => {
                                    return { data: undefined, frameId: undefined };
                                });
                            const result = taskData.data as Required<ITransform>;
                            const frameId = taskData.frameId;
                            if (result && frameId == editor.getCurrentFrame().id) {
                                transform = {
                                    position: new THREE.Vector3().copy(result.position),
                                    scale: new THREE.Vector3().copy(result.scale),
                                    rotation: new THREE.Euler().copy(result.rotation),
                                };
                            } else {
                                data.splice(1, -1, new THREE.Vector2(data[0].x, data[1].y));
                                const _projectPos = data.map((e) => view.canvasToWorld(e));
                                transform = getTransformFrom3Point(_projectPos);
                            }
                            clear();
                        } else {
                            let projectPos = data.map((e) => view.canvasToWorld(e));
                            transform = getTransformFrom3Point(projectPos);
                            transform.scale.z = 2;
                            transform.position.z = editor.pc.ground.plane.constant + 1;

                            getMiniBox1(transform, positions, editor.state.config.heightRange);
                        }

                        transform.scale.x = Math.max(0.2, transform.scale.x);
                        transform.scale.y = Math.max(0.2, transform.scale.y);
                        transform.scale.z = Math.max(0.2, transform.scale.z);
                        // debugger;

                        let userData = {
                            resultStatus: Const.True_Value,
                            resultType: Const.Dynamic,
                        } as IUserData;

                        const classConfig = editor.getClassType(editor.state.currentClass);

                        if (classConfig) {
                            userData.classType = classConfig.name;
                            userData.classId = classConfig.id;
                        }
                        if (editor.currentTrack) {
                            const object3d = editor.pc.getAnnotate3D().find((e) => {
                                return (
                                    e instanceof Box &&
                                    !(e as any).isHolder &&
                                    e.userData.trackId == editor.currentTrack
                                );
                            });
                            if (!object3d) {
                                userData.trackId = editor.currentTrack as string;
                                userData.trackName = editor.currentTrackName;
                            }
                        }

                        let box = editor.createAnnotate3D(
                            transform.position,
                            transform.scale,
                            transform.rotation,
                            userData,
                        );

                        let trackObject: Partial<IObject> = {
                            trackId: userData.trackId,
                            trackName: userData.trackName,
                            classType: userData.classType,
                            classId: userData.classId,
                        };

                        editor.state.config.showClassView = true;

                        editor.cmdManager.withGroup(() => {
                            editor.cmdManager.execute('add-object', box);
                            if (editor.state.isSeriesFrame) {
                                editor.cmdManager.execute('add-track', trackObject);
                            }

                            editor.cmdManager.execute('select-object', box);
                        });

                        resolve(box);
                    },
                );
            });
        }
    },
});

export const createAnnotation = define({
    valid(editor: Editor) {
        let state = editor.state;
        return !state.config.showSingleImgView && state.modeConfig.actions['createAnnotation'];
    },
    end(editor: Editor) {
        let action = this.action as CreateAction;
        if (action) action.end();

        editor.showModal(false);
        editor.state.status = StatusType.Default;
    },
    execute(editor: Editor, args?: { object: Box }) {
        let view = editor.pc.renderViews.find((e) => e instanceof MainRenderView) as MainRenderView;
        let state = editor.state;

        editor.state.status = StatusType.Create;

        if (view) {
            return new Promise<any>(async (resolve) => {
                if (args && args.object) {
                    this.action = null;
                    await create(args.object);
                    resolve(null);
                } else {
                    let action = view.getAction('create-obj') as CreateAction;
                    this.action = action;

                    action.start(
                        { type: 'points-1', trackLine: false },
                        async (data: THREE.Vector2[]) => {
                            let obj = view.getObjectByCanvas(data[0]);
                            if (obj) {
                                await create(obj);
                            } else {
                                await create(view.canvasToWorld(data[0]));
                            }
                            resolve(null);
                        },
                    );
                }
            });
        }

        async function create(data: THREE.Object3D | THREE.Vector3) {
            let result;
            let isObject = data instanceof THREE.Object3D;
            let object = data as THREE.Object3D;
            let custom = isObject
                ? { id: object.userData.id, uuid: object.uuid }
                : (data as THREE.Vector3).clone();

            try {
                result = await editor.showModal('annotation', {
                    title: '',
                    data: { type: isObject ? 'object' : 'position', custom },
                });
            } catch (e) {
                // User cancelled
            }
        }
    },
});

// 3D Polyline creation action
export const createPolyline3D = define({
    valid(editor: Editor) {
        let state = editor.state;
        let isValid = !state.config.showSingleImgView && state.modeConfig.actions['createPolyline3D'];
        return isValid;
    },
    end(editor: Editor) {
        let action = this.action as CreateAction;
        action.end();
        editor.state.status = StatusType.Default;
    },
    execute(editor: Editor) {
        let view = editor.pc.renderViews.find((e) => e instanceof MainRenderView) as MainRenderView;
        if (view) {
            let action = view.getAction('create-obj') as CreateAction;
            this.action = action;

            editor.state.status = StatusType.Create;
            let points: THREE.Vector3[] = [];

            return new Promise<any>((resolve) => {
                action.start(
                    { type: 'points-multi', trackLine: true },
                    async (data: THREE.Vector2[]) => {
                        // Convert canvas points to world points
                        points = data.map((canvasPoint) => view.canvasToWorld(canvasPoint));

                        let userData = {
                            resultStatus: Const.True_Value,
                            resultType: Const.Dynamic,
                        } as IUserData;

                        const classConfig = editor.getClassType(editor.state.currentClass);
                        if (classConfig) {
                            userData.classType = classConfig.name;
                            userData.classId = classConfig.id;
                        }

                        if (editor.currentTrack) {
                            userData.trackId = editor.currentTrack as string;
                            userData.trackName = editor.currentTrackName;
                        }

                        let polyline = editor.createAnnotate3DPolyline(points, userData);

                        let trackObject: Partial<IObject> = {
                            trackId: userData.trackId,
                            trackName: userData.trackName,
                            classType: userData.classType,
                            classId: userData.classId,
                        };

                        editor.state.config.showClassView = true;

                        editor.cmdManager.withGroup(() => {
                            editor.cmdManager.execute('add-object', polyline);
                            if (editor.state.isSeriesFrame) {
                                editor.cmdManager.execute('add-track', trackObject);
                            }
                            editor.cmdManager.execute('select-object', polyline);
                        });

                        resolve(polyline);
                    },
                );
            });
        }
    },
});

// 3D Polygon creation action
export const createPolygon3D = define({
    valid(editor: Editor) {
        let state = editor.state;
        return !state.config.showSingleImgView && state.modeConfig.actions['createPolygon3D'];
    },
    end(editor: Editor) {
        let action = this.action as CreateAction;
        action.end();
        editor.state.status = StatusType.Default;
    },
    execute(editor: Editor) {
        let view = editor.pc.renderViews.find((e) => e instanceof MainRenderView) as MainRenderView;
        if (view) {
            let action = view.getAction('create-obj') as CreateAction;
            this.action = action;

            editor.state.status = StatusType.Create;
            let points: THREE.Vector3[] = [];

            return new Promise<any>((resolve) => {
                action.start(
                    { type: 'points-multi', trackLine: true },
                    async (data: THREE.Vector2[]) => {
                        // Convert canvas points to world points and ensure closed polygon
                        points = data.map((canvasPoint) => view.canvasToWorld(canvasPoint));

                        let userData = {
                            resultStatus: Const.True_Value,
                            resultType: Const.Dynamic,
                        } as IUserData;

                        const classConfig = editor.getClassType(editor.state.currentClass);
                        if (classConfig) {
                            userData.classType = classConfig.name;
                            userData.classId = classConfig.id;
                        }

                        if (editor.currentTrack) {
                            userData.trackId = editor.currentTrack as string;
                            userData.trackName = editor.currentTrackName;
                        }

                        let polygon = editor.createAnnotate3DPolygon(points, userData);

                        let trackObject: Partial<IObject> = {
                            trackId: userData.trackId,
                            trackName: userData.trackName,
                            classType: userData.classType,
                            classId: userData.classId,
                        };

                        editor.state.config.showClassView = true;

                        editor.cmdManager.withGroup(() => {
                            editor.cmdManager.execute('add-object', polygon);
                            if (editor.state.isSeriesFrame) {
                                editor.cmdManager.execute('add-track', trackObject);
                            }
                            editor.cmdManager.execute('select-object', polygon);
                        });

                        resolve(polygon);
                    },
                );
            });
        }
    },
});

// 3D Segmentation creation action (polygon-based point selection)
export const createSegmentation3D = define({
    valid(editor: Editor) {
        let state = editor.state;
        return !state.config.showSingleImgView && state.modeConfig.actions['createSegmentation3D'];
    },
    end(editor: Editor) {
        let action = this.action as CreateAction;
        action.end();
        editor.state.status = StatusType.Default;
    },
    execute(editor: Editor) {
        let view = editor.pc.renderViews.find((e) => e instanceof MainRenderView) as MainRenderView;
        if (view) {
            let action = view.getAction('create-obj') as CreateAction;
            this.action = action;

            editor.state.status = StatusType.Create;

            return new Promise<any>((resolve) => {
                // 使用 polygon 模式而不是 brush 模式
                action.start(
                    { type: 'points-multi', trackLine: true },
                    async (data: THREE.Vector2[]) => {
                        // Get point cloud for segmentation
                        let pointsObject = editor.pc.groupPoints.children[0] as Points;
                        if (!pointsObject) {
                            console.warn('No point cloud available for segmentation');
                            resolve(null);
                            return;
                        }

                        // Convert canvas points to screen polygon
                        let polygonScreenPoints = data;
                        
                        // Select points inside the polygon in current view plane
                        let selectedPoints: THREE.Vector3[] = [];
                        let selectedIndices: number[] = [];
                        
                        const geometry = pointsObject.geometry;
                        const positions = geometry.attributes.position;
                        const camera = view.camera;
                        const renderer = view.renderer;
                        
                        // Get viewport size
                        const canvas = renderer.domElement;
                        const rect = canvas.getBoundingClientRect();
                        
                        for (let i = 0; i < positions.count; i++) {
                            // Get world position of point
                            const worldPos = new THREE.Vector3(
                                positions.getX(i),
                                positions.getY(i),
                                positions.getZ(i)
                            );
                            
                            // Project to screen space
                            const screenPos = worldPos.clone().project(camera);
                            
                            // Convert to canvas coordinates
                            const canvasX = (screenPos.x * 0.5 + 0.5) * canvas.clientWidth;
                            const canvasY = ((-screenPos.y) * 0.5 + 0.5) * canvas.clientHeight;
                            
                            // Check if point is inside polygon
                            if (isPointInPolygon({ x: canvasX, y: canvasY }, polygonScreenPoints)) {
                                selectedPoints.push(worldPos.clone());
                                selectedIndices.push(i);
                            }
                        }
                        
                        let userData = {
                            resultStatus: Const.True_Value,
                            resultType: Const.Dynamic,
                        } as IUserData;

                        const classConfig = editor.getClassType(editor.state.currentClass);
                        if (classConfig) {
                            userData.classType = classConfig.name;
                            userData.classId = classConfig.id;
                        }

                        if (editor.currentTrack) {
                            userData.trackId = editor.currentTrack as string;
                            userData.trackName = editor.currentTrackName;
                        }

                        // Create segmentation with selected points
                        let segmentation = editor.createAnnotate3DSegmentation(selectedPoints, selectedIndices, userData);
                        segmentation.sourcePointCloud = pointsObject;

                        let trackObject: Partial<IObject> = {
                            trackId: userData.trackId,
                            trackName: userData.trackName,
                            classType: userData.classType,
                            classId: userData.classId,
                        };

                        editor.state.config.showClassView = true;

                        editor.cmdManager.withGroup(() => {
                            editor.cmdManager.execute('add-object', segmentation);
                            if (editor.state.isSeriesFrame) {
                                editor.cmdManager.execute('add-track', trackObject);
                            }
                            editor.cmdManager.execute('select-object', segmentation);
                        });

                        resolve(segmentation);
                    },
                );
            });
        }
    },
    action: null as CreateAction | null,
});

// 点在多边形内判断的辅助函数
function isPointInPolygon(point: { x: number; y: number }, polygon: THREE.Vector2[]): boolean {
    let inside = false;
    const x = point.x, y = point.y;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
}
