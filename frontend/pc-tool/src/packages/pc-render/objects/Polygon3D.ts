import * as THREE from 'three';
import { 
    raycastLineSegment, 
    getLineSelectionThreshold, 
    addIntersectionResult,
    getAdaptiveLineSelectionThreshold,
    SELECTION_CONFIG
} from '../utils/raycast';

/**
 * 3D Polygon annotation object
 * Extends THREE.Group to contain both wireframe and filled mesh
 */
export default class Polygon3D extends THREE.Group {
    public points: THREE.Vector3[] = [];
    public wireframe: THREE.LineLoop;
    public mesh: THREE.Mesh | null = null;
    public color: THREE.Color = new THREE.Color(0x00ff00);
    public filled: boolean = false;
    public isHighlighted: boolean = false;
    
    // Materials
    private lineMaterial: THREE.LineBasicMaterial;
    private fillMaterial: THREE.MeshBasicMaterial;
    private highlightMaterial: THREE.LineBasicMaterial;

    constructor(points: THREE.Vector3[] = []) {
        super();
        
        this.name = 'Polygon3D';
        this.points = [...points];
        
        // Initialize materials
        this.lineMaterial = new THREE.LineBasicMaterial({ 
            color: this.color,
            linewidth: 2
        });
        
        this.fillMaterial = new THREE.MeshBasicMaterial({ 
            color: this.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.highlightMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffff00,
            linewidth: 4
        });
        
        // Create wireframe
        const wireframeGeometry = new THREE.BufferGeometry();
        this.wireframe = new THREE.LineLoop(
            wireframeGeometry,
            this.lineMaterial
        );
        this.add(this.wireframe);
        
        // Update geometry
        this.updateGeometry();
    }

    /**
     * Add a point to the polygon
     */
    addPoint(point: THREE.Vector3): void {
        this.points.push(point.clone());
        this.updateGeometry();
    }

    /**
     * Remove a point by index
     */
    removePoint(index: number): boolean {
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
            this.updateGeometry();
            return true;
        }
        return false;
    }

    /**
     * Update a point at specific index
     */
    updatePoint(index: number, point: THREE.Vector3): boolean {
        if (index >= 0 && index < this.points.length) {
            this.points[index].copy(point);
            this.updateGeometry();
            return true;
        }
        return false;
    }

    /**
     * Set all points at once
     */
    setPoints(points: THREE.Vector3[]): void {
        this.points = points.map(p => p.clone());
        this.updateGeometry();
    }

    /**
     * Toggle between wireframe and filled mode
     */
    setFilled(filled: boolean): void {
        this.filled = filled;
        this.updateGeometry();
    }

    /**
     * Update the geometry based on current points
     */
    private updateGeometry(): void {
        if (this.points.length < 3) {
            // Not enough points for a polygon
            this.wireframe.geometry.setFromPoints([]);
            if (this.mesh) {
                this.remove(this.mesh);
                this.mesh = null;
            }
            return;
        }

        // Update wireframe
        this.wireframe.geometry.setFromPoints(this.points);

        // Update or create filled mesh if needed
        if (this.filled) {
            this.createFilledMesh();
        } else if (this.mesh) {
            this.remove(this.mesh);
            this.mesh = null;
        }
    }

    /**
     * Create a filled mesh using triangulation
     */
    private createFilledMesh(): void {
        if (this.points.length < 3) return;

        // Remove existing mesh
        if (this.mesh) {
            this.remove(this.mesh);
        }

        // Simple fan triangulation for convex polygons
        const vertices: number[] = [];
        const indices: number[] = [];

        // Add vertices
        this.points.forEach(point => {
            vertices.push(point.x, point.y, point.z);
        });

        // Create triangles using fan method
        for (let i = 1; i < this.points.length - 1; i++) {
            indices.push(0, i, i + 1);
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints(this.points);
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.fillMaterial);
        this.add(this.mesh);
    }

    /**
     * Calculate polygon area (assuming points are coplanar)
     */
    getArea(): number {
        if (this.points.length < 3) return 0;

        let area = 0;
        const n = this.points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const cross = new THREE.Vector3().crossVectors(
                this.points[i],
                this.points[j]
            );
            area += cross.length();
        }
        
        return area / 2;
    }

    /**
     * Calculate polygon perimeter
     */
    getPerimeter(): number {
        if (this.points.length < 2) return 0;

        let perimeter = 0;
        for (let i = 0; i < this.points.length; i++) {
            const nextIndex = (i + 1) % this.points.length;
            perimeter += this.points[i].distanceTo(this.points[nextIndex]);
        }
        
        return perimeter;
    }

    /**
     * Calculate polygon centroid
     */
    getCentroid(): THREE.Vector3 {
        if (this.points.length === 0) return new THREE.Vector3();

        const centroid = new THREE.Vector3();
        this.points.forEach(point => centroid.add(point));
        centroid.divideScalar(this.points.length);
        
        return centroid;
    }

    /**
     * Check if polygon is convex
     */
    isConvex(): boolean {
        if (this.points.length < 3) return false;
        if (this.points.length === 3) return true;

        let sign = 0;
        const n = this.points.length;

        for (let i = 0; i < n; i++) {
            const p1 = this.points[i];
            const p2 = this.points[(i + 1) % n];
            const p3 = this.points[(i + 2) % n];

            const v1 = new THREE.Vector3().subVectors(p2, p1);
            const v2 = new THREE.Vector3().subVectors(p3, p2);
            const cross = v1.cross(v2);
            const crossSign = Math.sign(cross.z); // Assuming polygon is in XY plane

            if (crossSign !== 0) {
                if (sign === 0) {
                    sign = crossSign;
                } else if (sign !== crossSign) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Set highlight state
     */
    setHighlight(highlighted: boolean): void {
        this.isHighlighted = highlighted;
        this.wireframe.material = highlighted ? this.highlightMaterial : this.lineMaterial;
    }

    /**
     * Update color
     */
    setColor(color: THREE.Color | string | number): void {
        if (typeof color === 'string' || typeof color === 'number') {
            this.color.set(color);
        } else {
            this.color.copy(color);
        }
        
        this.lineMaterial.color.copy(this.color);
        this.fillMaterial.color.copy(this.color);
    }

    /**
     * Get polygon data for serialization
     */
    getPolygonData() {
        return {
            points: this.points.map(p => ({ x: p.x, y: p.y, z: p.z })),
            filled: this.filled,
            color: this.color.getHex(),
            area: this.getArea(),
            perimeter: this.getPerimeter(),
            centroid: {
                x: this.getCentroid().x,
                y: this.getCentroid().y,
                z: this.getCentroid().z
            }
        };
    }

    /**
     * Set polygon data from serialized data
     */
    setPolygonData(data: any): void {
        if (data.points && Array.isArray(data.points)) {
            this.points = data.points.map((p: any) => new THREE.Vector3(p.x, p.y, p.z));
        }
        if (typeof data.filled === 'boolean') {
            this.filled = data.filled;
        }
        if (data.color !== undefined) {
            this.setColor(data.color);
        }
        this.updateGeometry();
    }

    /**
     * Custom raycast for interaction
     */
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
        if (!this.visible || this.points.length < 3) return;

        // 确保matrixWorld是最新的
        this.updateMatrixWorld();

        // Use temporary array for THREE.js intersections
        const tempIntersects: THREE.Intersection[] = [];
        
        // Let the wireframe handle raycasting first
        this.wireframe.raycast(raycaster, tempIntersects);
        
        // Also check mesh if it exists
        if (this.mesh) {
            this.mesh.raycast(raycaster, tempIntersects);
        }
        
        // 始终尝试手动polygon检查，提高选择成功率
        this.raycastPolygon(raycaster, intersects);
        
        // 如果wireframe/mesh也有交点，添加它们
        if (tempIntersects.length > 0) {
            tempIntersects.forEach(intersection => {
                // Calculate accurate world distance
                const worldPoint = intersection.point.clone();
                const distance = raycaster.ray.origin.distanceTo(worldPoint);
                
                intersects.push({
                    object: this,
                    distance: distance,
                    point: worldPoint,
                    face: intersection.face || null,
                    faceIndex: intersection.faceIndex || -1,
                    uv: intersection.uv || new THREE.Vector2()
                });
            });
        }
    }

    /**
     * Manual polygon raycast as fallback
     */
    private raycastPolygon(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void {
        try {
            const matrixWorld = this.matrixWorld;
            
            // Try to get camera from raycaster userData (if available)
            const camera = (raycaster as any).camera;
            const threshold = camera ? 
                getAdaptiveLineSelectionThreshold(raycaster, camera, this, SELECTION_CONFIG.THRESHOLDS.POLYGON_MULTIPLIER) :
                getLineSelectionThreshold(raycaster, SELECTION_CONFIG.THRESHOLDS.POLYGON_MULTIPLIER);

            // Transform ray to local space
            const _inverseMatrix = new THREE.Matrix4().copy(matrixWorld).invert();
            const _ray = raycaster.ray.clone().applyMatrix4(_inverseMatrix);

            // First check intersection with polygon edges
            let minDistance = Infinity;
            let closestIntersection: { point: THREE.Vector3; distance: number } | null = null;

            // 检查所有边缘
            for (let i = 0; i < this.points.length; i++) {
                const start = this.points[i];
                const end = this.points[(i + 1) % this.points.length];
                
                const intersection = raycastLineSegment(_ray, start, end, threshold);
                if (intersection && intersection.distance < minDistance) {
                    minDistance = intersection.distance;
                    closestIntersection = intersection;
                }
            }

            // Also check if ray intersects with polygon interior (plane intersection)
            if (!closestIntersection && this.points.length >= 3) {
                const planeIntersection = this.checkPlaneIntersection(_ray);
                if (planeIntersection && planeIntersection.distance < minDistance) {
                    closestIntersection = planeIntersection;
                }
            }

            // 即使没有找到精确交点，也尝试使用更大的阈值
            if (!closestIntersection) {
                const largerThreshold = threshold * 3; // 使用3倍阈值
                for (let i = 0; i < this.points.length; i++) {
                    const start = this.points[i];
                    const end = this.points[(i + 1) % this.points.length];
                    
                    const intersection = raycastLineSegment(_ray, start, end, largerThreshold);
                    if (intersection && intersection.distance < minDistance) {
                        minDistance = intersection.distance;
                        closestIntersection = intersection;
                    }
                }
            }

            if (closestIntersection) {
                addIntersectionResult(intersects, this, closestIntersection.point, matrixWorld, raycaster);
            }
        } catch (error) {
            console.warn('Error in polygon raycast:', error);
        }
    }

    /**
     * Check if ray intersects with polygon plane and if the intersection point is inside the polygon
     */
    private checkPlaneIntersection(ray: THREE.Ray): { point: THREE.Vector3; distance: number } | null {
        if (this.points.length < 3) return null;

        // Create plane from first three points
        const v1 = this.points[0];
        const v2 = this.points[1];
        const v3 = this.points[2];
        
        const plane = new THREE.Plane();
        plane.setFromCoplanarPoints(v1, v2, v3);
        
        const intersectionPoint = new THREE.Vector3();
        const intersection = ray.intersectPlane(plane, intersectionPoint);
        
        if (!intersection) return null;
        
        // Check if intersection point is inside polygon using ray casting algorithm
        if (this.isPointInPolygon(intersectionPoint)) {
            const distance = ray.origin.distanceTo(intersectionPoint);
            return { point: intersectionPoint, distance };
        }
        
        return null;
    }

    /**
     * Check if a point is inside the polygon using ray casting algorithm
     */
    private isPointInPolygon(point: THREE.Vector3): boolean {
        let inside = false;
        const n = this.points.length;
        
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = this.points[i].x, yi = this.points[i].z;
            const xj = this.points[j].x, yj = this.points[j].z;
            
            if (((yi > point.z) !== (yj > point.z)) &&
                (point.x < (xj - xi) * (point.z - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }


    /**
     * Dispose of resources
     */
    dispose(): void {
        this.wireframe.geometry.dispose();
        this.lineMaterial.dispose();
        this.fillMaterial.dispose();
        this.highlightMaterial.dispose();
        
        if (this.mesh) {
            this.mesh.geometry.dispose();
        }
    }
} 