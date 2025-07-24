import * as THREE from 'three';
import { get } from '../utils/tempVar';
import { AnnotateType } from '../type';
import { ObjectType } from 'pc-editor';
import { getPointsSelectionThreshold } from '../utils/raycast';

let defaultMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: true,
});

let highlightMaterial = new THREE.PointsMaterial({
    color: 0xff6600,
    size: 3,
    sizeAttenuation: true,
});

interface IEditConfig {
    resize: boolean;
    addPoints: boolean;
    removePoints: boolean;
    brush: boolean;
}

export default class Segmentation3D extends THREE.Points {
    dashed: boolean = false;
    annotateType: AnnotateType;
    editConfig: IEditConfig = { resize: true, addPoints: true, removePoints: true, brush: true };
    color: THREE.Color;
    objectType = ObjectType.TYPE_3D_SEGMENTATION;
    private _points: THREE.Vector3[] = [];
    private _colors: THREE.Color[] = [];
    private _indices: Set<number> = new Set();
    private _sourcePointCloud: THREE.Points | null = null;
    private _brushRadius: number = 1.0;

    constructor(points: THREE.Vector3[] = [], indices: number[] = []) {
        const geometry = new THREE.BufferGeometry();
        super(geometry, defaultMaterial);

        this.type = 'Segmentation3DHelper';
        this.annotateType = AnnotateType.ANNOTATE_3D;
        this.color = new THREE.Color(0xffffff);
        this._points = [...points];
        this._indices = new Set(indices);
        this._colors = points.map(() => this.color.clone());
        this.updateGeometry();
    }

    get points(): THREE.Vector3[] {
        return this._points;
    }

    set points(value: THREE.Vector3[]) {
        this._points = [...value];
        this._colors = value.map(() => this.color.clone());
        this.updateGeometry();
    }

    get indices(): number[] {
        return Array.from(this._indices);
    }

    set indices(value: number[]) {
        this._indices = new Set(value);
        this.updateGeometry();
    }

    get brushRadius(): number {
        return this._brushRadius;
    }

    set brushRadius(value: number) {
        this._brushRadius = Math.max(0.1, value);
    }

    get sourcePointCloud(): THREE.Points | null {
        return this._sourcePointCloud;
    }

    set sourcePointCloud(pointCloud: THREE.Points | null) {
        this._sourcePointCloud = pointCloud;
        if (pointCloud) {
            this.extractPointsFromSource();
        }
    }

    private extractPointsFromSource() {
        if (!this._sourcePointCloud) return;

        const sourceGeometry = this._sourcePointCloud.geometry;
        const positions = sourceGeometry.attributes.position;
        
        this._points = [];
        for (const index of this._indices) {
            if (index < positions.count) {
                const x = positions.getX(index);
                const y = positions.getY(index);
                const z = positions.getZ(index);
                this._points.push(new THREE.Vector3(x, y, z));
            }
        }
        
        this._colors = this._points.map(() => this.color.clone());
        this.updateGeometry();
    }

    addPoint(point: THREE.Vector3, pointIndex?: number) {
        this._points.push(point);
        this._colors.push(this.color.clone());
        if (pointIndex !== undefined) {
            this._indices.add(pointIndex);
        }
        this.updateGeometry();
    }

    addPointsInRadius(center: THREE.Vector3, radius: number = this._brushRadius) {
        if (!this._sourcePointCloud) return;

        const sourceGeometry = this._sourcePointCloud.geometry;
        const positions = sourceGeometry.attributes.position;
        let addedCount = 0;

        for (let i = 0; i < positions.count; i++) {
            if (this._indices.has(i)) continue;

            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            const point = new THREE.Vector3(x, y, z);

            if (point.distanceTo(center) <= radius) {
                this._points.push(point);
                this._colors.push(this.color.clone());
                this._indices.add(i);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            this.updateGeometry();
        }
        return addedCount;
    }

    removePointsInRadius(center: THREE.Vector3, radius: number = this._brushRadius) {
        const indicesToRemove: number[] = [];
        
        this._points.forEach((point, index) => {
            if (point.distanceTo(center) <= radius) {
                indicesToRemove.push(index);
            }
        });

        // Remove in reverse order to maintain indices
        indicesToRemove.reverse().forEach(index => {
            this._points.splice(index, 1);
            this._colors.splice(index, 1);
        });

        // Update source indices
        if (this._sourcePointCloud) {
            const sourceGeometry = this._sourcePointCloud.geometry;
            const positions = sourceGeometry.attributes.position;
            
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const z = positions.getZ(i);
                const point = new THREE.Vector3(x, y, z);

                if (point.distanceTo(center) <= radius) {
                    this._indices.delete(i);
                }
            }
        }

        if (indicesToRemove.length > 0) {
            this.updateGeometry();
        }
        return indicesToRemove.length;
    }

    removePoint(index: number) {
        if (index >= 0 && index < this._points.length) {
            this._points.splice(index, 1);
            this._colors.splice(index, 1);
            this.updateGeometry();
        }
    }

    clearSegmentation() {
        this._points = [];
        this._colors = [];
        this._indices.clear();
        this.updateGeometry();
    }

    private updateGeometry() {
        if (this._points.length === 0) {
            this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            this.geometry.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            return;
        }

        const positions: number[] = [];
        const colors: number[] = [];

        this._points.forEach((point, index) => {
            positions.push(point.x, point.y, point.z);
            const color = this._colors[index] || this.color;
            colors.push(color.r, color.g, color.b);
        });

        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();

        // Enable vertex colors
        (this.material as THREE.PointsMaterial).vertexColors = true;
    }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        if (!this.visible || this._points.length === 0) return;

        const geometry = this.geometry;
        const matrixWorld = this.matrixWorld;

        let _sphere = get(THREE.Sphere, 0);
        if (geometry.boundingSphere) {
            _sphere.copy(geometry.boundingSphere);
            _sphere.applyMatrix4(matrixWorld);

            if (raycaster.ray.intersectsSphere(_sphere) === false) return;
        }

        // Check intersection with individual points
        const threshold = getPointsSelectionThreshold(raycaster);
        let minDistance = Infinity;
        let closestPoint: THREE.Vector3 | null = null;
        let closestRayT = 0;

        this._points.forEach(point => {
            const worldPoint = point.clone().applyMatrix4(matrixWorld);
            const distance = raycaster.ray.distanceToPoint(worldPoint);
            
            if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                closestPoint = worldPoint;
                
                // Calculate parameter t for ray distance
                const rayDirection = raycaster.ray.direction.clone().normalize();
                const rayToPoint = worldPoint.clone().sub(raycaster.ray.origin);
                closestRayT = Math.max(0, rayToPoint.dot(rayDirection));
            }
        });

        if (closestPoint && closestRayT > 0) {
            intersects.push({ 
                object: this, 
                distance: closestRayT, 
                point: closestPoint,
                face: null,
                faceIndex: -1,
                uv: new THREE.Vector2()
            });
        }
    }

    // Get segmentation data for saving/loading
    getSegmentationData() {
        return {
            points: this._points.map(p => p.clone()),
            indices: Array.from(this._indices),
            colors: this._colors.map(c => ({ r: c.r, g: c.g, b: c.b })),
            brushRadius: this._brushRadius,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            scale: this.scale.clone()
        };
    }

    // Set segmentation from saved data
    setSegmentationData(data: {
        points?: THREE.Vector3[];
        indices?: number[];
        colors?: { r: number; g: number; b: number }[];
        brushRadius?: number;
        position?: THREE.Vector3;
        rotation?: THREE.Euler;
        scale?: THREE.Vector3;
    }) {
        if (data.points) this._points = data.points.map(p => p.clone());
        if (data.indices) this._indices = new Set(data.indices);
        if (data.colors) {
            this._colors = data.colors.map(c => new THREE.Color(c.r, c.g, c.b));
        }
        if (data.brushRadius) this._brushRadius = data.brushRadius;
        if (data.position) this.position.copy(data.position);
        if (data.rotation) this.rotation.copy(data.rotation);
        if (data.scale) this.scale.copy(data.scale);
        this.updateGeometry();
    }

    // Get statistics
    getStats() {
        return {
            pointCount: this._points.length,
            indexCount: this._indices.size,
            brushRadius: this._brushRadius,
            boundingBox: this.geometry.boundingBox,
            boundingSphere: this.geometry.boundingSphere
        };
    }

    // Set uniform color for all points
    setColor(color: THREE.Color) {
        this.color = color.clone();
        this._colors = this._points.map(() => color.clone());
        this.updateGeometry();
    }

    // Set color for specific point
    setPointColor(index: number, color: THREE.Color) {
        if (index >= 0 && index < this._colors.length) {
            this._colors[index] = color.clone();
            this.updateGeometry();
        }
    }

    // Highlight the segmentation
    highlight(enabled: boolean) {
        this.material = enabled ? highlightMaterial : defaultMaterial;
    }

    // Get density (points per volume)
    getDensity(): number {
        if (!this.geometry.boundingBox || this._points.length === 0) return 0;
        
        const box = this.geometry.boundingBox;
        const volume = box.getSize(new THREE.Vector3()).x * 
                      box.getSize(new THREE.Vector3()).y * 
                      box.getSize(new THREE.Vector3()).z;
        
        return volume > 0 ? this._points.length / volume : 0;
    }

    // Smooth segmentation by removing outliers
    smoothSegmentation(threshold: number = 2.0) {
        if (this._points.length < 3) return;

        const indicesToRemove: number[] = [];
        
        this._points.forEach((point, index) => {
            let neighborCount = 0;
            this._points.forEach((otherPoint, otherIndex) => {
                if (index !== otherIndex && point.distanceTo(otherPoint) <= threshold) {
                    neighborCount++;
                }
            });
            
            // Remove isolated points
            if (neighborCount < 2) {
                indicesToRemove.push(index);
            }
        });

        // Remove in reverse order
        indicesToRemove.reverse().forEach(index => {
            this._points.splice(index, 1);
            this._colors.splice(index, 1);
        });

        if (indicesToRemove.length > 0) {
            this.updateGeometry();
        }
        
        return indicesToRemove.length;
    }
} 