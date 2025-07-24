/**
 * 根据属性路径获取对象的属性值
 * @param obj 目标对象
 * @param path 属性路径，例如 'userData.trackName'
 * @returns 属性值
 */
export function getPropertyByPath(obj: any, path: string): any {
  try {
    const value = path.split('.').reduce((acc, part) => {
      if (acc === undefined || acc === null) {
        console.debug(`[getPropertyByPath] Path ${path} interrupted at ${part}, because current value is ${acc}`);
        return undefined;
      }
      const result = acc[part];
      if (result === undefined) {
        console.debug(`[getPropertyByPath] Property ${part} of path ${path} does not exist in`, acc);
      }
      return result;
    }, obj);

    console.debug(`[getPropertyByPath] Value of path ${path}:`, value);
    return value;
  } catch (error) {
    console.warn(`[getPropertyByPath] Error getting value of path ${path}:`, error);
    return undefined;
  }
}

/**
 * 根据属性路径设置对象的属性值
 * @param obj 目标对象
 * @param path 属性路径，例如 'userData.trackName'
 * @param value 要设置的值
 */
export function setPropertyByPath(obj: any, path: string, value: any): void {
  try {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((acc, key) => {
      if (acc[key] === undefined) {
        acc[key] = {};
      }
      return acc[key];
    }, obj);
    
    target[lastKey] = value;
  } catch (error) {
    console.warn(`[setPropertyByPath] Error setting value of path ${path}:`, error);
  }
}

/**
 * 格式化属性值
 * @param value 属性值
 * @param propType 属性类型
 * @returns 格式化后的值
 */
export function formatPropertyValue(value: any, propType: string): string {
  if (value === undefined || value === null) {
    console.debug(`[formatPropertyValue] Value is ${value}, type is ${propType}`);
    return '';
  }

  try {
    switch (propType) {
      case 'Number':
        const num = Number(value);
        return isNaN(num) ? '' : num.toString();
      case 'String':
        return String(value);
      case 'Boolean':
        return value.toString();
      case 'StringMapping':
        return String(value);
      case 'Raw':
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      default:
        console.debug(`[formatPropertyValue] Unknown property type ${propType}, value:`, value);
        return String(value);
    }
  } catch (error) {
    console.warn(`[formatPropertyValue] Error formatting value, type is ${propType}:`, error);
    return '';
  }
} 