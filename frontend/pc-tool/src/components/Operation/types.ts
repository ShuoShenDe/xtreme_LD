import { Component } from 'vue';

export interface TabItem {
  key: string;
  icon: Component;
  component: Component;
  title?: string;
  disabled?: boolean;
}

export interface TabConfig {
  tabs: TabItem[];
  defaultActiveKey?: string;
} 