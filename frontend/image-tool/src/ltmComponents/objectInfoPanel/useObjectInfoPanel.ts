import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useInjectBSEditor } from '@/businessNew/context';
import { Event } from 'image-editor';
import type { AnnotateObject } from 'image-editor';
import { ViewMode } from './types';

export function useObjectInfoPanel() {
  const editor = useInjectBSEditor();
  const selectedObject = ref<any>(null);
  const viewMode = ref<ViewMode>(ViewMode.COMPONENT);

  // Convert editor object to plain object
  const convertToPlainObject = (obj: any) => {
    if (!obj) return null;
    
    // Helper function to check if a value is serializable
    const isSerializable = (value: any): boolean => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
      if (Array.isArray(value)) return value.every(item => isSerializable(item));
      if (typeof value === 'object') {
        // Check if it's a plain object (not Date, RegExp, etc.)
        if (value.constructor !== Object) {
          // For special objects like Date, try to convert to string
          if (value instanceof Date) return true;
          if (value instanceof RegExp) return true;
          // Skip other non-plain objects
          return false;
        }
        // For plain objects, check all properties
        return Object.values(value).every(val => isSerializable(val));
      }
      // Functions and other non-serializable types
      return false;
    };

    // Helper function to safely get object properties
    const getSerializableProperties = (obj: any): Record<string, any> => {
      const result: Record<string, any> = {};
      
      // Get all enumerable properties
      const properties = Object.getOwnPropertyNames(obj);
      
      for (const prop of properties) {
        try {
          const value = obj[prop];
          
          // Skip functions and non-serializable properties
          if (typeof value === 'function') continue;
          
          // Skip properties that start with underscore (usually internal)
          if (prop.startsWith('_') && prop !== '_id') continue;
          
          // Check if the value is serializable
          if (isSerializable(value)) {
            // Handle special cases
            if (value instanceof Date) {
              result[prop] = value.toISOString();
            } else if (value instanceof RegExp) {
              result[prop] = value.toString();
            } else if (Array.isArray(value)) {
              result[prop] = value.map(item => {
                if (item instanceof Date) return item.toISOString();
                if (item instanceof RegExp) return item.toString();
                return item;
              });
            } else if (typeof value === 'object' && value !== null) {
              // Recursively process nested objects
              result[prop] = getSerializableProperties(value);
            } else {
              result[prop] = value;
            }
          }
        } catch (error) {
          // Skip properties that cause errors when accessed
          console.warn(`ObjectInfoPanel - Skipping property "${prop}" due to error:`, error);
        }
      }
      
      return result;
    };
    
    const plainObject = getSerializableProperties(obj);
    
    return plainObject;
  };

  // Get currently selected object
  const getCurrentSelection = () => {
    const selection = editor.selection;
    
    // Only show the first object information
    const validObject = selection[0] || null;
    if (validObject) {
      selectedObject.value = convertToPlainObject(validObject);
    } else {
      selectedObject.value = null;
    }
  };

  // Selection event handler
  const handleSelect = (preSelection: AnnotateObject[], currentSelection: AnnotateObject[]) => {
    getCurrentSelection();
  };

  // Annotate change event handler
  const handleAnnotateChange = (objects: AnnotateObject[], type?: string, data?: any) => {
    // 检查当前选中的物体是否在变化的对象列表中
    const currentSelection = editor.selection;
    if (currentSelection.length > 0) {
      const currentObject = currentSelection[0];
      const hasChangedObject = objects.some(obj => obj.uuid === currentObject.uuid);
      
      if (hasChangedObject) {
        getCurrentSelection();
      }
    }
  };

  // Annotate transform event handler
  const handleAnnotateTransform = (objects: AnnotateObject[], transforms: any) => {
    // 检查当前选中的物体是否在变换的对象列表中
    const currentSelection = editor.selection;
    if (currentSelection.length > 0) {
      const currentObject = currentSelection[0];
      const hasTransformedObject = objects.some(obj => obj.uuid === currentObject.uuid);
      
      if (hasTransformedObject) {
        getCurrentSelection();
      }
    }
  };

  // Toggle view mode
  const toggleViewMode = () => {
    viewMode.value = viewMode.value === ViewMode.COMPONENT 
      ? ViewMode.JSON 
      : ViewMode.COMPONENT;
  };

  // Component mounted
  onMounted(() => {
    // Get currently selected object
    getCurrentSelection();
    
    // Listen for selection events
    editor.on(Event.SELECT, handleSelect);
    
    // Listen for annotate change events
    editor.on(Event.ANNOTATE_CHANGE, handleAnnotateChange);
    
    // Listen for annotate transform events
    editor.on(Event.ANNOTATE_TRANSFORM, handleAnnotateTransform);
  });

  // Component unmounted
  onBeforeUnmount(() => {
    // Clean up event listeners
    editor.off(Event.SELECT, handleSelect);
    editor.off(Event.ANNOTATE_CHANGE, handleAnnotateChange);
    editor.off(Event.ANNOTATE_TRANSFORM, handleAnnotateTransform);
  });

  return {
    selectedObject,
    viewMode,
    toggleViewMode
  };
} 