import Editor from "../../Editor";
import { SourceType } from "../../types/enum";

export interface ModelResultObject {
  type: string;
  points: Array<{ x: number; y: number }>;
  modelClass?: string;
  confidence?: number;
}

export interface ModelResult {
  modelCode: string;
  objects: ModelResultObject[];
}

/**
 * Convert model result to ISS shapes and add them to the editor
 * 将模型结果转换为ISS形状并添加到编辑器中
 * 
 * @param modelResult - The model result containing segmentation objects
 * @param editor - The editor instance
 * @returns Promise<any[]> - Array of created ISS annotation objects
 */
export async function convertModelResultAndAddISS(
  modelResult: ModelResult, 
  editor: Editor
): Promise<any[]> {
    const { objects } = modelResult;
    if (!objects || objects.length === 0) {
      return Promise.reject(new Error('No segmentation objects found in AI result'));
    }
        
      const annotates: any[] = [];
      
      // Import necessary classes
      const { Iss } = await import('../shape');
      const { SourceType } = await import('../../types/enum');
      
      // Process each ISS object
      for (const obj of objects) {
        if (obj.type === 'ISS' && obj.points && Array.isArray(obj.points)) {
          
          // Convert points from object array [{x, y}, ...] to number array [x1, y1, x2, y2, ...]
          const pointsArray: number[] = [];
          for (const point of obj.points) {
            if (point && typeof point.x === 'number' && typeof point.y === 'number') {
              pointsArray.push(point.x, point.y);
            }
          }
          
          if (pointsArray.length < 6) { // Need at least 3 points (6 numbers)
            console.warn('❌ Not enough points for ISS object:', pointsArray.length / 2);
            continue;
          }
          
          // Create ISS shape with number array (same format as IssTool)
          const issShape = new Iss({ points: pointsArray as any });
          
          // Generate unique ID
          issShape.uuid = `iss_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Get default class configuration
          const classConfigs = editor.state.classTypes || [];
          const defaultClass = classConfigs[0] || { id: 'default', name: 'default', color: '#ff0000' };
          
          // Set user data for the ISS object
          const userData = {
            backId: '',
            classId: defaultClass.id,
            classType: defaultClass.name,
            attrs: {},
            modelClass: obj.modelClass || '',
            confidence: obj.confidence || 1.0,
            trackId: undefined, // Let initIDInfo generate
            trackName: undefined, // Let initIDInfo generate
            sourceId: editor.state.defaultSourceId || 'ai_model',
            sourceType: SourceType.MODEL,
            createdAt: new Date().toISOString(),
            createdBy: 'AI_MODEL',
            version: 1,
            
            // ISS-specific metadata
            instanceId: 1,
            regionId: `ai_region_${Date.now()}`,
            semanticLabel: defaultClass.id,
            
            // ISS metadata for rendering
            issMetadata: {
              instanceId: 1,
              confidence: obj.confidence || 1.0,
              isVisible: true,
              semanticLabel: defaultClass.id,
              createdAt: Date.now()
            },
            hasIssMetadata: true
          };
          
          issShape.userData = userData;
          annotates.push(issShape);

        }
      }
      if (annotates.length === 0) {
        throw new Error('No valid ISS objects could be created');
      }
      
      // Initialize ID info for all objects
      annotates.forEach((annotate: any) => {
        editor.initIDInfo(annotate);
      });
      
      // Add objects using cmdManager instead of onDraw to avoid ending the tool
      editor.cmdManager.withGroup(() => {
        if (editor.state.isSeriesFrame) {
          editor.cmdManager.execute('add-track', editor.createTrackObj(annotates));
        }
        editor.cmdManager.execute('add-object', annotates);
      });
    return annotates;
}

/**
 * Convert single model result object to ISS shape (without adding to editor)
 * 将单个模型结果对象转换为ISS形状（不添加到编辑器）
 * 
 * @param obj - Single model result object
 * @param editor - The editor instance
 * @returns Promise<any> - Created ISS annotation object
 */
export async function convertSingleObjectToISS(
  obj: ModelResultObject, 
  editor: Editor
): Promise<any> {
  if (obj.type !== 'ISS' || !obj.points || !Array.isArray(obj.points)) {
    throw new Error('Invalid object type or missing points');
  }

  // Validate and use points as Vector2 array
  const pointsArray: Array<{ x: number; y: number }> = [];
  for (const point of obj.points) {
    if (point && typeof point.x === 'number' && typeof point.y === 'number') {
      pointsArray.push({ x: point.x, y: point.y });
    }
  }
  
  if (pointsArray.length < 3) { // Need at least 3 points
    throw new Error(`Not enough points for ISS object: ${pointsArray.length}`);
  }
  
  // Import necessary class
  const { default: Iss } = await import('../shape/Iss');
  
  // Create ISS shape with Vector2 array
  const issShape = new Iss({ points: pointsArray });
  
  // Generate unique ID
  issShape.uuid = `iss_ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get default class configuration
  const classConfigs = editor.state.classTypes || [];
  const defaultClass = classConfigs[0] || { id: 'default', name: 'default', color: '#ff0000' };
  
  // Set user data for the ISS object
  const userData = {
    backId: '',
    classId: defaultClass.id,
    classType: defaultClass.name,
    attrs: {},
    modelClass: obj.modelClass || '',
    confidence: obj.confidence || 1.0,
    trackId: undefined,
    trackName: undefined,
    sourceId: editor.state.defaultSourceId || 'ai_model',
    sourceType: SourceType.MODEL,
    createdAt: new Date().toISOString(),
    createdBy: 'AI_MODEL',
    version: 1,
    
    // ISS-specific metadata
    instanceId: 1,
    regionId: `ai_region_${Date.now()}`,
    semanticLabel: defaultClass.id,
    
    // ISS metadata for rendering
    issMetadata: {
      instanceId: 1,
      confidence: obj.confidence || 1.0,
      isVisible: true,
      semanticLabel: defaultClass.id,
      createdAt: Date.now()
    },
    hasIssMetadata: true
  };
  
  issShape.userData = userData;
  
  // Initialize ID info
  editor.initIDInfo(issShape);
  
  return issShape;
}

