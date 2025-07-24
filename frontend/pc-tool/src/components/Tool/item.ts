import { IState } from 'pc-editor';
import Editor from '../../common/Editor';
import { BsUIType as UIType } from '../../config/ui';
import { Component } from 'vue';
import ToolTip from './modelConfig.vue';
import SetHelper2D from './setHelper2D.vue';
import { ILocale } from './lang/type';
export interface IItemConfig {
    action: string;
    // label: string;
    title: ($$: (name: keyof ILocale, args?: Record<string, any>) => string) => string;
    getStyle?: (editor: Editor) => any;
    extra?: () => Component;
    hasMsg?: (editor: Editor) => boolean;
    getIcon: (editor: Editor) => string;
    isDisplay: (editor: Editor) => boolean;
    isActive: (editor: Editor) => boolean;
}
export const allItems: IItemConfig[] = [
    {
        action: 'select',
        title: ($$) => $$('title_select'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-edit';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            // 选择工具在没有其他工具激活时为激活状态
            return !state.config.active3DBox && 
                   !state.config.activePolyline3D && 
                   !state.config.activePolygon3D && 
                   !state.config.activeSegmentation3D &&
                   !state.config.activeTranslate &&
                   !state.config.activeTrack;
        },
    },
    {
        action: 'createRect',
        // label: 'Rect',
        title: ($$) => $$('title_rect'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-biaozhunkuang';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return (
                state.modeConfig.ui[UIType.create2dRect] &&
                state.config.showSingleImgView &&
                state.config.projectPoint4
            );
        },
        isActive: function (editor: Editor) {
            // return state.config.activeRect;
            return false;
        },
    },
    {
        action: 'create2DBox',
        title: ($$) => $$('title_create2DBox'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-biaozhunkuang';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return (
                state.modeConfig.ui[UIType.create2dBox] &&
                state.config.showSingleImgView &&
                state.config.projectPoint8
            );
        },
        isActive: function (editor: Editor) {
            // return state.config.active2DBox;
            return false;
        },
    },
    {
        action: 'create3DBoxStandard',
        title: ($$) => $$('title_3d_default'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-biaozhunkuang';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.create3dBox] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.active3DBox && state.config.boxMethod === 'STANDARD';
        },
    },
    {
        action: 'create3DBoxAI',
        title: ($$) => $$('title_3d_ai'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-a-aikuang';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.create3dBox] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.active3DBox && state.config.boxMethod === 'AI';
        },
    },
    {
        action: 'createPolyline3D',
        title: ($$) => $$('title_createPolyline3D'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-polyline';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.createPolyline3D] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activePolyline3D;
        },
    },
    {
        action: 'createPolygon3D',
        title: ($$) => $$('title_createPolygon3D'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-polygon';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.createPolygon3D] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activePolygon3D;
        },
    },
    {
        action: 'createSegmentation3D',
        title: ($$) => $$('title_createSegmentation3D'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-shaixuan';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.createSegmentation3D] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activeSegmentation3D;
        },
    },
    {
        action: 'translate',
        title: ($$) => $$('title_translate'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-yidong';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.translate] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activeTranslate;
        },
    },
    {
        action: 'togglePointEdit',
        title: ($$) => $$('title_pointEdit'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-point';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            // 只有当选中了可编辑对象时才显示
            const hasEditableSelection = state.config.showSingleImgView ? false : editor.pc.selection.some(obj => 
                obj.constructor.name === 'Polyline3D' || 
                obj.constructor.name === 'Polygon3D' || 
                obj.constructor.name === 'Segmentation3D'
            );
            return state.modeConfig.ui[UIType.pointEdit] && !state.config.showSingleImgView && hasEditableSelection;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activePointEdit;
        },
    },
    {
        action: 'projection',
        title: () => 'Projection',
        getIcon: function (editor: Editor) {
            return 'iconfont icon-yingshe';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.project] && state.imgViews.length > 0;
        },
        isActive: function (editor: Editor) {
            return false;
        },
    },
    {
        action: 'reProjection',
        title: () => 'Re-Projection',
        getIcon: function (editor: Editor) {
            return 'iconfont icon-xuanzhuan';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.reProject] && state.imgViews.length > 0;
        },
        isActive: function (editor: Editor) {
            return false;
        },
    },
    {
        action: 'track',
        title: ($$) => $$('title_track'),
        getIcon: function (editor: Editor) {
            return 'iconfont icon-fuzhuxian';
        },
        getStyle: function (editor: Editor) {
            return {
                'margin-bottom': 0,
                'border-bottom-right-radius': 0,
                'border-bottom-left-radius': 0,
                'padding-bottom': 0,
            };
        },
        extra: () => SetHelper2D,
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.track] && state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            return state.config.activeTrack;
        },
    },
    // {
    //     action: 'filter2D',
    //     // label: 'filter2D',
    //     title: ($$) => $$('title_filter2D'),
    //     getIcon: function (editor: Editor) {
    //         return 'iconfont icon-shaixuan';
    //     },
    //     isDisplay: function (editor: Editor) {
    //         let state = editor.state;
    //         return state.modeConfig.ui[UIType.filter2D];
    //     },
    //     isActive: function (editor: Editor) {
    //         let state = editor.state;
    //         return state.config.filter2DByTrack;
    //     },
    // },
    {
        action: 'model',
        // label: 'Model',
        title: ($$) => $$('title_model'),
        hasMsg: function (editor: Editor) {
            let state = editor.state;
            let dataInfo = state.frames[state.frameIndex];
            return dataInfo && !!dataInfo.model && dataInfo.model.state === 'complete';
        },
        extra: () => ToolTip,
        getStyle: function (editor: Editor) {
            return {
                'margin-bottom': 0,
                'border-bottom-right-radius': 0,
                'border-bottom-left-radius': 0,
                'padding-bottom': 0,
            };
        },
        getIcon: function (editor: Editor) {
            let state = editor.state;
            let dataInfo = state.frames[state.frameIndex];
            return dataInfo && !!dataInfo.model && dataInfo.model.state === 'loading'
                ? 'iconfont icon-loading loading'
                : 'iconfont icon-Vector';
        },
        isDisplay: function (editor: Editor) {
            let state = editor.state;
            return state.modeConfig.ui[UIType.rumModel] && !state.config.showSingleImgView;
        },
        isActive: function (editor: Editor) {
            let state = editor.state;
            let dataInfo = state.frames[state.frameIndex];
            return dataInfo && !!dataInfo.model && dataInfo.model.state === 'loading';
        },
    },
];
