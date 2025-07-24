import Shape from './Shape';
import Circle from './Circle';
import Anchor from './Anchor';
import KeyPoint from './Keypoint';
import Rect from './Rect';
import Line from './Line';
import Polygon from './Polygon';
import CommentBubble from './CommentBubble';
import Iss from './Iss';
import IssRect from './IssRect';

export { Shape, Circle, Anchor, KeyPoint, Rect, Line, Polygon, CommentBubble, Iss, IssRect };
export type AnnotateObject = Shape;
export type AnnotateClassName = 'rect' | 'polyline' | 'polygon' | 'key-point' | 'comment-bubble' | 'iss' | 'iss-rect';
