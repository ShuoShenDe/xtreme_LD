import { Polyline3D, Polygon3D, Segmentation3D, MainRenderView, SideRenderView, PointEditAction } from 'pc-render';
import { define } from '../define';
import Editor from '../../../Editor';

export const togglePointEdit = define({
    valid(editor: Editor) {
        const selection = editor.pc.selection;
        // Check if any selected object is editable (polyline, polygon, or segmentation)
        return selection.some(obj => 
            obj instanceof Polyline3D || 
            obj instanceof Polygon3D || 
            obj instanceof Segmentation3D
        );
    },
    execute(editor: Editor) {
        const config = editor.state.config;
        const isActive = config.activePointEdit || false;
        
        // Toggle point edit mode
        config.activePointEdit = !isActive;
        
        // Update all views
        editor.pc.renderViews.forEach(view => {
            if (view instanceof MainRenderView || view instanceof SideRenderView) {
                const pointEditAction = view.getAction('point-edit') as PointEditAction;
                if (pointEditAction) {
                    // Enable/disable the action based on the new state
                    pointEditAction.toggle(config.activePointEdit);
                    
                    // If enabling, set the selected object as target
                    if (config.activePointEdit) {
                        const editableObject = editor.pc.selection.find(obj => 
                            obj instanceof Polyline3D || 
                            obj instanceof Polygon3D || 
                            obj instanceof Segmentation3D
                        ) as Polyline3D | Polygon3D | Segmentation3D | undefined;
                        
                        if (editableObject) {
                            pointEditAction.setTargetObject(editableObject);
                        }
                    } else {
                        // If disabling, clear the target
                        pointEditAction.setTargetObject(null);
                    }
                }
            }
        });
        
        editor.pc.render();
    },
}); 