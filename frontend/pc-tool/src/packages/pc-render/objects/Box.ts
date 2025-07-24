import * as THREE from 'three';
import { get } from '../utils/tempVar';
import { AnnotateType } from '../type';
import { ObjectType } from 'pc-editor';
import { 
    raycastLineSegment, 
    getAdaptiveLineSelectionThreshold, 
    getLineSelectionThreshold, 
    setupCommonRaycast, 
    addIntersectionResult,
    SELECTION_CONFIG 
} from '../utils/raycast';

let defaultMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
});

let dashedMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    linewidth: 1,
    scale: 1,
    dashSize: 0.1,
    gapSize: 0.1,
});
// defaultMaterial.depthTest = false;

let { indices, positions, lineDistance } = getBoxInfo();
const emptyGeometry = new THREE.BufferGeometry();
emptyGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));

const defaultGeometry = new THREE.BufferGeometry();
defaultGeometry.setIndex(new THREE.Uint16BufferAttribute(indices, 1));
defaultGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
defaultGeometry.setAttribute('lineDistance', new THREE.Float32BufferAttribute(lineDistance, 1));
defaultGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 0.8660254037844386);
defaultGeometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
);

interface IEditConfig {
    resize: boolean;
}

export default class Box extends THREE.LineSegments {
    // object: THREE.Box3;
    dashed: boolean = false;
    dashedMaterial: THREE.LineDashedMaterial = dashedMaterial;
    annotateType: AnnotateType;
    editConfig: IEditConfig = { resize: true };
    color: THREE.Color;
    objectType = ObjectType.TYPE_3D_BOX;
    constructor() {
        super(defaultGeometry, defaultMaterial);

        this.type = 'Box3Helper';
        // EMPTY
        this.annotateType = AnnotateType.ANNOTATE_3D;
        this.color = new THREE.Color();
    }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        if (!this.visible) return;

        let geometry = this.geometry;
        const matrixWorld = this.matrixWorld;

        // Standard bounding sphere check (not expanded)
        let _sphere = get(THREE.Sphere, 0).copy(geometry.boundingSphere as any);
        _sphere.applyMatrix4(matrixWorld);

        if (raycaster.ray.intersectsSphere(_sphere) === false) return;

        let _inverseMatrix = get(THREE.Matrix4, 0).copy(matrixWorld).invert();
        let _ray = get(THREE.Ray, 0).copy(raycaster.ray).applyMatrix4(_inverseMatrix);

        if (geometry.boundingBox === null) geometry.computeBoundingBox();

        if (_ray.intersectsBox(geometry.boundingBox as any) === false) return;
        
        // Enhanced selection logic - try precise edge detection first
        const camera = (raycaster as any).camera;
        if (camera) {
            const preciseResult = this.preciseRaycast(raycaster, camera, matrixWorld);
            if (preciseResult) {
                intersects.push({
                    object: this,
                    distance: preciseResult.distance,
                    point: preciseResult.point,
                    face: null,
                    faceIndex: -1,
                    uv: new THREE.Vector2()
                });
                return;
            }
        }
        
        // Fallback to original implementation only if we passed the basic checks
        let pos = get(THREE.Vector3, 0).set(0, 0, 0).applyMatrix4(matrixWorld);
        let distance = pos.distanceTo(raycaster.ray.origin);
        intersects.push({ 
            object: this, 
            distance, 
            point: pos,
            face: null,
            faceIndex: -1,
            uv: new THREE.Vector2()
        });
    }



    /**
     * Enhanced raycast with precise edge detection
     */
    private preciseRaycast(raycaster: THREE.Raycaster, camera: THREE.Camera, matrixWorld: THREE.Matrix4): { point: THREE.Vector3; distance: number } | null {
        try {
            const geometry = this.geometry;
            if (geometry.boundingBox === null) geometry.computeBoundingBox();
            
            const bbox = geometry.boundingBox as THREE.Box3;
            if (!bbox) return null;

            // Transform ray to local space
            let _inverseMatrix = get(THREE.Matrix4, 0).copy(matrixWorld).invert();
            let _ray = get(THREE.Ray, 0).copy(raycaster.ray).applyMatrix4(_inverseMatrix);

            // Use moderately increased threshold for boxes
            const baseThreshold = getLineSelectionThreshold(raycaster, 1.0);
            const adaptiveThreshold = camera ? 
                getAdaptiveLineSelectionThreshold(raycaster, camera, this, 1.5) : 
                baseThreshold;
            
            // Use slightly larger threshold, but not too large
            const threshold = Math.max(adaptiveThreshold, baseThreshold * 1.5);
            
            // Create the 12 edges of the bounding box
            const edges = this.getBoxEdges(bbox);
            
            let minDistance = Infinity;
            let closestIntersection: { point: THREE.Vector3; distance: number } | null = null;

            // Check raycast against all edges of the box
            for (let i = 0; i < edges.length; i++) {
                const edge = edges[i];
                const intersection = raycastLineSegment(
                    _ray, 
                    edge.start, 
                    edge.end, 
                    threshold
                );
                
                if (intersection && intersection.distance < minDistance) {
                    minDistance = intersection.distance;
                    closestIntersection = intersection;
                }
            }

            if (closestIntersection) {
                // Transform point back to world space
                const worldPoint = closestIntersection.point.clone().applyMatrix4(matrixWorld);
                return {
                    point: worldPoint,
                    distance: raycaster.ray.origin.distanceTo(worldPoint)
                };
            }
            
            return null;
        } catch (error) {
            console.warn('Precise raycast failed for box, error:', error);
            return null;
        }
    }

    /**
     * Get the 12 edges of the bounding box
     */
    private getBoxEdges(bbox: THREE.Box3): Array<{start: THREE.Vector3, end: THREE.Vector3}> {
        const { min, max } = bbox;
        
        // 8 corners of the box
        const corners = [
            new THREE.Vector3(min.x, min.y, min.z), // 0: min corner
            new THREE.Vector3(max.x, min.y, min.z), // 1
            new THREE.Vector3(max.x, max.y, min.z), // 2
            new THREE.Vector3(min.x, max.y, min.z), // 3
            new THREE.Vector3(min.x, min.y, max.z), // 4
            new THREE.Vector3(max.x, min.y, max.z), // 5
            new THREE.Vector3(max.x, max.y, max.z), // 6: max corner
            new THREE.Vector3(min.x, max.y, max.z), // 7
        ];

        // 12 edges connecting the corners
        const edges = [
            // Bottom face (z = min.z)
            { start: corners[0], end: corners[1] },
            { start: corners[1], end: corners[2] },
            { start: corners[2], end: corners[3] },
            { start: corners[3], end: corners[0] },
            
            // Top face (z = max.z)
            { start: corners[4], end: corners[5] },
            { start: corners[5], end: corners[6] },
            { start: corners[6], end: corners[7] },
            { start: corners[7], end: corners[4] },
            
            // Vertical edges
            { start: corners[0], end: corners[4] },
            { start: corners[1], end: corners[5] },
            { start: corners[2], end: corners[6] },
            { start: corners[3], end: corners[7] },
        ];

        return edges;
    }
}

function getBoxInfo() {
    const arrowLen = 0.4;
    const arrowWidth = 0.15;
    const dirStartX = 0.25;
    const dirEndX = 1.0 + arrowLen;
    const indices = [
        // box index  +z
        0, 1, 1, 2, 2, 3, 3, 0,
        // box index  -z
        4, 5, 5, 6, 6, 7, 7, 4,
        // box line
        0, 4, 1, 5, 2, 6, 3, 7,
        //  line
        8, 9,
        // arrow
        9, 10, 10, 11, 11, 9, 9, 12, 13, 12, 13, 9,
    ];

    const lineDistance = [
        // box index  +z
        0, 1, 2, 1,
        // box index  -z
        1, 2, 3, 2,
        //  line
        0, 2,
        // arrow
        0.2, 0.2, 0.2, 0.2,
    ];

    const positions = [
        // box points +z
        1,
        1,
        1,
        -1,
        1,
        1,
        -1,
        -1,
        1,
        1,
        -1,
        1,
        // box points -z
        1,
        1,
        -1,
        -1,
        1,
        -1,
        -1,
        -1,
        -1,
        1,
        -1,
        -1,
        // line
        dirStartX,
        0,
        0,
        dirEndX,
        0,
        0,
        // arrow pos 1
        1.0,
        arrowWidth,
        0,
        // arrow pos 2
        1.0,
        -arrowWidth,
        0,
        // arrow pos 3
        1.0,
        0,
        arrowWidth,
        //  arrow pos 4
        1.0,
        0,
        -arrowWidth,
    ];
    positions.forEach((e, index) => {
        positions[index] *= 0.5;
    });

    return { indices, positions, lineDistance };
}
