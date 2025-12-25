import * as THREE from 'three';
import Box from '../objects/Box';
import Polyline3D from '../objects/Polyline3D';
import Polygon3D from '../objects/Polygon3D';
import Segmentation3D from '../objects/Segmentation3D';
// import { Event } from '../config';
import Render from './Render';
import PointCloud from '../PointCloud';
import PointsMaterial from '../material/PointsMaterial';
import TWEEN, { Tween } from '@tweenjs/tween.js';
// import Action from '../action/Action';
import OrbitControlsAction from '../action/OrbitControlsAction';

// const defaultActions = ['transform-control', 'select', 'create-obj'];
const defaultActions = [
    'orbit-control',
    'transform-control',
    'select',
    'create-obj',
    'view-helper',
    'point-edit',
];
export type wayToFocus = 'zTop' | 'auto';

export default class MainRenderView extends Render {
    container: HTMLDivElement;
    pointCloud: PointCloud;
    width: number;
    height: number;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    tween: Tween<THREE.Vector3> | null = null;
    // helper: THREE.BoxHelper;
    // material: PointsMaterial;
    selectColor: THREE.Color = new THREE.Color(1, 1, 0); // 改为黄色，表示pending状态
    backgroundColor: THREE.Color;
    boxInvertMatrix: THREE.Matrix4 = new THREE.Matrix4();
    
    // 选中动画相关
    private animationStartTime: number = 0;
    private animationFrame: number = 0;
    private isAnimating: boolean = false;

    constructor(container: HTMLDivElement, pointCloud: PointCloud, config: any = {}) {
        super(config.name || '');

        this.container = container;
        this.pointCloud = pointCloud;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(pointCloud.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.backgroundColor = new THREE.Color(config.backgroundColor || 0x000000);
        this.renderer.setClearColor(this.backgroundColor);
        this.renderer.sortObjects = false;
        this.renderer.autoClear = false;
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 1, 30000);
        // let aspect = this.width / this.height;
        // let depth = 100;
        // let fov_y = 35;
        // let height_ortho = depth * 2 * Math.atan((fov_y * (Math.PI / 180)) / 2);
        // let width_ortho = height_ortho * aspect;
        // this.camera = new THREE.OrthographicCamera(width_ortho / -2, width_ortho / 2, height_ortho / 2, height_ortho / -2, 0.01, 30000);

        this.pointCloud.scene.add(this.camera);
        this.camera.position.set(0, 0, 100);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);

        this.raycaster = new THREE.Raycaster();

        this.setActions(config.actions || defaultActions);

        // @ts-ignore
        window.mainview = this;
    }

    getObjectByCanvas(canvasPos: THREE.Vector2): THREE.Object3D | null {
        let { clientHeight: height, clientWidth: width } = this.renderer.domElement;
        let x = (canvasPos.x / width) * 2 - 1;
        let y = (-canvasPos.y / height) * 2 + 1;

        let annotate3D = this.pointCloud.getAnnotate3D();
        this.raycaster.setFromCamera({ x, y }, this.camera);
        const intersects = this.raycaster.intersectObjects(annotate3D as THREE.Object3D[]);
        return intersects.length > 0 ? intersects[0].object : null;
    }
    getProjectPos(p: { x: number; y: number }, target?: THREE.Vector2) {
        const { clientHeight: height, clientWidth: width } = this.renderer.domElement;
        const x = (p.x / width) * 2 - 1;
        const y = (-p.y / height) * 2 + 1;
        target = target || new THREE.Vector2();
        target.set(x, y);
        return target;
    }
    canvasToWorld(p: THREE.Vector2) {
        let ground = this.pointCloud.ground.plane;
        const { x, y } = this.getProjectPos(p);
        this.raycaster.setFromCamera({ x, y }, this.camera);

        let intersectP = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(ground, intersectP);
        return intersectP;
    }

    focusPositionByZTop(position: THREE.Vector3) {
        if (this.tween) this.tween.stop();

        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        let startFocus = new THREE.Vector3();
        let focus = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.pointCloud.ground.plane, startFocus);

        const cameraPos = this.camera.position.clone();
        let pos = new THREE.Vector3();
        // let object = selection[0];
        pos.copy(position);
        pos.z += 70;
        const tween = new TWEEN.Tween(cameraPos)
            .to(pos, 400)
            .onUpdate((obj, elapsed) => {
                if (elapsed === 1) return false;
                let action = this.getAction('orbit-control') as OrbitControlsAction;
                if (action) {
                    focus.copy(position).sub(startFocus).multiplyScalar(elapsed).add(startFocus);
                    action.control.target.copy(focus);
                    this.camera.position.copy(obj);
                    action.control.update();
                }
                this.render();
            })
            .onComplete(() => {
                this.tween = null;
            })
            .start();

        this.tween = tween;
    }
    focusPosition(position: THREE.Vector3, way: wayToFocus = 'zTop') {
        switch (way) {
            default:
            case 'zTop':
                this.focusPositionByZTop(position);
                break;
            case 'auto':
                this.focusPositionByAuto(position);
                break;
        }
    }
    focusPositionByAuto(position: THREE.Vector3) {
        if (this.tween) this.tween.stop();

        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        let startFocus = new THREE.Vector3();
        let focus = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.pointCloud.ground.plane, startFocus);

        let pos = new THREE.Vector3();
        // let object = selection[0];
        pos.copy(this.camera.position).sub(position).setLength(30).add(position);
        pos.z = Math.max(10, Math.abs(pos.z));
        // pos.z += 70;
        const tween = new TWEEN.Tween(this.camera.position)
            .to(pos, 400)
            .onUpdate((obj, elapsed) => {
                // if (elapsed === 1) return false;
                let action = this.getAction('orbit-control') as OrbitControlsAction;
                if (action) {
                    focus.copy(position).sub(startFocus).multiplyScalar(elapsed).add(startFocus);
                    action.control.target.copy(focus);
                    action.control.update();
                }
                this.render();
            })
            .onComplete(() => {
                this.tween = null;
            })
            .start();

        this.tween = tween;
    }
    updateSize() {
        let width = this.container.clientWidth || 10;
        let height = this.container.clientHeight || 10;

        if (width !== this.width || height !== this.height) {
            this.width = width;
            this.height = height;
            this.renderer.setSize(this.width, this.height);
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
        }
    }

    renderFrame() {
        // let { scene, groupPoints } = this.pointCloud;
        let { groupPoints, scene, selection, annotate3D, selectionMap } = this.pointCloud;

        this.updateSize();

        this.renderer.clear(true, true, true);

        let object3d = selection.find((item) => 
            item instanceof Box || 
            item instanceof Polyline3D || 
            item instanceof Polygon3D || 
            item instanceof Segmentation3D
        );

        // 处理选中对象的动画效果
        if (object3d && object3d.visible) {
            if (!this.isAnimating) {
                this.isAnimating = true;
                this.animationStartTime = Date.now();
                this.startAnimation();
            }
        } else {
            if (this.isAnimating) {
                this.isAnimating = false;
                this.stopAnimation();
            }
        }

        if (object3d && object3d.visible) {
            // render points
            let groupPoint = groupPoints.children[0] as THREE.Points;
            object3d.updateMatrixWorld();
            
            // Get bounding box based on object type
            let bbox: THREE.Box3;
            if (object3d instanceof Box) {
                let box = object3d as Box;
                if (!box.geometry.boundingBox) box.geometry.computeBoundingBox();
                bbox = box.geometry.boundingBox as THREE.Box3;
            } else {
                bbox = new THREE.Box3().setFromObject(object3d);
            }
            let material = groupPoint.material as PointsMaterial;

            let oldHasFilterBox = material.getUniforms('hasFilterBox');
            let oldType = material.getUniforms('boxInfo').type;
            material.setUniforms({
                hasFilterBox: 1,
                boxInfo: {
                    type: 0,
                    min: bbox.min,
                    max: bbox.max,
                    color: this.selectColor,
                    matrix: this.boxInvertMatrix.copy(object3d.matrixWorld).invert(),
                },
            });

            annotate3D.visible = false;
            this.renderer.render(scene, this.camera);

            material.setUniforms({ hasFilterBox: oldHasFilterBox, boxInfo: { type: oldType } });

            annotate3D.visible = true;
            annotate3D.children.forEach((obj) => {
                if (obj === object3d) return;
                this.renderBox(obj);
            });

            // render select
            this.renderBox(object3d, this.selectColor);
        } else {
            annotate3D.visible = false;
            this.renderer.render(scene, this.camera);
            annotate3D.visible = true;
            annotate3D.children.forEach((obj) => {
                this.renderBox(obj, selectionMap[obj.uuid] ? this.selectColor : undefined);
            });
        }

        // 总是渲染控制点组（如果存在且可见）
        const controlPointsGroup = scene.getObjectByName('PointEditControlPoints');
        if (controlPointsGroup && controlPointsGroup.visible && controlPointsGroup.children.length > 0) {
            // 优化控制点渲染顺序 - 确保它们在最后渲染但不完全遮挡选择
            controlPointsGroup.renderOrder = 998; // 稍微降低渲染顺序
            controlPointsGroup.children.forEach((child) => {
                child.renderOrder = 998; // 与组保持一致
                
                // 确保控制点材质适合当前视图
                if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
                    const material = child.material;
                    material.transparent = true;
                    material.opacity = 0.85; // 在主视图中使用稍低的不透明度
                }
            });
            
            // 分别渲染控制点，以便更好地控制渲染顺序
            this.renderer.clearDepth(); // 清除深度缓冲，确保控制点在最前面
            this.renderer.render(controlPointsGroup, this.camera);
        }
    }

    private startAnimation() {
        if (!this.isAnimating) return;
        
        this.animationFrame = requestAnimationFrame(() => {
            this.render();
            this.startAnimation();
        });
    }

    private stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
    }

    private getAnimationFactor(): number {
        if (!this.isAnimating) return 1.0;
        
        const elapsedTime = Date.now() - this.animationStartTime;
        const cycle = 2000; // 2秒完成一个周期
        const phase = (elapsedTime % cycle) / cycle;
        
        // 使用正弦函数创建平滑的呼吸效果
        return 0.8 + 0.2 * Math.sin(phase * Math.PI * 2);
    }

    renderBox(object: THREE.Object3D, color?: THREE.Color) {
        const animationFactor = this.getAnimationFactor();
        
        if (object instanceof Box) {
            let boxMaterial = object.material as THREE.LineBasicMaterial;
            const isSelected = color && color.equals(this.selectColor);

            if (object.dashed) {
                let dashedMaterial = object.dashedMaterial;
                dashedMaterial.color = color || object.color;
                if (isSelected) {
                    dashedMaterial.opacity = animationFactor;
                }
                object.material = dashedMaterial;
                this.renderer.render(object, this.camera);
                object.material = boxMaterial;
            } else {
                let oldColor = boxMaterial.color;
                let oldLinewidth = boxMaterial.linewidth;
                let oldOpacity = boxMaterial.opacity;
                let oldTransparent = boxMaterial.transparent;
                
                // 为选中对象渲染轮廓线效果
                if (isSelected) {
                    // 先渲染粗的轮廓线
                    boxMaterial.color = this.selectColor; // 使用selectColor而不是硬编码
                    boxMaterial.linewidth = 5;
                    boxMaterial.transparent = true;
                    boxMaterial.opacity = animationFactor * 0.8;
                    this.renderer.render(object, this.camera);
                    
                    // 再渲染正常的选中颜色
                    boxMaterial.color = color || object.color;
                    boxMaterial.linewidth = 3;
                    boxMaterial.opacity = animationFactor;
                    this.renderer.render(object, this.camera);
                } else {
                    boxMaterial.color = color || object.color;
                    this.renderer.render(object, this.camera);
                }
                
                // 恢复原始设置
                boxMaterial.color = oldColor;
                boxMaterial.linewidth = oldLinewidth;
                boxMaterial.opacity = oldOpacity;
                boxMaterial.transparent = oldTransparent;
            }
        } else if (object instanceof Polyline3D || object instanceof Polygon3D || object instanceof Segmentation3D) {
            const isSelected = color && color.equals(this.selectColor);
            
            // 为了与SideRenderView保持一致，简化选中效果处理
            if (isSelected) {
                if (object instanceof Polyline3D) {
                    // 直接使用selectColor，与SideRenderView保持一致
                    const originalColor = object.color.clone();
                    object.setColor(this.selectColor); // 使用统一的选中颜色（黄色）
                    const material = object.material as THREE.LineBasicMaterial;
                    const oldLinewidth = material.linewidth;
                    const oldOpacity = material.opacity;
                    const oldTransparent = material.transparent;
                    material.linewidth = 3; // 加粗线条
                    material.transparent = true;
                    material.opacity = animationFactor;
                    this.renderer.render(object, this.camera);
                    material.linewidth = oldLinewidth;
                    material.opacity = oldOpacity;
                    material.transparent = oldTransparent;
                    object.setColor(originalColor);
                } else if (object instanceof Polygon3D) {
                    // 直接使用selectColor，与SideRenderView保持一致
                    const originalColor = object.color.clone();
                    object.setColor(this.selectColor); // 使用统一的选中颜色（黄色）
                    const material = object.wireframe.material as THREE.LineBasicMaterial;
                    const oldLinewidth = material.linewidth;
                    const oldOpacity = material.opacity;
                    const oldTransparent = material.transparent;
                    material.linewidth = 4; // 加粗线条
                    material.transparent = true;
                    material.opacity = animationFactor;
                    this.renderer.render(object, this.camera);
                    material.linewidth = oldLinewidth;
                    material.opacity = oldOpacity;
                    material.transparent = oldTransparent;
                    object.setColor(originalColor);
                } else if (object instanceof Segmentation3D) {
                    // 点云对象的选中效果
                    const material = object.material as THREE.PointsMaterial;
                    const oldSize = material.size;
                    const oldColor = material.color.clone();
                    const oldOpacity = material.opacity;
                    const oldTransparent = material.transparent;
                    material.color = this.selectColor; // 使用统一的选中颜色（黄色）
                    material.size = oldSize * 1.5; // 增大点的大小
                    material.transparent = true;
                    material.opacity = animationFactor;
                    this.renderer.render(object, this.camera);
                    material.size = oldSize;
                    material.color = oldColor;
                    material.opacity = oldOpacity;
                    material.transparent = oldTransparent;
                }
            } else {
                // 非选中状态，正常渲染
                if (color) {
                    // Temporarily store original color
                    const originalColor = object.color.clone();
                    object.setColor(color);
                    this.renderer.render(object, this.camera);
                    // Restore original color
                    object.setColor(originalColor);
                } else {
                    this.renderer.render(object, this.camera);
                }
            }
        } else {
            // Fallback for unknown object types
            this.renderer.render(object, this.camera);
        }
    }

    setBackgroundColor(backgroundColor: THREE.Color) {
        this.backgroundColor = backgroundColor;
        this.renderer.setClearColor(this.backgroundColor);
        this.render();
    }

    dispose() {
        this.stopAnimation();
        // 清理其他资源
        this.renderer.dispose();
        this.raycaster = null as any;
        this.tween?.stop();
        this.tween = null;
    }
}
