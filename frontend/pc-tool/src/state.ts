import { provide, inject, reactive } from 'vue';
import { IBSState } from './type';
import Editor from './common/Editor';
import { initRegistry } from './registry';
import { IState } from 'pc-editor';

// global state
export const bsContext = Symbol('pc-tool-editor');
export const stateContext = Symbol('pc-tool-editor-state');

export function useProvideEditor() {
    try {
        let editor = new Editor();
        
        // @ts-ignore
        window.editor = editor;

        editor.state = reactive(editor.state);
        editor.bsState = reactive(editor.bsState);

        try {
            initRegistry(editor);
        } catch (error) {
            console.error('useProvideEditor: Registry initialization failed:', error);
            // Continue with provide setup even if registry fails
        }

        provide(bsContext, editor);
        provide(stateContext, editor.state);

        return editor;
    } catch (error) {
        console.error('useProvideEditor: Critical error during editor initialization:', error);
        // 创建一个最小化的编辑器实例作为后备
        const fallbackEditor = {
            state: reactive({}),
            bsState: reactive(getDefault()),
            pc: null,
            registerModal: () => {},
            showModal: () => Promise.resolve(),
            showMsg: () => {},
            showConfirm: () => Promise.resolve(),
            showLoading: () => {},
        } as any;
        
        provide(bsContext, fallbackEditor);
        provide(stateContext, fallbackEditor.state);
        
        return fallbackEditor;
    }
}

export function useInjectEditor(): Editor {
    const editor = inject(bsContext) as Editor;
    if (!editor) {
        throw new Error('Editor injection failed - make sure the component is wrapped with proper provider');
    }
    return editor;
}

export function useInjectState(): IState {
    return inject(stateContext) as IState;
}

export function getDefault(): IBSState {
    return {
        query: {},
        // flow
        saving: false,
        validing: false,
        submitting: false,
        modifying: false,
        //
        // user
        user: {
            id: '',
            nickname: '',
        },
        datasetName: '',
        datasetType: '',
        datasetId: '',
        recordId: '',
    };
}
