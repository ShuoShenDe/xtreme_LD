import * as THREE from 'three';
import { get } from '../utils/tempVar';
import { AnnotateType } from '../type';
import { ObjectType } from 'pc-editor';
import { 
    raycastLineSegment, 
    getLineSelectionThreshold, 
    getAdaptiveLineSelectionThreshold,
    setupCommonRaycast, 
    addIntersectionResult,
    SELECTION_CONFIG
} from '../utils/raycast';

let defaultMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
    linewidth: 2,
});

let highlightMaterial = new THREE.LineBasicMaterial({
    color: 0xff6600,
    toneMapped: false,
    linewidth: 3,
});

interface IEditConfig {
    resize: boolean;
    addPoint: boolean;
    removePoint: boolean;
}

export default class Polyline3D extends THREE.Line {
    dashed: boolean = false;
    annotateType: AnnotateType;
    editConfig: IEditConfig = { resize: true, addPoint: true, removePoint: true };
    color: THREE.Color;
    objectType = ObjectType.TYPE_3D_POLYLINE;
    private _points: THREE.Vector3[] = [];
    private _closed: boolean = false;

    constructor(points: THREE.Vector3[] = [], closed: boolean = false) {
        const geometry = new THREE.BufferGeometry();
        super(geometry, defaultMaterial.clone());

        this.type = 'Polyline3DHelper';
        this.annotateType = AnnotateType.ANNOTATE_3D;
        this.color = new THREE.Color(0xffffff);
        this._points = [...points];
        this._closed = closed;
        this.updateGeometry();
        
        // Set initial material color
        if (this.material instanceof THREE.LineBasicMaterial) {
            this.material.color.copy(this.color);
        }
    }

    get points(): THREE.Vector3[] {
        return this._points;
    }

    set points(value: THREE.Vector3[]) {
        this._points = [...value];
        this.updateGeometry();
    }

    get closed(): boolean {
        return this._closed;
    }

    set closed(value: boolean) {
        this._closed = value;
        this.updateGeometry();
    }

    addPoint(point: THREE.Vector3, index?: number) {
        if (index !== undefined && index >= 0 && index <= this._points.length) {
            this._points.splice(index, 0, point);
        } else {
            this._points.push(point);
        }
        this.updateGeometry();
    }

    removePoint(index: number) {
        if (index >= 0 && index < this._points.length) {
            this._points.splice(index, 1);
            this.updateGeometry();
        }
    }

    updatePoint(index: number, point: THREE.Vector3) {
        if (index >= 0 && index < this._points.length) {
            this._points[index].copy(point);
            this.updateGeometry();
        }
    }

    private updateGeometry() {
        if (this._points.length < 2) {
            // Empty geometry for less than 2 points
            this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            this.geometry.setIndex(null);
            return;
        }

        // For THREE.Line, we use setFromPoints which creates a continuous line
        let points = [...this._points];
        
        // Close the polyline if needed
        if (this._closed && this._points.length > 2) {
            points.push(this._points[0]);
        }

        this.geometry.setFromPoints(points);
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
    }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        if (!this.visible || this._points.length < 2) return;

        // First try Three.js built-in raycast for Line
        const originalIntersects = intersects.slice();
        super.raycast(raycaster, intersects);
        
        // If built-in raycast found intersections, we're done
        if (intersects.length > originalIntersects.length) {
            return;
        }

        // Otherwise, fall back to our custom raycast
        const raycastSetup = setupCommonRaycast(this, raycaster);
        if (!raycastSetup) return;

        // Use a larger threshold for better selection
        // Try to get camera from raycaster userData (if available)
        const camera = (raycaster as any).camera;
        const threshold = camera ? 
            getAdaptiveLineSelectionThreshold(raycaster, camera, this, SELECTION_CONFIG.THRESHOLDS.POLYLINE_MULTIPLIER) :
            getLineSelectionThreshold(raycaster, SELECTION_CONFIG.THRESHOLDS.POLYLINE_MULTIPLIER);
        let minDistance = Infinity;
        let closestIntersection: { point: THREE.Vector3; distance: number } | null = null;

        // Check all line segments directly without creating temporary arrays
        for (let i = 0; i < this._points.length - 1; i++) {
            const intersection = raycastLineSegment(raycastSetup.ray, this._points[i], this._points[i + 1], threshold);
            if (intersection && intersection.distance < minDistance) {
                minDistance = intersection.distance;
                closestIntersection = intersection;
            }
        }
        
        // Add closing segment if closed
        if (this._closed && this._points.length > 2) {
            const intersection = raycastLineSegment(
                raycastSetup.ray, 
                this._points[this._points.length - 1], 
                this._points[0], 
                threshold
            );
            if (intersection && intersection.distance < minDistance) {
                minDistance = intersection.distance;
                closestIntersection = intersection;
            }
        }

        if (closestIntersection) {
            addIntersectionResult(intersects, this, closestIntersection.point, raycastSetup.matrixWorld, raycaster);
        }
    }



    // Get polyline data for saving/loading
    getPolylineData() {
        return {
            points: this._points.map(p => p.clone()),
            closed: this._closed,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            scale: this.scale.clone()
        };
    }

    // Set polyline from saved data
    setPolylineData(data: {
        points: THREE.Vector3[];
        closed?: boolean;
        position?: THREE.Vector3;
        rotation?: THREE.Euler;
        scale?: THREE.Vector3;
    }) {
        this._points = data.points.map(p => p.clone());
        this._closed = data.closed || false;
        if (data.position) this.position.copy(data.position);
        if (data.rotation) this.rotation.copy(data.rotation);
        if (data.scale) this.scale.copy(data.scale);
        this.updateGeometry();
    }

    // Get total length of the polyline
    getLength(): number {
        let totalLength = 0;
        for (let i = 0; i < this._points.length - 1; i++) {
            totalLength += this._points[i].distanceTo(this._points[i + 1]);
        }
        if (this._closed && this._points.length > 2) {
            totalLength += this._points[this._points.length - 1].distanceTo(this._points[0]);
        }
        return totalLength;
    }

    // Set color of the polyline
    setColor(color: THREE.Color) {
        this.color.copy(color);
        // Update material color if needed
        if (this.material instanceof THREE.LineBasicMaterial) {
            this.material.color.copy(color);
        }
    }

    // Highlight the polyline
    highlight(enabled: boolean) {
        if (enabled) {
            this.material = highlightMaterial;
        } else {
            // Create a new material with the current color
            const mat = defaultMaterial.clone();
            mat.color.copy(this.color);
            this.material = mat;
        }
    }
} 