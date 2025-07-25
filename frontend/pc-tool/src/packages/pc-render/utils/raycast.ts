import * as THREE from 'three';
import { get } from './tempVar';

/**
 * Selection configuration constants
 */
export const SELECTION_CONFIG = {
    THRESHOLDS: {
        LINE: 10,
        POINTS: 10,
        POLYGON: 8,
        POLYLINE_MULTIPLIER: 1.5, // 从3减小到1.5，减小Polyline的选择范围
        POLYGON_MULTIPLIER: 2
    },
    EPSILON: 1e-6
};

/**
 * Raycast result interface
 */
export interface RaycastResult {
    point: THREE.Vector3;
    distance: number;
}

/**
 * Raycast a line segment against a ray
 * @param ray - The ray to test against
 * @param start - Start point of the line segment
 * @param end - End point of the line segment
 * @param threshold - Selection threshold distance
 * @returns Intersection result or null
 */
export function raycastLineSegment(
    ray: THREE.Ray, 
    start: THREE.Vector3, 
    end: THREE.Vector3, 
    threshold: number
): RaycastResult | null {
    // Create line segment
    const segmentDirection = new THREE.Vector3().subVectors(end, start).normalize();
    const segmentLength = start.distanceTo(end);
    
    // Find closest points between ray and line segment
    const closestPointOnSegment = get(THREE.Vector3, 0);
    const closestPointOnRay = get(THREE.Vector3, 1);
    
    // Get closest point on infinite line first
    const lineToRay = get(THREE.Vector3, 2).subVectors(ray.origin, start);
    const rayDotSegment = ray.direction.dot(segmentDirection);
    const lineDotRay = lineToRay.dot(ray.direction);
    const lineDotSegment = lineToRay.dot(segmentDirection);
    
    const denom = 1 - rayDotSegment * rayDotSegment;
    
    if (Math.abs(denom) < SELECTION_CONFIG.EPSILON) {
        // Lines are parallel
        closestPointOnSegment.copy(start);
    } else {
        const t = (lineDotRay - rayDotSegment * lineDotSegment) / denom;
        const s = (rayDotSegment * lineDotRay - lineDotSegment) / denom;
        
        // Clamp s to segment bounds
        const clampedS = Math.max(0, Math.min(segmentLength, s));
        closestPointOnSegment.copy(start).addScaledVector(segmentDirection, clampedS);
        
        if (t > 0) {
            closestPointOnRay.copy(ray.origin).addScaledVector(ray.direction, t);
        } else {
            closestPointOnRay.copy(ray.origin);
        }
    }
    
    // Check if closest points are within threshold
    const distance = closestPointOnSegment.distanceTo(closestPointOnRay);
    
    if (distance <= threshold) {
        // Calculate ray parameter for proper distance sorting
        const rayToPoint = closestPointOnRay.clone().sub(ray.origin);
        const rayDistance = rayToPoint.dot(ray.direction);
        
        if (rayDistance > 0) {
            return {
                point: closestPointOnSegment,
                distance: rayDistance
            };
        }
    }
    
    return null;
}

/**
 * Get selection threshold for line objects
 * @param raycaster - The raycaster instance
 * @param multiplier - Threshold multiplier
 * @returns Calculated threshold
 */
export function getLineSelectionThreshold(raycaster: THREE.Raycaster, multiplier: number = 1): number {
    return (raycaster.params.Line?.threshold || SELECTION_CONFIG.THRESHOLDS.LINE) * multiplier;
}

/**
 * Get adaptive selection threshold for line objects based on camera distance and angle
 * @param raycaster - The raycaster instance
 * @param camera - The camera instance
 * @param object - The object being tested (optional)
 * @param multiplier - Threshold multiplier
 * @returns Calculated adaptive threshold
 */
export function getAdaptiveLineSelectionThreshold(
    raycaster: THREE.Raycaster, 
    camera: THREE.Camera, 
    object?: THREE.Object3D,
    multiplier: number = 1
): number {
    const baseThreshold = raycaster.params.Line?.threshold || SELECTION_CONFIG.THRESHOLDS.LINE;
    
    // 计算相机到对象的距离
    let distance = camera.position.length();
    
    if (object) {
        const objectCenter = new THREE.Vector3();
        object.getWorldPosition(objectCenter);
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        distance = cameraPosition.distanceTo(objectCenter);
    }
    
    // 根据距离调整threshold
    let distanceMultiplier = 1.0;
    if (distance > 100) {
        distanceMultiplier = Math.min(3.0, distance / 100);
    } else if (distance < 10) {
        distanceMultiplier = Math.max(0.5, distance / 10);
    }
    
    // 考虑相机角度影响（如果有对象）
    let angleMultiplier = 1.0;
    if (object) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const objectCenter = new THREE.Vector3();
        object.getWorldPosition(objectCenter);
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);
        const toObject = objectCenter.clone().sub(cameraPosition).normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, forward.dot(toObject))));
        angleMultiplier = 1.0 + Math.sin(angle) * 0.5; // 角度越大，threshold越大
    }
    
    return baseThreshold * multiplier * distanceMultiplier * angleMultiplier;
}

/**
 * Get selection threshold for points objects
 * @param raycaster - The raycaster instance
 * @returns Calculated threshold
 */
export function getPointsSelectionThreshold(raycaster: THREE.Raycaster): number {
    return raycaster.params.Points?.threshold || SELECTION_CONFIG.THRESHOLDS.POINTS;
}

/**
 * Common raycast setup for 3D objects
 * @param object - The 3D object to raycast
 * @param raycaster - The raycaster instance
 * @returns Setup data or null if raycast should be skipped
 */
export function setupCommonRaycast(object: THREE.Object3D, raycaster: THREE.Raycaster): {
    geometry: THREE.BufferGeometry;
    matrixWorld: THREE.Matrix4;
    inverseMatrix: THREE.Matrix4;
    ray: THREE.Ray;
} | null {
    if (!object.visible) return null;
    
    const geometry = (object as any).geometry as THREE.BufferGeometry;
    const matrixWorld = object.matrixWorld;
    
    // Bounding sphere check
    if (geometry.boundingSphere) {
        const sphere = get(THREE.Sphere, 0);
        sphere.copy(geometry.boundingSphere);
        sphere.applyMatrix4(matrixWorld);
        
        if (raycaster.ray.intersectsSphere(sphere) === false) {
            return null;
        }
    }
    
    // Transform ray to local space
    const inverseMatrix = get(THREE.Matrix4, 0).copy(matrixWorld).invert();
    const ray = get(THREE.Ray, 0).copy(raycaster.ray).applyMatrix4(inverseMatrix);
    
    return {
        geometry,
        matrixWorld,
        inverseMatrix,
        ray
    };
}

/**
 * Add intersection result to intersects array
 * @param intersects - Array to add result to
 * @param object - The intersected object
 * @param localPoint - Point in local space
 * @param matrixWorld - World matrix
 * @param raycaster - The raycaster instance
 */
export function addIntersectionResult(
    intersects: THREE.Intersection[],
    object: THREE.Object3D,
    localPoint: THREE.Vector3,
    matrixWorld: THREE.Matrix4,
    raycaster: THREE.Raycaster
): void {
    const worldPoint = localPoint.clone().applyMatrix4(matrixWorld);
    const rayDistance = raycaster.ray.origin.distanceTo(worldPoint);
    
    intersects.push({
        object,
        distance: rayDistance,
        point: worldPoint,
        face: null,
        faceIndex: -1,
        uv: new THREE.Vector2()
    });
} 