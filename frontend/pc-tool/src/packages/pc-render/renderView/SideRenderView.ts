import * as THREE from 'three';
import Box from '../objects/Box';
import Polyline3D from '../objects/Polyline3D';
import Polygon3D from '../objects/Polygon3D';
import Segmentation3D from '../objects/Segmentation3D';
import Render from './Render';
import PointCloud from '../PointCloud';
import { Event } from '../config';
import PointsMaterial from '../material/PointsMaterial';
import * as _ from 'lodash';

export let axisUpInfo = {
    x: {
        yAxis: { axis: 'z', dir: new THREE.Vector3(0, 0, 1) },
        xAxis: { axis: 'y', dir: new THREE.Vector3(0, 1, 0) },
    },
    '-x': {
        yAxis: { axis: 'z', dir: new THREE.Vector3(0, 0, 1) },
        xAxis: { axis: 'y', dir: new THREE.Vector3(0, -1, 0) },
    },
    z: {
        yAxis: { axis: 'x', dir: new THREE.Vector3(1, 0, 0) },
        xAxis: { axis: 'y', dir: new THREE.Vector3(0, -1, 0) },
    },
    // '-z': {
    //     yAxis: { axis: 'y', dir: new THREE.Vector3(0, 1, 0) },
    //     xAxis: { axis: 'x', dir: new THREE.Vector3(-1, 0, 0) },
    // },
    y: {
        yAxis: { axis: 'z', dir: new THREE.Vector3(0, 0, 1) },
        xAxis: { axis: 'x', dir: new THREE.Vector3(-1, 0, 0) },
    },
    '-y': {
        yAxis: { axis: 'z', dir: new THREE.Vector3(0, 0, 1) },
        xAxis: { axis: 'x', dir: new THREE.Vector3(1, 0, 0) },
    },
};

export type axisType = keyof typeof axisUpInfo;
// export type axisType = 'x' | 'y' | 'z' | '-x' | '-y';

// const defaultActions: string[] = [];
const defaultActions = ['resize-translate', 'point-edit'];

export default class SideRenderView extends Render {
    container: HTMLDivElement;
    pointCloud: PointCloud;
    width: number;
    height: number;
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    cameraHelper?: THREE.CameraHelper;
    object: Box | Polyline3D | Polygon3D | Segmentation3D | null;
    projectRect: THREE.Box3;
    axis: axisType;
    alignAxis: THREE.Vector3;
    paddingPercent: number;
    needFit: boolean = true;
    enableFit: boolean = true;
    // material: THREE.ShaderMaterial;
    selectColor: THREE.Color = new THREE.Color(1, 1, 0); // 改为黄色，表示pending状态
    boxInvertMatrix: THREE.Matrix4 = new THREE.Matrix4();
    zoom: number = 1;
    cameraOffset: THREE.Vector3 = new THREE.Vector3();
    
    constructor(container: HTMLDivElement, pointCloud: PointCloud, config = {} as any) {
        super(config.name || '');

        let { axis = 'z', paddingPercent = 1 } = config;

        this.container = container;
        this.pointCloud = pointCloud;

        this.object = null;
        this.projectRect = new THREE.Box3();
        this.axis = axis;
        this.alignAxis = new THREE.Vector3();
        this.setAxis(axis);

        // this.resizing = false;
        this.paddingPercent = paddingPercent;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.autoClear = false;
        this.renderer.sortObjects = false;
        this.renderer.setPixelRatio(pointCloud.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0, 10);
        this.pointCloud.scene.add(this.camera);
        // this.camera.position.set(-0, 0, -100);
        // this.camera.up.set(0, 1, 0);

        // helper
        let camera = this.camera;
        // camera.lookAt(0, 0, 0);
        const helper = new THREE.CameraHelper(camera);
        // this.pointCloud.scene.add(helper);
        this.cameraHelper = helper;

        // this.renderer.setClearColor(new THREE.Color(0.1, 0.1, 0.1));
        this.setActions(config.actions || defaultActions);
        this.initEvent();
        // this.material = this.createMaterial();
        // this.initDom();

        // @ts-ignore
        window.subView = this;
        
        // 初始化时尝试适配已有的对象
        setTimeout(() => {
            this.fitObject();
            this.render();
        }, 100);
    }

    initEvent() {
        this.pointCloud.addEventListener(Event.SELECT, () => {
            let object = this.pointCloud.selection.find((annotate) => 
                annotate instanceof Box || 
                annotate instanceof Polyline3D || 
                annotate instanceof Polygon3D || 
                annotate instanceof Segmentation3D
            );
            if (object) {
                this.enableFit = true;
                this.zoom = 1;
                this.fitObject(object);
                // 延时再次渲染确保可见
                setTimeout(() => {
                    this.render();
                }, 50);
            } else {
                this.object = null;
                // 当没有选中对象时，也要调用fitObject来显示所有对象
                this.fitObject();
            }
            this.render();
        });

        this.pointCloud.addEventListener(Event.OBJECT_TRANSFORM, (e) => {
            let object = e.data.object;
            if (
                object &&
                object instanceof THREE.Object3D &&
                object === this.object &&
                this.needFit &&
                this.enableFit
            ) {
                this.fitObject();
                this.render();
            }
        });
        
        // 添加对象添加事件监听，确保新添加的对象能够被看到
        this.pointCloud.addEventListener(Event.ADD_OBJECT, () => {
            // 如果没有选中对象，重新适配视图以显示所有对象
            if (!this.object) {
                this.fitObject();
                this.render();
            }
        });
    }

    setAxis(axis: axisType) {
        this.axis = axis;
        this.alignAxis.set(0, 0, 0);

        let axisValue = this.axis.length === 2 ? this.axis[1] : this.axis[0];
        let isInverse = this.axis.length === 2;
        this.alignAxis[axisValue as 'x' | 'y' | 'z'] = isInverse ? -0.5 : 0.5;

        if (this.object) this.fitObject();

        this.render();
    }

    cameraToCanvas(pos: THREE.Vector3) {
        pos.applyMatrix4(this.camera.projectionMatrix);
        pos.x = ((pos.x + 1) / 2) * this.width;
        pos.y = (-(pos.y - 1) / 2) * this.height;
        return pos;
    }

    canvasToCamera(pos: THREE.Vector3) {
        // pos.applyMatrix4(this.camera.projectionMatrix.clone().invert());
        pos.x = (pos.x / this.width) * 2 - 1;
        pos.y = ((-1 * pos.y) / this.height) * 2 + 1;

        pos.x *= this.camera.right - this.camera.left;
        pos.y *= this.camera.top - this.camera.bottom;
        return pos;
    }

    updateProjectRect() {
        let { axis, camera, pointCloud } = this;
        
        camera.updateMatrixWorld();
        
        // 如果有选中的对象，使用选中的对象
        if (this.object) {
            this.object.updateMatrixWorld();

            // Get bounding box based on object type
            let bbox: THREE.Box3;
            if (this.object instanceof Box) {
                if (!this.object.geometry.boundingBox) this.object.geometry.computeBoundingBox();
                bbox = this.object.geometry.boundingBox as any as THREE.Box3;
            } else {
                bbox = new THREE.Box3().setFromObject(this.object);
            }

            // 确保包围盒有效
            if (bbox.isEmpty()) {
                console.warn('Object bounding box is empty, using default bounds');
                bbox.setFromCenterAndSize(this.object.position, new THREE.Vector3(1, 1, 1));
            }

            let minProject = new THREE.Vector3().copy(bbox.min);
            let maxProject = new THREE.Vector3().copy(bbox.max);

            minProject.applyMatrix4(this.object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
            maxProject.applyMatrix4(this.object.matrixWorld).applyMatrix4(camera.matrixWorldInverse);

            let min = new THREE.Vector3();
            let max = new THREE.Vector3();

            let xMin = Math.min(minProject.x, maxProject.x);
            let xMax = Math.max(minProject.x, maxProject.x);
            let yMin = Math.min(minProject.y, maxProject.y);
            let yMax = Math.max(minProject.y, maxProject.y);
            let zMin = Math.min(minProject.z, maxProject.z);
            let zMax = Math.max(minProject.z, maxProject.z);

            min.set(xMin, yMin, zMin);
            max.set(xMax, yMax, zMax);

            this.projectRect.min.copy(min);
            this.projectRect.max.copy(max);
        } else {
            // 如果没有选中对象，计算所有polyline和polygon对象的包围盒
            const allObjects = pointCloud.annotate3D.children.filter(obj => 
                obj instanceof Polyline3D || obj instanceof Polygon3D || obj instanceof Segmentation3D
            );
            
            if (allObjects.length > 0) {
                let combinedBbox = new THREE.Box3();
                combinedBbox.makeEmpty();
                
                allObjects.forEach(obj => {
                    obj.updateMatrixWorld();
                    let objBbox = new THREE.Box3().setFromObject(obj);
                    if (!objBbox.isEmpty()) {
                        combinedBbox.union(objBbox);
                    }
                });
                
                if (!combinedBbox.isEmpty()) {
                    let minProject = new THREE.Vector3().copy(combinedBbox.min);
                    let maxProject = new THREE.Vector3().copy(combinedBbox.max);

                    minProject.applyMatrix4(camera.matrixWorldInverse);
                    maxProject.applyMatrix4(camera.matrixWorldInverse);

                    let min = new THREE.Vector3();
                    let max = new THREE.Vector3();

                    let xMin = Math.min(minProject.x, maxProject.x);
                    let xMax = Math.max(minProject.x, maxProject.x);
                    let yMin = Math.min(minProject.y, maxProject.y);
                    let yMax = Math.max(minProject.y, maxProject.y);
                    let zMin = Math.min(minProject.z, maxProject.z);
                    let zMax = Math.max(minProject.z, maxProject.z);

                    min.set(xMin, yMin, zMin);
                    max.set(xMax, yMax, zMax);

                    this.projectRect.min.copy(min);
                    this.projectRect.max.copy(max);
                    return;
                }
            }
            
            // 如果没有对象或对象为空，设置默认的投影矩形
            this.projectRect.min.set(-10, -10, -10);
            this.projectRect.max.set(10, 10, 10);
        }
    }

    fitObject(object?: THREE.Object3D) {
        if (object) this.object = object as Box | Polyline3D | Polygon3D | Segmentation3D;

        const targetObject = this.object;
        if (!targetObject) return;

        targetObject.updateMatrixWorld();

        let temp = new THREE.Vector3();
        
        // 对于Box对象，使用基于变换矩阵的相机定位（原有逻辑）
        if (targetObject instanceof Box) {
            temp.copy(this.alignAxis);
            temp.applyMatrix4(targetObject.matrixWorld);
            this.camera.position.copy(temp);

            temp.copy(axisUpInfo[this.axis].yAxis.dir)
                .applyMatrix4(targetObject.matrixWorld)
                .sub(new THREE.Vector3().applyMatrix4(targetObject.matrixWorld));
            this.camera.up.copy(temp);

            temp.set(0, 0, 0);
            temp.applyMatrix4(targetObject.matrixWorld);
            this.camera.lookAt(temp);
        } else {
            // 对于Polyline3D、Polygon3D、Segmentation3D对象，使用包围盒定位
            let bbox = new THREE.Box3().setFromObject(targetObject);
            
            // 确保包围盒不为空
            if (bbox.isEmpty()) {
                console.warn('Object bounding box is empty, using fallback bounds');
                // 使用对象的位置作为中心点，创建一个最小的包围盒
                const objPos = targetObject.position;
                bbox.setFromCenterAndSize(objPos, new THREE.Vector3(2, 2, 2));
            }
            
            let center = bbox.getCenter(new THREE.Vector3());
            
            // 确保包围盒有合理的大小
            let bboxSize = bbox.getSize(new THREE.Vector3());
            let minSize = 1; // 最小尺寸
            
            if (bboxSize.x < minSize) {
                bbox.min.x -= minSize / 2;
                bbox.max.x += minSize / 2;
            }
            if (bboxSize.y < minSize) {
                bbox.min.y -= minSize / 2;
                bbox.max.y += minSize / 2;
            }
            if (bboxSize.z < minSize) {
                bbox.min.z -= minSize / 2;
                bbox.max.z += minSize / 2;
            }
            
            center = bbox.getCenter(new THREE.Vector3());
            bboxSize = bbox.getSize(new THREE.Vector3());
            
            // 根据包围盒大小计算相机距离
            let maxDimension = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
            let distance = Math.max(maxDimension * 2.5, 15); // 适当的距离倍数
            
            // 对于很小的对象，使用固定距离
            if (maxDimension < 1) {
                distance = 50;
            }

            // 设置相机位置和方向，根据轴向观看
            switch (this.axis) {
                case 'x':
                    this.camera.position.set(center.x + distance, center.y, center.z);
                    this.camera.up.set(0, 0, 1);
                    break;
                case '-x':
                    this.camera.position.set(center.x - distance, center.y, center.z);
                    this.camera.up.set(0, 0, 1);
                    break;
                case 'y':
                    this.camera.position.set(center.x, center.y + distance, center.z);
                    this.camera.up.set(0, 0, 1);
                    break;
                case '-y':
                    this.camera.position.set(center.x, center.y - distance, center.z);
                    this.camera.up.set(0, 0, 1);
                    break;
                case 'z':
                    this.camera.position.set(center.x, center.y, center.z + distance);
                    this.camera.up.set(0, 1, 0);
                    break;
                default:
                    this.camera.position.set(center.x, center.y, center.z + distance);
                    this.camera.up.set(0, 1, 0);
                    break;
            }
            
            this.camera.lookAt(center);
        }

        this.updateProjectRect();
        this.updateCameraProject();
        
        // 确保渲染被触发
        this.render();
    }

    // 确保对象材质在侧视图中正确显示
    private ensureMaterialVisibility(object: THREE.Object3D) {
        object.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineLoop || child instanceof THREE.Points) {
                if (child.material instanceof THREE.Material) {
                    // 确保材质可见
                    child.material.visible = true;
                    // 启用深度测试以确保正确的深度排序
                    child.material.depthTest = true;
                    child.material.depthWrite = true;
                    
                    // 如果是线材质，确保线宽设置
                    if (child.material instanceof THREE.LineBasicMaterial) {
                        child.material.linewidth = Math.max(child.material.linewidth, 2);
                    }
                    
                    // 如果是点材质，确保点大小
                    if (child.material instanceof THREE.PointsMaterial) {
                        child.material.size = Math.max(child.material.size, 2);
                    }
                    
                    child.material.needsUpdate = true;
                }
            }
        });
    }

    // 渲染单个对象的方法，确保正确的材质设置
    private renderObject(object: THREE.Object3D, highlightColor?: THREE.Color) {
        // 确保材质可见性
        this.ensureMaterialVisibility(object);
        
        // 如果有高亮颜色，临时设置
        if (highlightColor && (object instanceof Polyline3D || object instanceof Polygon3D)) {
            const originalColor = object.color.clone();
            object.setColor(highlightColor);
            this.renderer.render(object, this.camera);
            object.setColor(originalColor);
        } else {
            this.renderer.render(object, this.camera);
        }
    }

    // 适配到所有可见的polyline、polygon和segmentation对象
    fitToAllObjects() {
        const allObjects = this.pointCloud.annotate3D.children.filter(obj => 
            obj instanceof Polyline3D || obj instanceof Polygon3D || obj instanceof Segmentation3D
        );
        
        if (allObjects.length === 0) return;

        let bbox = new THREE.Box3();
        bbox.makeEmpty();
        
        allObjects.forEach(obj => {
            obj.updateMatrixWorld();
            let objBbox = new THREE.Box3().setFromObject(obj);
            if (!objBbox.isEmpty()) {
                bbox.union(objBbox);
            }
        });
        
        if (bbox.isEmpty()) return;
        
        // 为整体包围盒应用最小尺寸
        let bboxSize = bbox.getSize(new THREE.Vector3());
        let minSize = 5; // 对于多个对象，使用稍大的最小尺寸
        
        if (bboxSize.x < minSize) {
            let expand = (minSize - bboxSize.x) / 2;
            bbox.min.x -= expand;
            bbox.max.x += expand;
        }
        if (bboxSize.y < minSize) {
            let expand = (minSize - bboxSize.y) / 2;
            bbox.min.y -= expand;
            bbox.max.y += expand;
        }
        if (bboxSize.z < minSize) {
            let expand = (minSize - bboxSize.z) / 2;
            bbox.min.z -= expand;
            bbox.max.z += expand;
        }
        
        let center = bbox.getCenter(new THREE.Vector3());
        bboxSize = bbox.getSize(new THREE.Vector3());
        let maxDimension = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
        let distance = Math.max(maxDimension * 3, 50);

        // 设置相机位置和方向，根据轴向观看
        switch (this.axis) {
            case 'x':
                this.camera.position.set(center.x + distance, center.y, center.z);
                this.camera.up.set(0, 0, 1);
                break;
            case '-x':
                this.camera.position.set(center.x - distance, center.y, center.z);
                this.camera.up.set(0, 0, 1);
                break;
            case 'y':
                this.camera.position.set(center.x, center.y + distance, center.z);
                this.camera.up.set(0, 0, 1);
                break;
            case '-y':
                this.camera.position.set(center.x, center.y - distance, center.z);
                this.camera.up.set(0, 0, 1);
                break;
            case 'z':
                this.camera.position.set(center.x, center.y, center.z + distance);
                this.camera.up.set(0, 1, 0);
                break;
            default:
                this.camera.position.set(center.x, center.y, center.z + distance);
                this.camera.up.set(0, 1, 0);
                break;
        }
        
        this.camera.lookAt(center);
        
        // 临时清除选中对象以便更新投影
        this.object = null;
        this.updateProjectRect();
        this.updateCameraProject();
        this.render();
    }

    updateCameraProject() {
        let { projectRect } = this;
        let rectWidth = projectRect.max.x - projectRect.min.x;
        let rectHeight = projectRect.max.y - projectRect.min.y;
        let aspect = this.width / this.height;

        // 确保有最小的视图范围，特别是对于polyline和polygon对象
        if (rectWidth < 1) rectWidth = 20;
        if (rectHeight < 1) rectHeight = 20;

        let cameraW, cameraH;
        let padding = Math.min(rectWidth, rectHeight) * this.paddingPercent;
        // 确保有最小的padding
        if (padding < 2) padding = 5;
        
        cameraW = Math.max(rectWidth + padding, (rectHeight + padding) * aspect);
        cameraH = Math.max(rectHeight + padding, (rectWidth + padding) / aspect);

        this.camera.left = (-cameraW / 2) * this.zoom;
        this.camera.right = (cameraW / 2) * this.zoom;
        this.camera.top = (cameraH / 2) * this.zoom;
        this.camera.bottom = (-cameraH / 2) * this.zoom;
        
        // 改进near和far平面设置
        let depth = Math.abs(projectRect.max.z - projectRect.min.z);
        if (depth < 10) depth = 200; // 确保足够的深度范围
        
        // 使用更合理的near/far设置，特别是对于polyline和polygon
        this.camera.near = -depth * 2;
        this.camera.far = depth * 2;
        
        this.camera.updateProjectionMatrix();
        
        this.cameraHelper?.update();
    }

    updateSize() {
        let width = this.container.clientWidth || 10;
        let height = this.container.clientHeight || 10;

        if (width !== this.width || height !== this.height) {
            this.width = width;
            this.height = height;
            this.renderer.setSize(this.width, this.height);
            // this.camera.aspect = this.width / this.height;
            // this.camera.updateProjectionMatrix();
        }
    }

    // render
    renderFrame() {
        // console.log('renderFrame');
        let { groupPoints, scene, selection, annotate3D } = this.pointCloud;

        this.updateSize();
        // if(this.renderTimer) return;
        this.renderer.clear(true, true, true);

        if (groupPoints.children.length === 0) return;

        let hasObject3D = selection.find((e) => e instanceof THREE.Object3D);

        if (selection.length > 0 && hasObject3D) {
            // 对于选中的polyline/polygon对象，进行居中显示并屏蔽其他对象
            if (hasObject3D instanceof Polyline3D || hasObject3D instanceof Polygon3D || hasObject3D instanceof Segmentation3D) {
                // 临时隐藏所有其他对象
                let hiddenObjects: THREE.Object3D[] = [];
                annotate3D.children.forEach((obj) => {
                    if (obj !== hasObject3D && obj.visible) {
                        obj.visible = false;
                        hiddenObjects.push(obj);
                    }
                });
                
                // 自动适配到选中的对象
                if (this.object !== hasObject3D) {
                    this.fitObject(hasObject3D);
                }
                
                // 渲染点云
                if (groupPoints.children.length > 0) {
                    this.renderer.render(groupPoints, this.camera);
                }
                
                // 渲染选中的对象（高亮显示）
                this.renderObject(hasObject3D, this.selectColor);
                
                // 恢复其他对象的可见性
                hiddenObjects.forEach((obj) => {
                    obj.visible = true;
                });
            } 
            // 对于Box对象，保持原有的点云过滤渲染逻辑
            else if (hasObject3D instanceof Box) {
                // render points with box filter
                let groupPoint = groupPoints.children[0] as THREE.Points;
                let box = hasObject3D as Box;
                box.updateMatrixWorld();

                let bbox = box.geometry.boundingBox as THREE.Box3;
                let material = groupPoint.material as PointsMaterial;

                let oldDepthTest = material.depthTest;
                let oldHasFilterBox = material.getUniforms('hasFilterBox');
                let oldType = material.getUniforms('boxInfo').type;

                material.depthTest = false;
                material.setUniforms({
                    hasFilterBox: 1,
                    boxInfo: {
                        type: 0,
                        min: bbox.min,
                        max: bbox.max,
                        color: this.selectColor,
                        matrix: this.boxInvertMatrix.copy(box.matrixWorld).invert(),
                    },
                });
                this.renderer.render(groupPoint, this.camera);

                material.setUniforms({ hasFilterBox: oldHasFilterBox, boxInfo: { type: oldType } });
                material.depthTest = oldDepthTest;
                
                // 渲染选中的box对象
                this.renderer.render(hasObject3D, this.camera);
            } else {
                // 对于其他类型的对象，正常渲染
                if (groupPoints.children.length > 0) {
                    this.renderer.render(groupPoints, this.camera);
                }
                
                // 渲染选中的对象
                selection.forEach((object) => {
                    if (object instanceof THREE.Object3D) {
                        this.renderObject(object, this.selectColor);
                    }
                });
            }
        } else {
            // 没有选中对象时，渲染所有内容
            this.renderer.render(groupPoints, this.camera);
            
            // 渲染所有其他的3D对象
            if (annotate3D && annotate3D.children.length > 0) {
                annotate3D.children.forEach((obj) => {
                    if (obj instanceof Polyline3D || obj instanceof Polygon3D || obj instanceof Segmentation3D) {
                        this.renderObject(obj);
                    }
                });
            }
        }

        // 总是渲染控制点组（如果存在且可见）
        const controlPointsGroup = scene.getObjectByName('PointEditControlPoints');
        if (controlPointsGroup && controlPointsGroup.visible && controlPointsGroup.children.length > 0) {
            // 确保控制点总是在最前面渲染
            controlPointsGroup.renderOrder = 9999;
            controlPointsGroup.children.forEach((child) => {
                child.renderOrder = 9999;
            });
            this.renderer.render(controlPointsGroup, this.camera);
        }

        this.updateProjectRect();
        // console.log('renderFrame');
        // this.updateDom();
    }

    // 强制更新和重新渲染，用于编辑操作后的更新
    forceUpdate() {
        if (this.object) {
            this.fitObject(this.object);
        } else {
            this.fitToAllObjects();
        }
        this.render();
    }

    // 处理选中对象改变的方法
    onSelectionChange(selectedObject?: THREE.Object3D) {
        if (selectedObject && (selectedObject instanceof Polyline3D || selectedObject instanceof Polygon3D || selectedObject instanceof Segmentation3D || selectedObject instanceof Box)) {
            // 如果选中了新的对象，自动适配到该对象
            this.fitObject(selectedObject);
        } else if (!selectedObject) {
            // 如果没有选中对象，适配到所有可见对象
            this.fitToAllObjects();
        }
        this.render();
    }

    // 清理资源
    dispose() {
        this.renderer.dispose();
        this.camera = null as any;
        this.cameraHelper = null as any;
        this.object = null;
    }
}
