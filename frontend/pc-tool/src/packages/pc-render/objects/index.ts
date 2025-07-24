import Box from './Box';
import { Object2D, Rect, Box2D } from './object2d';
import Polyline3D from './Polyline3D';
import Polygon3D from './Polygon3D';
import Segmentation3D from './Segmentation3D';

export { Box, Object2D, Rect, Box2D, Polyline3D, Polygon3D, Segmentation3D };
export type AnnotateObject = Box | Rect | Box2D | Object2D | Polyline3D | Polygon3D | Segmentation3D;
export type { Vector2Of4 } from './object2d';
