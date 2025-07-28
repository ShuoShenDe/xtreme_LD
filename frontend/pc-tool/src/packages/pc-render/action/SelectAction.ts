import * as THREE from 'three';
import MainRenderView from '../renderView/MainRenderView';
import Image2DRenderView from '../renderView/Image2DRenderView';
import { Rect, Box2D, Object2D, AnnotateObject } from '../objects';
import { Event } from '../config';
import Action from './Action';
import { get } from '../utils/tempVar';
import * as _ from 'lodash';
import { SELECTION_CONFIG } from '../utils/raycast';

export default class SelectAction extends Action {
    static actionName: string = 'select';
    renderView: MainRenderView | Image2DRenderView;

    private _time: number = 0;
    private _mouseDown: boolean = false;
    private _clickValid: boolean = false;
    private _mouseDownPos: THREE.Vector2 = new THREE.Vector2();
    private raycaster: THREE.Raycaster = new THREE.Raycaster();

    constructor(renderView: MainRenderView | Image2DRenderView) {
        super();
        this.renderView = renderView;
        this.enabled = true;

        // Set raycaster parameters for better selection
        this.raycaster.params.Line = { threshold: SELECTION_CONFIG.THRESHOLDS.LINE };
        this.raycaster.params.Points = { threshold: SELECTION_CONFIG.THRESHOLDS.POINTS };

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        // this.onDBLClick = this.onDBLClick.bind(this);
        this.onClick = _.debounce(this.onClick.bind(this), 500, { leading: true, trailing: false });
    }
    init() {
        let dom = this.renderView.container;
        this._mouseDown = false;
        this._mouseDownPos = new THREE.Vector2();

        dom.addEventListener('mousedown', this.onMouseDown);
        dom.addEventListener('mouseup', this.onMouseUp);
        // dom.addEventListener('dblclick', this.onDBLClick);
        dom.addEventListener('click', this.onClick);
    }

    onDBLClick(event: MouseEvent) {
        let object = this.getObject(event);
        if (object) {
            event.stopPropagation();

            this.renderView.pointCloud.dispatchEvent({
                type: Event.OBJECT_DBLCLICK,
                data: object,
            });
        }
        // console.log('onDBLClick');
    }
    onSelect() {}
    onClick(event: MouseEvent) {
        if (!this.enabled || !this._clickValid) return;

        // console.log('onClick');
        let object = this.getObject(event);
        if (object) {
            this.selectObject(object as any);
            this.onSelect();
        }
    }

    onMouseDown(event: MouseEvent) {
        if (!this.enabled) return;

        this._mouseDown = true;
        this._mouseDownPos.set(event.offsetX, event.offsetY);
    }
    onMouseUp(event: MouseEvent) {
        if (!this.enabled) return;

        let tempVec2 = new THREE.Vector2();
        let distance = tempVec2.set(event.offsetX, event.offsetY).distanceTo(this._mouseDownPos);
        this._clickValid = this._mouseDown && distance < 10;
        this._mouseDown = false;
    }

    getObject(event: MouseEvent) {
        let object;
        if (this.renderView instanceof MainRenderView) {
            object = this.checkMainView(event);
        } else {
            object = this.checkImage2DView(event);
        }

        return object;
    }

    checkMainView(event: MouseEvent) {
        let pos = get(THREE.Vector2, 0);
        this.getProjectPos(event, pos);
        
        // 确保相机矩阵是最新的
        this.renderView.camera.updateMatrix();
        this.renderView.camera.updateMatrixWorld();
        
        let annotate3D = this.renderView.pointCloud.getAnnotate3D();
        
        // 同时更新所有对象的世界矩阵
        annotate3D.forEach(obj => {
            if (obj && typeof (obj as any).updateMatrixWorld === 'function') {
                (obj as any).updateMatrixWorld();
            }
        });
        
        // 确保raycaster有camera参数，用于adaptive threshold计算
        (this.raycaster as any).camera = this.renderView.camera;
        
        // 先检查是否有控制点编辑Action在处理事件
        const pointEditAction = this.renderView.getAction('point-edit');
        if (pointEditAction && (pointEditAction as any).areControlPointsInteractive && (pointEditAction as any).areControlPointsInteractive()) {
            // 如果有活动的控制点，先检查控制点
            const controlPointIntersect = (pointEditAction as any).getControlPointIntersection && (pointEditAction as any).getControlPointIntersection(event);
            if (controlPointIntersect) {
                // 如果点击的是控制点，不进行对象选择
                return null;
            }
        }
        
        // 使用基于屏幕空间投影的精确选择方法
        const selectedObject = this.selectObjectByScreenProjection(event, annotate3D);
        if (selectedObject) {
            return selectedObject;
        }
        
        // 如果屏幕投影方法没有找到对象，回退到传统射线投射方法
        return this.fallbackRaycastSelection(pos, annotate3D);
    }
    
    /**
     * 基于屏幕空间投影的精确选择方法
     */
    private selectObjectByScreenProjection(event: MouseEvent, annotate3D: any[]): THREE.Object3D | null {
        const camera = this.renderView.camera;
        const mousePoint = new THREE.Vector2(event.offsetX, event.offsetY);
        
        // 选择候选对象和它们的屏幕空间距离
        const candidates: Array<{
            object: THREE.Object3D;
            distance: number;
            priority: number;
        }> = [];
        
        for (const obj of annotate3D) {
            if (!obj.visible || !obj.parent || !obj.parent.visible) continue;
            
            const result = this.checkObjectScreenProjection(obj, mousePoint, camera);
            if (result) {
                candidates.push(result);
            }
        }
        
        if (candidates.length === 0) return null;
        
        // 按优先级和距离排序
        candidates.sort((a, b) => {
            // 首先按优先级排序（数值越大优先级越高）
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // 优先级相同时按距离排序
            return a.distance - b.distance;
        });
        
        const selected = candidates[0];
        
        // 调试信息
        if (window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development') {
            console.log('Screen projection selection:', {
                mousePos: mousePoint,
                selectedObject: selected.object.constructor.name,
                distance: selected.distance,
                priority: selected.priority,
                totalCandidates: candidates.length,
                allCandidates: candidates.map(c => ({
                    type: c.object.constructor.name,
                    distance: c.distance,
                    priority: c.priority
                }))
            });
        }
        
        return selected.object;
    }
    
    /**
     * 检查单个对象的屏幕投影选择
     */
    private checkObjectScreenProjection(obj: THREE.Object3D, mousePoint: THREE.Vector2, camera: THREE.Camera): {
        object: THREE.Object3D;
        distance: number;
        priority: number;
    } | null {
        const objType = obj.constructor.name;
        
        switch (objType) {
            case 'Polygon3D':
                return this.checkPolygonScreenProjection(obj as any, mousePoint, camera);
            case 'Box':
                return this.checkBoxScreenProjection(obj as any, mousePoint, camera);
            case 'Polyline3D':
                return this.checkPolylineScreenProjection(obj as any, mousePoint, camera);
            case 'Segmentation3D':
                return this.checkSegmentationScreenProjection(obj as any, mousePoint, camera);
            default:
                return null;
        }
    }
    
    /**
     * 检查Polygon3D的屏幕投影选择
     */
    private checkPolygonScreenProjection(polygon: any, mousePoint: THREE.Vector2, camera: THREE.Camera): {
        object: THREE.Object3D;
        distance: number;
        priority: number;
    } | null {
        if (!polygon.points || polygon.points.length < 3) return null;
        
        try {
            // 确保世界矩阵是最新的
            polygon.updateMatrixWorld(true);
            
            // 将多边形顶点投影到屏幕空间
            const screenPoints: THREE.Vector2[] = [];
            let totalDepth = 0;
            let validPoints = 0;
            
            for (const point of polygon.points) {
                const worldPoint = point.clone().applyMatrix4(polygon.matrixWorld);
                const screenPoint = worldPoint.clone().project(camera);
                
                // 检查投影是否有效（在视锥内）
                if (Math.abs(screenPoint.x) <= 1 && Math.abs(screenPoint.y) <= 1 && screenPoint.z > 0 && screenPoint.z < 1) {
                    // 转换到屏幕坐标
                    screenPoint.x = (screenPoint.x + 1) * this.renderView.width / 2;
                    screenPoint.y = (-screenPoint.y + 1) * this.renderView.height / 2;
                    
                    screenPoints.push(new THREE.Vector2(screenPoint.x, screenPoint.y));
                    totalDepth += screenPoint.z;
                    validPoints++;
                }
            }
            
            if (validPoints < 3) return null; // 需要至少3个有效点形成多边形
            
            // 检查鼠标点是否在多边形内
            if (this.isPointInPolygon2D(mousePoint, screenPoints)) {
                const avgDepth = totalDepth / validPoints;
                const distance = Math.abs(avgDepth); // 使用平均深度作为距离
                
                return {
                    object: polygon,
                    distance: distance,
                    priority: 4 // Polygon优先级最高
                };
            }
            
            // 如果不在多边形内，检查是否靠近边缘
            const edgeDistance = this.getDistanceToPolygonEdges2D(mousePoint, screenPoints);
            if (edgeDistance < 15) { // 增加容差到15像素
                const avgDepth = totalDepth / validPoints;
                
                return {
                    object: polygon,
                    distance: Math.abs(avgDepth) + edgeDistance * 0.01, // 边缘选择距离稍微增加
                    priority: 3 // 边缘选择优先级稍低
                };
            }
        } catch (error) {
            console.warn('Error in polygon screen projection:', error);
        }
        
        return null;
    }
    
    /**
     * 检查Box的屏幕投影选择
     */
    private checkBoxScreenProjection(box: any, mousePoint: THREE.Vector2, camera: THREE.Camera): {
        object: THREE.Object3D;
        distance: number;
        priority: number;
    } | null {
        // Box使用包围盒的屏幕投影
        if (!box.geometry.boundingBox) {
            box.geometry.computeBoundingBox();
        }
        
        const bbox = box.geometry.boundingBox;
        const corners = [
            new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
            new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
            new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
            new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
            new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
            new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
            new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
            new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z)
        ];
        
        // 投影所有角点到屏幕空间
        const screenCorners: THREE.Vector2[] = [];
        let totalDepth = 0;
        
        for (const corner of corners) {
            const worldPoint = corner.clone().applyMatrix4(box.matrixWorld);
            const screenPoint = worldPoint.clone().project(camera);
            
            screenPoint.x = (screenPoint.x + 1) * this.renderView.width / 2;
            screenPoint.y = (-screenPoint.y + 1) * this.renderView.height / 2;
            
            screenCorners.push(new THREE.Vector2(screenPoint.x, screenPoint.y));
            totalDepth += screenPoint.z;
        }
        
        // 找到屏幕空间的包围盒
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const point of screenCorners) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
        
        // 检查鼠标点是否在屏幕包围盒内
        if (mousePoint.x >= minX && mousePoint.x <= maxX && 
            mousePoint.y >= minY && mousePoint.y <= maxY) {
            const avgDepth = totalDepth / corners.length;
            
            // 计算到包围盒中心的距离作为优先级参考
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const centerDistance = mousePoint.distanceTo(new THREE.Vector2(centerX, centerY));
            
            return {
                object: box,
                distance: Math.abs(avgDepth) + centerDistance * 0.001,
                priority: 2 // Box优先级中等
            };
        }
        
        return null;
    }
    
    /**
     * 检查Polyline3D的屏幕投影选择
     */
    private checkPolylineScreenProjection(polyline: any, mousePoint: THREE.Vector2, camera: THREE.Camera): {
        object: THREE.Object3D;
        distance: number;
        priority: number;
    } | null {
        // 支持不同的points属性名
        const points = polyline.points || polyline._points;
        if (!points || points.length < 2) return null;
        
        try {
            // 确保世界矩阵是最新的
            polyline.updateMatrixWorld(true);
            
            let minDistance = Infinity;
            let closestDepth = Infinity;
            let validSegments = 0;
            
            // 检查每个线段
            for (let i = 0; i < points.length - 1; i++) {
                const startWorld = points[i].clone().applyMatrix4(polyline.matrixWorld);
                const endWorld = points[i + 1].clone().applyMatrix4(polyline.matrixWorld);
                
                const startScreen = startWorld.clone().project(camera);
                const endScreen = endWorld.clone().project(camera);
                
                // 检查点是否在视锥内
                if (Math.abs(startScreen.z) < 1 && Math.abs(endScreen.z) < 1 && 
                    startScreen.z > 0 && endScreen.z > 0) {
                    
                    // 转换到屏幕坐标
                    startScreen.x = (startScreen.x + 1) * this.renderView.width / 2;
                    startScreen.y = (-startScreen.y + 1) * this.renderView.height / 2;
                    endScreen.x = (endScreen.x + 1) * this.renderView.width / 2;
                    endScreen.y = (-endScreen.y + 1) * this.renderView.height / 2;
                    
                    const startScreen2D = new THREE.Vector2(startScreen.x, startScreen.y);
                    const endScreen2D = new THREE.Vector2(endScreen.x, endScreen.y);
                    
                    const distance = this.getDistanceToLineSegment2D(mousePoint, startScreen2D, endScreen2D);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestDepth = Math.min(startScreen.z, endScreen.z);
                    }
                    validSegments++;
                }
            }
            
            // 检查闭合线段（如果是闭合的）
            if (polyline._closed && points.length > 2) {
                const startWorld = points[points.length - 1].clone().applyMatrix4(polyline.matrixWorld);
                const endWorld = points[0].clone().applyMatrix4(polyline.matrixWorld);
                
                const startScreen = startWorld.clone().project(camera);
                const endScreen = endWorld.clone().project(camera);
                
                // 检查点是否在视锥内
                if (Math.abs(startScreen.z) < 1 && Math.abs(endScreen.z) < 1 && 
                    startScreen.z > 0 && endScreen.z > 0) {
                    
                    startScreen.x = (startScreen.x + 1) * this.renderView.width / 2;
                    startScreen.y = (-startScreen.y + 1) * this.renderView.height / 2;
                    endScreen.x = (endScreen.x + 1) * this.renderView.width / 2;
                    endScreen.y = (-endScreen.y + 1) * this.renderView.height / 2;
                    
                    const startScreen2D = new THREE.Vector2(startScreen.x, startScreen.y);
                    const endScreen2D = new THREE.Vector2(endScreen.x, endScreen.y);
                    
                    const distance = this.getDistanceToLineSegment2D(mousePoint, startScreen2D, endScreen2D);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestDepth = Math.min(startScreen.z, endScreen.z);
                    }
                    validSegments++;
                }
            }
            
            if (validSegments === 0) return null; // 没有有效线段
            
            // 如果距离小于阈值，认为选中
            const threshold = 12; // 增加容差到12像素
            if (minDistance < threshold) {
                return {
                    object: polyline,
                    distance: Math.abs(closestDepth) + minDistance * 0.01,
                    priority: 2 // Polyline优先级中等
                };
            }
        } catch (error) {
            console.warn('Error in polyline screen projection:', error);
        }
        
        return null;
    }
    
    /**
     * 检查Segmentation3D的屏幕投影选择
     */
    private checkSegmentationScreenProjection(segmentation: any, mousePoint: THREE.Vector2, camera: THREE.Camera): {
        object: THREE.Object3D;
        distance: number;
        priority: number;
    } | null {
        // Segmentation3D通常是点云，使用包围盒方法
        if (!segmentation.geometry.boundingBox) {
            segmentation.geometry.computeBoundingBox();
        }
        
        const bbox = segmentation.geometry.boundingBox;
        const center = bbox.getCenter(new THREE.Vector3());
        const worldCenter = center.applyMatrix4(segmentation.matrixWorld);
        const screenCenter = worldCenter.clone().project(camera);
        
        screenCenter.x = (screenCenter.x + 1) * this.renderView.width / 2;
        screenCenter.y = (-screenCenter.y + 1) * this.renderView.height / 2;
        
        const screenCenter2D = new THREE.Vector2(screenCenter.x, screenCenter.y);
        const distance = mousePoint.distanceTo(screenCenter2D);
        
        // 使用较大的容差范围
        const threshold = 20;
        if (distance < threshold) {
            return {
                object: segmentation,
                distance: Math.abs(screenCenter.z) + distance * 0.01,
                priority: 3 // Segmentation优先级较高
            };
        }
        
        return null;
    }
    
    /**
     * 2D点在多边形内判断（射线投射算法）
     */
    private isPointInPolygon2D(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
        let inside = false;
        const n = polygon.length;
        
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * 计算点到多边形边缘的最小距离
     */
    private getDistanceToPolygonEdges2D(point: THREE.Vector2, polygon: THREE.Vector2[]): number {
        let minDistance = Infinity;
        
        for (let i = 0; i < polygon.length; i++) {
            const start = polygon[i];
            const end = polygon[(i + 1) % polygon.length];
            const distance = this.getDistanceToLineSegment2D(point, start, end);
            minDistance = Math.min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    /**
     * 计算点到线段的距离
     */
    private getDistanceToLineSegment2D(point: THREE.Vector2, start: THREE.Vector2, end: THREE.Vector2): number {
        const A = point.x - start.x;
        const B = point.y - start.y;
        const C = end.x - start.x;
        const D = end.y - start.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // 退化情况：起点和终点相同
            return point.distanceTo(start);
        }
        
        let param = dot / lenSq;
        
        let closestPoint: THREE.Vector2;
        
        if (param < 0) {
            closestPoint = start;
        } else if (param > 1) {
            closestPoint = end;
        } else {
            closestPoint = new THREE.Vector2(
                start.x + param * C,
                start.y + param * D
            );
        }
        
        return point.distanceTo(closestPoint);
    }
    
    /**
     * 传统射线投射方法作为回退
     */
    private fallbackRaycastSelection(pos: THREE.Vector2, annotate3D: any[]): THREE.Object3D | null {
        this.raycaster.setFromCamera(pos, this.renderView.camera);
        
        // 确保raycaster有camera参数，用于自定义raycast方法
        (this.raycaster as any).camera = this.renderView.camera;
        
        // 使用更大的阈值以提高选择成功率
        this.raycaster.params.Line = { threshold: SELECTION_CONFIG.THRESHOLDS.LINE * 2 };
        this.raycaster.params.Points = { threshold: SELECTION_CONFIG.THRESHOLDS.POINTS };
        this.raycaster.params.Mesh = { threshold: 1 };
        
        const intersects = this.raycaster.intersectObjects(annotate3D as THREE.Object3D[]);
        
        // 基本筛选：只要可见且距离有效
        const validIntersects = intersects.filter(intersect => {
            const obj = intersect.object;
            return obj.visible && 
                   obj.parent && 
                   obj.parent.visible && 
                   intersect.distance > 0;
        });
        
        if (validIntersects.length > 0) {
            // 返回距离最近的对象
            validIntersects.sort((a, b) => a.distance - b.distance);
            
            // 对于Group类型的对象（如Polygon3D），返回parent对象
            const selectedObject = validIntersects[0].object;
            if (selectedObject.parent && (selectedObject.parent.name === 'Polygon3D' || selectedObject.parent.name === 'Polyline3D')) {
                return selectedObject.parent as THREE.Object3D;
            }
            
            return selectedObject;
        }
        
        return null;
    }

    checkImage2DView(event: MouseEvent) {
        // debugger;
        let renderView = this.renderView as Image2DRenderView;
        let imgSize = renderView.imgSize;

        let findObject;
        let imgPos = get(THREE.Vector2, 0).set(event.offsetX, event.offsetY);
        // 转换到图片坐标系
        renderView.domToImg(imgPos);
        // tempPos.x = ((pos.x + 1) / 2) * imgSize.x;
        // tempPos.y = ((-pos.y + 1) / 2) * imgSize.y;

        if (!findObject && (renderView.renderRect || renderView.renderBox2D)) {
            let annotate2D = renderView.get2DObject();
            let obj;
            for (let i = annotate2D.length - 1; i >= 0; i--) {
                obj = annotate2D[i];

                if (renderView.isRenderable(obj) && obj.isContainPosition(imgPos)) {
                    findObject = obj;
                    break;
                }
            }
        }

        if (!findObject && renderView.renderBox) {
            let annotate3D = renderView.get3DObject();
            let projectPos = get(THREE.Vector2, 1).copy(imgPos);
            this.getProjectImgPos(projectPos);
            this.raycaster.setFromCamera(projectPos, this.renderView.camera);

            let intersects = this.raycaster.intersectObjects(annotate3D as THREE.Object3D[]);
            findObject = intersects.length > 0 ? intersects[0].object : null;
        }

        return findObject;
    }

    selectObject(object?: AnnotateObject) {
        this.renderView.pointCloud.selectObject(object);
    }

    getProjectImgPos(pos: THREE.Vector2, target?: THREE.Vector2) {
        let renderView = this.renderView as Image2DRenderView;
        let { imgSize } = renderView;

        target = target || pos;
        target.x = (pos.x / imgSize.x) * 2 - 1;
        target.y = (-pos.y / imgSize.y) * 2 + 1;
        return target;
    }

    getProjectPos(event: MouseEvent, pos?: THREE.Vector2) {
        let x = (event.offsetX / this.renderView.width) * 2 - 1;
        let y = (-event.offsetY / this.renderView.height) * 2 + 1;

        pos = pos || new THREE.Vector2();
        pos.set(x, y);
        return pos;
    }
}
