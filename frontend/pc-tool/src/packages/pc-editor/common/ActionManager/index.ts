import Editor from '../../Editor';
import * as Actions from './action';
import { IAction } from './type';
import { StatusType } from '../../type';
import { Box } from 'pc-render';

export type IActionName = keyof typeof Actions;

Object.keys(Actions).forEach((name) => {
    Actions[name as IActionName].name = name;
});

export let AllActions = Object.keys(Actions) as IActionName[];

interface IActionArgs {
    createAnnotation: { object: Box };
    projectObject2D: { updateFlag?: boolean; createFlag?: boolean; selectFlag?: boolean };
    [key: string]: any;
}

export default class ActionManager {
    // static Actions = Actions;
    editor: Editor;
    actions: Record<string, IAction>;
    currentAction: IAction | null = null;
    constructor(editor: Editor) {
        this.editor = editor;
        this.actions = { ...Actions };
    }

    registryAction(name: string, action: IAction) {
        this.actions[name] = action;
    }

    async execute<T extends IActionName>(name: T | T[], args?: IActionArgs[T]): Promise<any> {
        let action = null;
        if (Array.isArray(name)) {
            action = this.getEnableAction(name);
        } else {
            action = this.actions[name] as IAction;
        }

        if (!action) return;

        if (this.isBlocked()) {
            return;
        }

        let result;
        if (action.valid(this.editor)) {
            this.currentAction = action;
            try {
                result = await action.execute(this.editor, args);
            } catch (e) {
                console.error('action error:', name);
                console.error(e);
            }
            this.currentAction = null;
            action.end(this.editor);
        }

        return result;
    }

    isBlocked() {
        return this.currentAction || this.editor.state.status !== StatusType.Default;
    }

    getEnableAction(names: IActionName[]) {
        let config = this.editor.state.modeConfig;
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            let action = this.actions[name] as IAction;
            if (action && config.actions[name] && action.valid(this.editor)) return action;
        }

        return null;
    }

    stopCurrentAction() {
        if (!this.currentAction) return;

        this.currentAction.end(this.editor);
        this.currentAction = null;
    }

    handleEsc() {
        if (this.currentAction) {
            this.stopCurrentAction();
        } else if (this.editor.pc.selection.length > 0) {
            // this.editor.cmdManager.execute('select-object');
            this.editor.selectObject();
        }
    }

    handleTab() {
        let createActions: IActionName[] = [
            'create2DBox',
            'create2DRect',
            'createAnnotation',
            'createObjectWith3',
            'createPolyline3D',
            'createPolygon3D',
            'createSegmentation3D',
        ];

        let config = this.editor.state.config;
        if (this.currentAction) {
            let action = this.currentAction;
            let actionName = action.name as IActionName;

            if (createActions.indexOf(actionName) < 0) return;

            this.stopCurrentAction();

            switch (actionName) {
                case 'create2DBox':
                    config.active2DBox = false;
                case 'create2DRect':
                    config.activeRect = false;
                case 'createAnnotation':
                    config.activeAnnotation = false;
                case 'createObjectWith3':
                    config.active3DBox = false;
                case 'createPolyline3D':
                    config.activePolyline3D = false;
                case 'createPolygon3D':
                    config.activePolygon3D = false;
                case 'createSegmentation3D':
                    config.activeSegmentation3D = false;
            }
        }
    }

    isActionValid(name: IActionName) {
        let action = this.actions[name] as IAction;
        if (!action) return false;

        return action.valid(this.editor);
    }
}
