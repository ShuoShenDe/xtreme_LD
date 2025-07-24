// 效率监控初始化模块

import imageToolEfficiency from './index';

/**
 * 从 URL 查询参数获取用户和项目信息
 */
function getConfigFromQuery(): {
  userId: string;
  projectId: string;
  taskId: string;
} | null {
  const urlParams = new URLSearchParams(window.location.search);
  
  const userId = urlParams.get('userId') || localStorage.getItem('userId') || '';
  const projectId = urlParams.get('projectId') || urlParams.get('datasetId') || '';
  const taskId = urlParams.get('taskId') || urlParams.get('recordId') || '';

  if (!userId || !projectId || !taskId) {
    return null;
  }

  return { userId, projectId, taskId };
}

/**
 * 从 store 获取项目信息
 * 注意：各项目需要根据自己的store结构进行适配
 */
function getConfigFromStore(): {
  userId: string;
  projectId: string;
  taskId: string;
} | null {
  try {
    // 各项目需要根据自己的store结构更新这部分
    // 示例：
    // const projectStore = useProjectMetaStore();
    // const userId = projectStore.currentUser?.id || '';
    // const projectId = projectStore.currentProject?.id || '';
    // const taskId = projectStore.currentTask?.id || '';
    // 
    // if (!userId || !projectId || !taskId) {
    //   return null;
    // }
    // 
    // return { userId, projectId, taskId };
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 自动初始化效率监控
 */
export async function autoInitializeEfficiency(): Promise<boolean> {
  try {
    // 如果已经初始化，直接返回
    if (imageToolEfficiency.initialized) {
      return true;
    }

    // 尝试从查询参数获取配置
    let config = getConfigFromQuery();
    
    // 如果查询参数没有，尝试从 store 获取
    if (!config) {
      config = getConfigFromStore();
    }

    // 如果还是没有配置，无法初始化
    if (!config) {
      return false;
    }

    // 初始化效率监控
    await imageToolEfficiency.initialize({
      userId: config.userId,
      projectId: config.projectId,
      taskId: config.taskId,
      customConfig: {
        debug: {
          enabled: typeof window !== 'undefined' && window.location.hostname === 'localhost',
          logLevel: 'info',
          logToConsole: true,
          logToServer: false,
        },
      },
    });

    return true;

  } catch (error) {
    return false;
  }
}

/**
 * 手动初始化效率监控
 */
export async function manualInitializeEfficiency(config: {
  userId: string;
  projectId: string;
  taskId: string;
  customConfig?: Partial<EfficiencyTrackerConfig>;
}): Promise<boolean> {
  try {
    await imageToolEfficiency.initialize(config);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 销毁效率监控
 */
export async function destroyEfficiency(): Promise<boolean> {
  try {
    await imageToolEfficiency.destroy();
    return true;
  } catch (error) {
    return false;
  }
}

// 默认导出
export default {
  autoInitializeEfficiency,
  manualInitializeEfficiency,
  destroyEfficiency,
}; 