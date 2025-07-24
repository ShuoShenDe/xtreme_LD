import { defineAsyncComponent } from 'vue';
import { 
  FileTextOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FileTextOutlined as SummaryOutlined
} from '@ant-design/icons-vue';
import type { TabItem } from './types';

export const tabConfig: TabItem[] = [
  {
    key: 'operation',
    icon: FileTextOutlined,
    component: defineAsyncComponent(() => import('./OperationTab.vue')),
    title: 'operation'
  },
  {
    key: 'quality-check',
    icon: CheckCircleOutlined,
    component: defineAsyncComponent(() => import('./QualityCheckTab.vue')),
    title: 'quality check'
  },
  {
    key: 'qc-summary',
    icon: SummaryOutlined,
    component: defineAsyncComponent(() => import('./QcSummaryTab.vue')),
    title: 'qc summary'
  },
  {
    key: 'object-info',
    icon: InfoCircleOutlined,
    component: defineAsyncComponent(() => import('./ObjectInfoTab.vue')),
    title: '对象信息'
  }
];

export const defaultActiveKey = 'operation'; 