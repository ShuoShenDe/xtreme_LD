import * as THREE from 'three';
import Action from './Action';
import MainRenderView from '../renderView/MainRenderView';
import SideRenderView from '../renderView/SideRenderView';
import { Polyline3D, Polygon3D, Segmentation3D } from '../objects';
import { Event } from '../config';
import { get } from '../utils/tempVar';

interface ControlPoint {
    point: THREE.Vector3;
    mesh: THREE.Mesh;
    index: number;
}

export default class PointEditAction extends Action {
    static actionName: string = 'point-edit';
    renderView: MainRenderView | SideRenderView;
    
    private _targetObject: Polyline3D | Polygon3D | Segmentation3D | null = null;
    private _controlPoints: ControlPoint[] = [];
    private _controlPointsGroup: THREE.Group;
    private _isDragging: boolean = false;
    private _dragStartPos: THREE.Vector3 = new THREE.Vector3();
    private _dragPointIndex: number = -1;
    private _dragPlane: THREE.Plane = new THREE.Plane();
    private _zEditMode: boolean = false; // z轴编辑模式
    private _dragStartMouseY: number = 0; // 拖拽开始时的鼠标Y位置
    
    // Materials for control points
    private _normalMaterial: THREE.MeshBasicMaterial;
    private _hoverMaterial: THREE.MeshBasicMaterial;
    private _selectedMaterial: THREE.MeshBasicMaterial;
    private _zEditMaterial: THREE.MeshBasicMaterial;
    
    // Timer for perspective view control point scaling
    private _scaleUpdateTimer: number | null = null;
    
    // 定期同步控制点位置的定时器
    private _syncTimer: number | null = null;
    
    constructor(renderView: MainRenderView | SideRenderView) {
        super();
        this.renderView = renderView;
        
        // Create materials with enhanced visibility - 调整颜色以与黄色选中对象保持协调
        this._normalMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, // 黄色，与selectColor一致
            transparent: true, 
            opacity: 1.0, // 提高不透明度
            depthTest: false,  // 禁用深度测试以确保总是显示在前面
            depthWrite: false,
            fog: false,
            toneMapped: false
        });
        this._hoverMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffdd44, // 浅黄色，表示悬停状态
            transparent: true, 
            opacity: 1.0, // 提高不透明度
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false
        });
        this._selectedMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xddaa00, // 深黄色，表示选中/拖拽状态
            transparent: true, 
            opacity: 1.0, // 提高不透明度
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false
        });
        this._zEditMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0088ff, // 蓝色，表示Z轴编辑模式
            transparent: true, 
            opacity: 1.0, // 提高不透明度
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false
        });
        
        // Create group for control points
        this._controlPointsGroup = new THREE.Group();
        this._controlPointsGroup.name = 'PointEditControlPoints';
        this._controlPointsGroup.renderOrder = 1000; // 确保控制点在其他物体前面渲染
        
        // Bind event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onObjectSelect = this.onObjectSelect.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
    }
    
    init() {
        const dom = this.renderView.container;
        dom.addEventListener('mousedown', this.onMouseDown);
        dom.addEventListener('mousemove', this.onMouseMove);
        dom.addEventListener('mouseup', this.onMouseUp);
        
        // 确保容器能接收键盘事件
        dom.tabIndex = 0; // 使div可以获得焦点
        dom.style.outline = 'none'; // 隐藏焦点轮廓
        
        // 添加键盘事件监听用于z轴编辑模式
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        
        // 也在容器上添加键盘事件监听作为备用
        dom.addEventListener('keydown', this.onKeyDown);
        dom.addEventListener('keyup', this.onKeyUp);
        
        // 确保容器在点击时获得焦点
        dom.addEventListener('click', () => {
            dom.focus();
        });
        
        // Listen for object selection
        this.renderView.pointCloud.addEventListener(Event.SELECT, this.onObjectSelect);
        
        // Listen for render events to update control points scale
        this.renderView.pointCloud.addEventListener(Event.RENDER_AFTER, () => {
            this.updateControlPointsScale();
        });
        
        // 添加窗口大小改变的监听
        window.addEventListener('resize', () => {
            this.updateControlPointsScale();
        });
        
        // 如果是MainRenderView，添加额外的相机控制监听
        if (this.renderView.constructor.name === 'MainRenderView') {
            // 监听相机移动事件以更新控制点大小
            const updateScale = () => {
                this.updateControlPointsScale();
            };
            
            // 使用轮询方式检查相机位置变化（简单但有效的方法）
            this._scaleUpdateTimer = window.setInterval(updateScale, 100); // 每100ms检查一次
        }
        
        // Add control points group to scene
        this.renderView.pointCloud.scene.add(this._controlPointsGroup);
    }
    
    destroy() {
        const dom = this.renderView.container;
        dom.removeEventListener('mousedown', this.onMouseDown);
        dom.removeEventListener('mousemove', this.onMouseMove);
        dom.removeEventListener('mouseup', this.onMouseUp);
        
        // 移除键盘事件监听
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        
        // 移除容器上的键盘事件监听
        dom.removeEventListener('keydown', this.onKeyDown);
        dom.removeEventListener('keyup', this.onKeyUp);
        
        this.renderView.pointCloud.removeEventListener(Event.SELECT, this.onObjectSelect);
        
        // 注意：RENDER_AFTER事件是通过匿名函数添加的，这里无法直接移除
        // 在实际应用中，应该保存对函数的引用以便移除
        
        // Remove control points group from scene
        this.renderView.pointCloud.scene.remove(this._controlPointsGroup);
        
        // Clean up
        this.clearControlPoints();
        this._normalMaterial.dispose();
        this._hoverMaterial.dispose();
        this._selectedMaterial.dispose();
        this._zEditMaterial.dispose();

        // Clear the timer if it exists
        if (this._scaleUpdateTimer) {
            window.clearInterval(this._scaleUpdateTimer);
            this._scaleUpdateTimer = null;
        }
        
        // 停止同步定时器
        this.stopSyncTimer();
    }
    
    private onObjectSelect(event: any) {
        const selectedObjects = this.renderView.pointCloud.selection;
        
        // Check if selected object is editable
        const editableObject = selectedObjects.find(obj => 
            obj instanceof Polyline3D || 
            obj instanceof Polygon3D || 
            obj instanceof Segmentation3D
        ) as Polyline3D | Polygon3D | Segmentation3D | undefined;
        
        // 对于polyline和polygon，总是显示控制点
        if (editableObject && (editableObject instanceof Polyline3D || editableObject instanceof Polygon3D)) {
            this.setTargetObject(editableObject);
            // 强制启用控制点显示
            this.enabled = true;
        } else if (editableObject && editableObject !== this._targetObject) {
            this.setTargetObject(editableObject);
        } else if (!editableObject) {
            this.setTargetObject(null);
        }
    }
    
    setTargetObject(object: Polyline3D | Polygon3D | Segmentation3D | null) {
        if (this._targetObject === object) return;
        
        this._targetObject = object;
        this.clearControlPoints();
        
        if (object) {
            this.createControlPoints();
            
            // 对于polyline和polygon，强制显示控制点
            if (object instanceof Polyline3D || object instanceof Polygon3D) {
                this._controlPointsGroup.visible = true;
                this.enabled = true;
                
                // 立即更新控制点位置和缩放
                this.updateControlPointsPosition();
                
                // 优化控制点显示
                this.optimizeControlPointsForView();
                
                // 启动定期同步检查
                this.startSyncTimer();
                
                console.log('Control points enabled for', object.constructor.name, 'with', object.points.length, 'points');
            }
        } else {
            // 如果没有目标对象，停止同步定时器
            this.stopSyncTimer();
        }
        
        this.renderView.pointCloud.render();
    }
    
    private createControlPoints() {
        if (!this._targetObject) return;
        
        const points = this._targetObject.points;
        // 减小控制点基础大小，使其更加合适
        const geometry = new THREE.SphereGeometry(0.1, 16, 12); // 从 0.25 减小到 0.1
        
        // 确保几何体的边界球被正确计算
        geometry.computeBoundingSphere();
        
        points.forEach((point, index) => {
            const mesh = new THREE.Mesh(geometry, this._normalMaterial.clone());
            mesh.position.copy(point);
            mesh.userData = { pointIndex: index };
            
            // 确保控制点可以被raycast检测到
            mesh.raycast = THREE.Mesh.prototype.raycast;
            
            // 优化渲染顺序 - 确保控制点在前面显示但不会完全遮挡对象选择
            mesh.renderOrder = 999; // 降低渲染顺序，从1000改为999
            
            // 确保控制点材质设置正确
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.transparent = true;
            material.opacity = 0.9; // 稍微降低不透明度，减少对选择的干扰
            material.depthTest = false; // 禁用深度测试，确保总是在前面
            material.depthWrite = false;
            
            // 在透视图中添加额外的可见性设置
            if (!(this.renderView instanceof SideRenderView)) {
                // 为透视图设置更明显的渲染属性
                material.fog = false; // 禁用雾效果
                material.toneMapped = false; // 禁用色调映射
                
                // 在透视图中使用稍小的控制点以减少干扰
                mesh.scale.setScalar(0.8);
            }
            
            // 确保网格矩阵更新
            mesh.updateMatrixWorld();
            
            const controlPoint: ControlPoint = {
                point,
                mesh,
                index
            };
            
            this._controlPoints.push(controlPoint);
            this._controlPointsGroup.add(mesh);
        });
        
        // 控制点组的渲染设置
        this._controlPointsGroup.visible = true;
        this._controlPointsGroup.renderOrder = 999; // 与控制点保持一致
        this._controlPointsGroup.updateMatrixWorld();
        
        // Scale control points based on camera distance
        this.updateControlPointsScale();
    }
    
    private clearControlPoints() {
        this._controlPoints.forEach(cp => {
            this._controlPointsGroup.remove(cp.mesh);
            (cp.mesh.material as THREE.Material).dispose();
        });
        this._controlPoints = [];
    }
    
    private updateControlPointsScale() {
        if (this._controlPoints.length === 0 || !this._targetObject) return;
        
        const camera = this.renderView.camera;
        
        // 计算屏幕空间固定大小的控制点
        this._controlPoints.forEach(cp => {
            let scale;
            
            if (this.renderView instanceof SideRenderView) {
                // 在侧视图中，基于相机的投影矩阵计算固定的屏幕空间大小
                const sideView = this.renderView as SideRenderView;
                const frustumHeight = Math.abs(sideView.camera.top - sideView.camera.bottom);
                const screenHeight = sideView.height;
                
                // 控制点在屏幕上的目标像素大小（再增大到32像素）
                const targetPixelSize = 32; // 从16增加到32像素
                scale = (frustumHeight / screenHeight) * targetPixelSize;
                
                // 确保最小和最大尺寸
                scale = Math.max(2.0, Math.min(scale, 40));
            } else {
                // 在透视图中，基于到相机的距离计算屏幕空间固定大小
                const distance = camera.position.distanceTo(cp.mesh.position);
                
                // 透视相机的fov计算
                const fov = (camera as THREE.PerspectiveCamera).fov;
                const fovRad = fov * Math.PI / 180;
                
                // 控制点在屏幕上的目标像素大小（再增大到40像素）
                const targetPixelSize = 40; // 从20增加到40像素
                const screenHeight = this.renderView.height;
                
                // 计算在当前距离下的屏幕空间大小
                const screenSpaceSize = 2 * distance * Math.tan(fovRad / 2) / screenHeight * targetPixelSize;
                scale = screenSpaceSize;
                
                // 确保最小和最大尺寸
                scale = Math.max(0.8, Math.min(scale, 20));
            }
            
            cp.mesh.scale.setScalar(scale);
            
            // 确保控制点可见
            cp.mesh.visible = true;
            cp.mesh.updateMatrixWorld();
        });
    }
    
    private onMouseDown(event: MouseEvent) {
        if (!this.enabled || !this._targetObject || this._controlPoints.length === 0) return;
        
        const intersect = this.getControlPointIntersection(event);
        
        // 调试信息
        if (window.location.hostname === 'localhost') {
            console.log('PointEdit MouseDown:', {
                enabled: this.enabled,
                targetObject: this._targetObject?.constructor.name,
                controlPointsCount: this._controlPoints.length,
                intersect: !!intersect,
                renderView: this.renderView.constructor.name,
                mousePos: { x: event.offsetX, y: event.offsetY }
            });
        }
        
        if (intersect) {
            this._isDragging = true;
            this._dragPointIndex = intersect.object.userData.pointIndex;
            this._dragStartPos.copy(this._targetObject.points[this._dragPointIndex]);
            
            // 记录拖拽开始时的鼠标Y位置（用于z轴编辑）
            this._dragStartMouseY = -(event.offsetY / this.renderView.height) * 2 + 1;
            
            console.log('Drag started - Point index:', this._dragPointIndex, 'Z-edit mode:', this._zEditMode, 'startMouseY:', this._dragStartMouseY);
            
            // 禁用相机控制以防止拖动时旋转视图
            this.disableCameraControls();
            
            // Set up drag plane based on view
            this.setupDragPlane();
            
            // Change material to selected
            (intersect.object as THREE.Mesh).material = this._selectedMaterial;
            
            event.preventDefault();
            event.stopPropagation();
        }
    }
    
    private onMouseMove(event: MouseEvent) {
        if (!this.enabled || !this._targetObject) return;
        
        // Update control points scale on camera changes
        this.updateControlPointsScale();
        
        // 检查并同步控制点位置（在非拖拽状态下）
        if (!this._isDragging) {
            this.checkAndSyncControlPoints();
        }
        
        // Handle hover effects for control points
        if (!this._isDragging) {
            const intersect = this.getControlPointIntersection(event);
            
            // Reset all control points to normal material
            this._controlPoints.forEach(cp => {
                cp.mesh.material = this._normalMaterial;
            });
            
            // Set hover material for intersected control point
            if (intersect) {
                (intersect.object as THREE.Mesh).material = this._hoverMaterial;
                this.renderView.container.style.cursor = 'pointer';
            } else {
                this.renderView.container.style.cursor = 'default';
            }
            
            return;
        }
        
        if (this._isDragging && this._dragPointIndex >= 0) {
            // Ensure dragged control point remains in selected state
            const draggedControlPoint = this._controlPoints[this._dragPointIndex];
            if (draggedControlPoint) {
                // Use special material for z-edit mode
                draggedControlPoint.mesh.material = this._zEditMode ? this._zEditMaterial : this._selectedMaterial;
            }
            
            // Handle dragging
            const newPosition = this.getWorldPositionFromMouse(event);
            if (newPosition) {
                this.updatePointPosition(this._dragPointIndex, newPosition);
            } else {
                // 如果获取新位置失败，在开发环境下输出调试信息
                if (window.location.hostname === 'localhost') {
                    console.warn('Failed to get world position from mouse:', {
                        renderView: this.renderView.constructor.name,
                        zEditMode: this._zEditMode,
                        dragPointIndex: this._dragPointIndex
                    });
                }
            }
        }
    }
    
    private onMouseUp(event: MouseEvent) {
        if (!this.enabled || !this._isDragging) return;
        
        this._isDragging = false;
        
        // Commit the final position change
        if (this._dragPointIndex >= 0 && this._targetObject) {
            const finalPosition = this._targetObject.points[this._dragPointIndex];
            this.commitPointChange(this._dragPointIndex, finalPosition);
            
            // 最终同步检查：确保控制点位置完全正确
            this.syncAllControlPointsPosition();
            
            // 更新控制点缩放，以防相机位置改变
            this.updateControlPointsScale();
        }
        
        // Re-enable camera controls
        this.enableCameraControls();
        
        // Reset materials for all control points
        this._controlPoints.forEach(cp => {
            cp.mesh.material = this._normalMaterial;
        });
        
        this._dragPointIndex = -1;
        
        // 强制重新渲染以确保所有更改都可见
        this.renderView.pointCloud.render();
    }
    
    private setupDragPlane() {
        const camera = this.renderView.camera;
        
        // z轴编辑模式优先处理
        if (this._zEditMode) {
            // z轴编辑模式下，使用垂直平面让鼠标y轴移动对应世界z轴
            if (this.renderView instanceof MainRenderView) {
                // 在主视图中，创建一个垂直于相机右向量的平面
                const right = get(THREE.Vector3, 0);
                const up = get(THREE.Vector3, 1);
                camera.getWorldDirection(up); // 先获取相机朝向
                right.crossVectors(up, new THREE.Vector3(0, 0, 1)).normalize(); // 计算右向量
                this._dragPlane.setFromNormalAndCoplanarPoint(right, this._dragStartPos);
            } else {
                // 在侧视图中也支持z轴编辑
                const normal = new THREE.Vector3(1, 0, 0); // 使用x轴作为法向量，允许在yz平面编辑
                this._dragPlane.setFromNormalAndCoplanarPoint(normal, this._dragStartPos);
            }
            return;
        }
        
        if (this.renderView instanceof SideRenderView) {
            // For side views, constrain to the view plane
            const axis = (this.renderView as SideRenderView).axis;
            switch (axis) {
                case 'x':
                case '-x':
                    this._dragPlane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(1, 0, 0),
                        this._dragStartPos
                    );
                    break;
                case 'y':
                case '-y':
                    this._dragPlane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(0, 1, 0),
                        this._dragStartPos
                    );
                    break;
                case 'z':
                    this._dragPlane.setFromNormalAndCoplanarPoint(
                        new THREE.Vector3(0, 0, 1),
                        this._dragStartPos
                    );
                    break;
            }
        } else {
            // For main view, use camera-facing plane
            const normal = get(THREE.Vector3, 0);
            camera.getWorldDirection(normal);
            normal.negate(); // 面向相机
            this._dragPlane.setFromNormalAndCoplanarPoint(normal, this._dragStartPos);
        }
    }
    
    private getWorldPositionFromMouse(event: MouseEvent): THREE.Vector3 | null {
        // z轴编辑模式特殊处理
        if (this._zEditMode) {
            console.log('Using Z-edit mode positioning');
            return this.getWorldPositionFromMouseInZMode(event);
        }
        
        const raycaster = get(THREE.Raycaster, 0);
        const mouse = get(THREE.Vector2, 0);
        
        // Convert mouse to normalized device coordinates
        mouse.x = (event.offsetX / this.renderView.width) * 2 - 1;
        mouse.y = -(event.offsetY / this.renderView.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, this.renderView.camera);
        
        const intersectPoint = get(THREE.Vector3, 0);
        if (raycaster.ray.intersectPlane(this._dragPlane, intersectPoint)) {
            return intersectPoint.clone();
        }
        
        // 如果平面相交失败，尝试不同的后备方案
        if (this.renderView instanceof SideRenderView) {
            return this.getWorldPositionFromMouseInSideView(event);
        } else {
            // MainRenderView的后备方案：使用相机到起始点的距离在射线上找点
            const camera = this.renderView.camera;
            const distance = camera.position.distanceTo(this._dragStartPos);
            
            // 在射线方向上的固定距离处获取点
            const targetPoint = new THREE.Vector3();
            raycaster.ray.at(distance, targetPoint);
            return targetPoint;
        }
    }
    
    private getWorldPositionFromMouseInZMode(event: MouseEvent): THREE.Vector3 | null {
        // Convert current mouse to normalized device coordinates
        const currentMouseY = -(event.offsetY / this.renderView.height) * 2 + 1;
        
        // 计算鼠标Y轴移动距离
        const deltaMouseY = currentMouseY - this._dragStartMouseY;
        
        console.log('Z-edit calculation: deltaMouseY =', deltaMouseY, 'startMouseY =', this._dragStartMouseY);
        
        // 根据视图类型计算z轴变化
        let zDelta = 0;
        if (this.renderView instanceof MainRenderView) {
            // 在主视图中，根据相机距离调整敏感度
            const camera = this.renderView.camera as THREE.PerspectiveCamera;
            const distance = camera.position.distanceTo(this._dragStartPos);
            const sensitivity = 0.3; // 增加敏感度
            zDelta = deltaMouseY * distance * sensitivity;
        } else {
            // 在侧视图中，根据相机范围调整
            const camera = this.renderView.camera as THREE.OrthographicCamera;
            const range = Math.abs(camera.top - camera.bottom);
            const sensitivity = 0.5; // 增加敏感度，让Z轴编辑更加明显
            zDelta = deltaMouseY * range * sensitivity;
        }
        
        // 创建新位置：保持x,y不变，只改变z
        const newPosition = this._dragStartPos.clone();
        newPosition.z += zDelta;
        
        return newPosition;
    }
    
    private getWorldPositionFromMouseInSideView(event: MouseEvent): THREE.Vector3 | null {
        const mouse = get(THREE.Vector2, 0);
        const camera = this.renderView.camera as THREE.OrthographicCamera;
        
        // Convert mouse to normalized device coordinates
        mouse.x = (event.offsetX / this.renderView.width) * 2 - 1;
        mouse.y = -(event.offsetY / this.renderView.height) * 2 + 1;
        
        // 计算世界坐标
        const worldPosition = new THREE.Vector3();
        
        // 对于正交相机，直接计算世界坐标
        const cameraWidth = camera.right - camera.left;
        const cameraHeight = camera.top - camera.bottom;
        
        // 在相机的局部坐标系中计算位置
        const localX = mouse.x * cameraWidth / 2;
        const localY = mouse.y * cameraHeight / 2;
        
        // 获取相机的世界变换矩阵
        camera.updateMatrixWorld();
        const cameraMatrix = camera.matrixWorld;
        
        // 获取相机的前方、右方、上方向量
        const forward = new THREE.Vector3(0, 0, -1).transformDirection(cameraMatrix);
        const right = new THREE.Vector3(1, 0, 0).transformDirection(cameraMatrix);
        const up = new THREE.Vector3(0, 1, 0).transformDirection(cameraMatrix);
        
        // 计算世界位置
        worldPosition.copy(camera.position);
        worldPosition.addScaledVector(right, localX);
        worldPosition.addScaledVector(up, localY);
        
        // 限制在拖拽平面上
        const projectedPoint = this._dragPlane.projectPoint(worldPosition, new THREE.Vector3());
        
        return projectedPoint;
    }
    
    private updatePointPosition(index: number, newPosition: THREE.Vector3) {
        if (!this._targetObject || index < 0 || index >= this._targetObject.points.length) return;
        
        // Update the point position
        this._targetObject.points[index].copy(newPosition);
        
        // Update control point mesh position and matrix
        if (this._controlPoints[index]) {
            this._controlPoints[index].point = this._targetObject.points[index]; // 同步引用
            this._controlPoints[index].mesh.position.copy(newPosition);
            this._controlPoints[index].mesh.updateMatrixWorld(true); // 强制更新矩阵
        }
        
        // Update the object's geometry - 使用正确的方法触发几何体更新
        if (this._targetObject instanceof Polyline3D) {
            // Polyline3D有points setter，会自动调用updateGeometry
            this._targetObject.points = [...this._targetObject.points];
            this._targetObject.updateMatrixWorld(true);
        } else if (this._targetObject instanceof Polygon3D) {
            // Polygon3D需要调用setPoints方法来更新几何体
            this._targetObject.setPoints(this._targetObject.points);
            this._targetObject.updateMatrixWorld(true);
        } else if (this._targetObject instanceof Segmentation3D) {
            // Segmentation3D有points setter，会自动调用updateGeometry
            this._targetObject.points = [...this._targetObject.points];
            this._targetObject.updateMatrixWorld(true);
        }
        
        // 同步所有控制点位置，防止位置不一致
        this.syncAllControlPointsPosition();
        
        // 如果是SideRenderView，重新适配对象以保持居中
        if (this.renderView instanceof SideRenderView) {
            const sideView = this.renderView as SideRenderView;
            if (sideView.object === this._targetObject && sideView.enableFit) {
                sideView.updateProjectRect();
                sideView.updateCameraProject();
            }
        }
        
        // 强制重新渲染
        this.renderView.pointCloud.render();
    }
    
    // 新增：同步所有控制点位置的方法
    private syncAllControlPointsPosition() {
        if (!this._targetObject) return;
        
        this._controlPoints.forEach((cp, index) => {
            if (index < this._targetObject!.points.length) {
                const targetPoint = this._targetObject!.points[index];
                cp.point = targetPoint; // 更新引用
                cp.mesh.position.copy(targetPoint);
                cp.mesh.updateMatrixWorld(true);
            }
        });
    }
    
    private commitPointChange(index: number, newPosition: THREE.Vector3) {
        if (!this._targetObject) return;
        
        // Dispatch through event system to command manager
        this.renderView.pointCloud.dispatchEvent({
            type: 'point-edit',
            data: {
                object: this._targetObject,
                pointIndex: index,
                newPosition: newPosition.clone()
            }
        });
    }
    
    // 公共方法：检查控制点交集，供其他Action调用
    getControlPointIntersection(event: MouseEvent): THREE.Intersection | null {
        const raycaster = get(THREE.Raycaster, 0);
        const mouse = get(THREE.Vector2, 0);
        
        mouse.x = (event.offsetX / this.renderView.width) * 2 - 1;
        mouse.y = -(event.offsetY / this.renderView.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, this.renderView.camera);
        
        // 为不同类型的几何体设置合适的阈值
        raycaster.params.Mesh = { threshold: 0.1 };
        raycaster.params.Points = { threshold: 0.5 };
        raycaster.params.Line = { threshold: 0.5 };
        
        const meshes = this._controlPoints.map(cp => cp.mesh);
        const intersects = raycaster.intersectObjects(meshes);
        
        // 调试信息 - 只在开发环境下启用
        if (window.location.hostname === 'localhost' && intersects.length === 0 && this._controlPoints.length > 0) {
            console.debug('Control point detection:', {
                mouse: mouse,
                controlPointsCount: this._controlPoints.length,
                visibleControlPoints: this._controlPoints.filter(cp => cp.mesh.visible).length,
                renderView: this.renderView.constructor.name
            });
        }
        
        return intersects.length > 0 ? intersects[0] : null;
    }
    
    private updateHoverState(intersect: THREE.Intersection | null) {
        // Reset all to normal
        this._controlPoints.forEach(cp => {
            if (!this._isDragging || cp.index !== this._dragPointIndex) {
                cp.mesh.material = this._normalMaterial;
            }
        });
        
        // Highlight hovered point
        if (intersect && !this._isDragging) {
            (intersect.object as THREE.Mesh).material = this._hoverMaterial;
            // 改变鼠标指针样式
            this.renderView.container.style.cursor = 'pointer';
        } else {
            // 恢复默认鼠标指针
            this.renderView.container.style.cursor = 'default';
        }
    }
    
    private disableCameraControls() {
        if (this.renderView instanceof MainRenderView) {
            const orbitAction = this.renderView.getAction('orbit-control');
            if (orbitAction && (orbitAction as any).control) {
                (orbitAction as any).control.enabled = false;
            }
        } else if (this.renderView instanceof SideRenderView) {
            // SideRenderView可能有其他类型的控制器，暂时禁用其他交互
            const sideView = this.renderView as SideRenderView;
            sideView.enableFit = false; // 暂时禁用自动适配
        }
    }
    
    private enableCameraControls() {
        if (this.renderView instanceof MainRenderView) {
            const orbitAction = this.renderView.getAction('orbit-control');
            if (orbitAction && (orbitAction as any).control) {
                (orbitAction as any).control.enabled = true;
            }
        } else if (this.renderView instanceof SideRenderView) {
            // 重新启用SideRenderView的交互
            const sideView = this.renderView as SideRenderView;
            sideView.enableFit = true; // 重新启用自动适配
        }
    }
    
    private onKeyDown(event: KeyboardEvent) {
        if (!this.enabled || !this._targetObject) return;
        
        // 按住Z键进入z轴编辑模式
        if (event.key.toLowerCase() === 'z' && !this._zEditMode) {
            console.log('Z-edit mode activated');
            this._zEditMode = true;
            this.updateControlPointsAppearance();
        }
    }
    
    private onKeyUp(event: KeyboardEvent) {
        if (!this.enabled) return;
        
        // 释放Z键退出z轴编辑模式
        if (event.key.toLowerCase() === 'z' && this._zEditMode) {
            console.log('Z-edit mode deactivated');
            this._zEditMode = false;
            this.updateControlPointsAppearance();
        }
    }
    
    private updateControlPointsAppearance() {
        // 在z轴编辑模式下改变控制点颜色以提供视觉反馈
        this._controlPoints.forEach(cp => {
            if (!this._isDragging || cp.index !== this._dragPointIndex) {
                if (this._zEditMode) {
                    // z轴编辑模式下使用蓝色材质
                    cp.mesh.material = this._zEditMaterial;
                } else {
                    cp.mesh.material = this._normalMaterial;
                }
            }
        });
        
        this.renderView.pointCloud.render();
    }
    
    // 强制更新控制点位置，用于外部调用
    updateControlPointsPosition() {
        if (!this._targetObject) return;
        
        // 检查控制点数量是否与目标对象点数量匹配
        if (this._controlPoints.length !== this._targetObject.points.length) {
            // 如果数量不匹配，重新创建控制点
            this.clearControlPoints();
            this.createControlPoints();
            return;
        }
        
        // 同步每个控制点的位置
        this._controlPoints.forEach((cp, index) => {
            if (index < this._targetObject!.points.length) {
                const targetPoint = this._targetObject!.points[index];
                
                // 检查位置是否需要更新
                if (!cp.mesh.position.equals(targetPoint)) {
                    cp.point = targetPoint;
                    cp.mesh.position.copy(targetPoint);
                    cp.mesh.updateMatrixWorld(true);
                }
            }
        });
        
        // 确保控制点组可见
        this._controlPointsGroup.visible = true;
        this._controlPointsGroup.updateMatrixWorld(true);
        
        // 更新控制点缩放
        this.updateControlPointsScale();
        
        // 强制渲染
        this.renderView.pointCloud.render();
    }
    
    // 新增：检查控制点是否需要重新同步
    checkAndSyncControlPoints() {
        if (!this._targetObject || this._controlPoints.length === 0) return;
        
        // 检查是否有控制点位置与目标点位置不匹配
        let needsSync = false;
        this._controlPoints.forEach((cp, index) => {
            if (index < this._targetObject!.points.length) {
                const targetPoint = this._targetObject!.points[index];
                if (!cp.mesh.position.equals(targetPoint)) {
                    needsSync = true;
                }
            }
        });
        
        if (needsSync) {
            console.log('Control points out of sync, forcing synchronization');
            this.syncAllControlPointsPosition();
            this.updateControlPointsScale();
        }
    }
    
    // 新增：启动定期同步检查
    private startSyncTimer() {
        this.stopSyncTimer(); // 先停止现有的定时器
        
        this._syncTimer = window.setInterval(() => {
            if (this._targetObject && this._controlPoints.length > 0) {
                this.checkAndSyncControlPoints();
            }
        }, 100); // 每100ms检查一次
    }
    
    // 新增：停止定期同步检查
    private stopSyncTimer() {
        if (this._syncTimer !== null) {
            window.clearInterval(this._syncTimer);
            this._syncTimer = null;
        }
    }
    
    // 公共方法：检查控制点是否可见和可交互
    areControlPointsInteractive(): boolean {
        return this.enabled && 
               this._targetObject !== null && 
               this._controlPoints.length > 0 && 
               this._controlPointsGroup.visible;
    }
    
    // 公共方法：获取当前编辑状态
    getEditingState() {
        return {
            enabled: this.enabled,
            hasTarget: !!this._targetObject,
            targetType: this._targetObject?.constructor.name,
            controlPointsCount: this._controlPoints.length,
            isDragging: this._isDragging,
            dragPointIndex: this._dragPointIndex,
            zEditMode: this._zEditMode,
            renderViewType: this.renderView.constructor.name,
            controlPointsVisible: this._controlPointsGroup.visible
        };
    }
    
    // 公共方法：强制重新渲染控制点
    forceRender() {
        this.updateControlPointsScale();
        this.renderView.pointCloud.render();
    }
    
    // 新增：优化控制点在不同视图中的显示
    private optimizeControlPointsForView() {
        if (!this._targetObject || this._controlPoints.length === 0) return;
        
        const isMainView = !(this.renderView instanceof SideRenderView);
        
        this._controlPoints.forEach(cp => {
            const material = cp.mesh.material as THREE.MeshBasicMaterial;
            
            if (isMainView) {
                // 在主视图中，使用稍微透明的控制点以减少对选择的干扰
                material.opacity = 0.85;
                cp.mesh.scale.setScalar(0.9); // 稍微小一点
            } else {
                // 在侧视图中，使用完全不透明的控制点确保可见性
                material.opacity = 1.0;
                cp.mesh.scale.setScalar(1.0);
            }
            
            material.needsUpdate = true;
        });
    }
    
    // 新增：当视图类型改变时调用此方法
    onViewTypeChange() {
        this.optimizeControlPointsForView();
        this.updateControlPointsScale();
    }
} 