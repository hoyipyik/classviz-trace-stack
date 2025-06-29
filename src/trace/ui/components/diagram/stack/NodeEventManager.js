
// NodeEventManager.js
export class NodeEventManager {
    constructor(dataStore, eventBus, renderer) {
        this.data = dataStore;
        this.eventBus = eventBus;
        this.renderer = renderer;
    }

    bindNodeEvents(element, nodeId) {
        const itemDiv = element.querySelector('.call-item');
        if (!itemDiv) {
            console.warn(`No .call-item found for node ${nodeId}`);
            return;
        }

        const nodeData = this.data.getNodeDataById(nodeId);

        this._bindMainClickEvent(itemDiv, nodeId, nodeData);
        this._bindCheckboxEvent(itemDiv, nodeId, nodeData);
        this._bindToggleEvent(itemDiv, nodeId, nodeData);

        this.renderer.hoverManager.attachHoverEvents(itemDiv, nodeId);

        // 递归绑定子节点事件
        this._bindChildrenEventsRecursive(element);
    }

    _bindMainClickEvent(itemDiv, nodeId, nodeData) {
        itemDiv.addEventListener('click', (e) => {
            if (this._shouldIgnoreClick(e)) return;

            const nodeState = this.data.getNodeState(nodeId);

            // if stepByStepMode is enabled and node is not selected, show snackbar and block focus change
            if (this.renderer.classvizManager &&
                this.renderer.classvizManager.stepByStepMode &&
                !nodeState.selected) {
                // show snackbar and block focus change
                this.renderer.showStepByStepSnackbar();
                return;
            }

            // otherwise, proceed with focus change
            this.renderer.setCurrentNode(nodeId, nodeData.label);
            this.renderer.publishFocusEvents(nodeId);
            this.eventBus.publish('changeRegionFocus', { focusedRegionId: nodeId });
        });
    }

    _bindCheckboxEvent(itemDiv, nodeId, nodeData) {
        const checkbox = itemDiv.querySelector('.checkbox');
        if (!checkbox) return;

        checkbox.addEventListener('change', () => {
            this.data.select(nodeId, checkbox.checked);

            if (checkbox.checked) {
                // when checked: delay setting focus to ensure selection state is updated first
                setTimeout(() => {
                    this.renderer.setCurrentNode(nodeId, nodeData.label);
                    this.renderer.publishFocusEvents(nodeId);
                }, 0);
            } else {
                // when unchecked: if this is the current focused node, handle focus change
                if (this.data.current === nodeId) {
                    setTimeout(() => {
                        this.renderer.handleUnselectCurrentNode();
                    }, 0);
                }
            }

            this.renderer.updateNodeUI(nodeId);
            this.eventBus.publish('refreshFlame', {});
        });
    }

    _bindToggleEvent(itemDiv, nodeId, nodeData) {
        const toggleBtn = itemDiv.querySelector('.toggle-btn');
        if (!toggleBtn || toggleBtn.style.display === 'none') return;

        toggleBtn.addEventListener('click', (e) => {
            this.renderer.handleToggleClick(e, nodeId, nodeData);
        });
    }

    _bindChildrenEventsRecursive(element) {
        const childUl = element.querySelector(':scope > ul');
        if (!childUl) return;

        const childLis = childUl.querySelectorAll(':scope > li');
        childLis.forEach(childLi => {
            const childNodeId = childLi.dataset.nodeId;
            if (childNodeId) {
                this.bindNodeEvents(childLi, childNodeId);
            }
        });
    }

    _shouldIgnoreClick(e) {
        return e.target.matches('.checkbox') || e.target.matches('.toggle-btn');
    }

    _shouldBlockFocusChange(nodeId) {
        // block focus change if stepByStepMode is enabled and node is not selected
        if (this.renderer.classvizManager && this.renderer.classvizManager.stepByStepMode) {
            const nodeState = this.data.getNodeState(nodeId);
            return !nodeState.selected; // if node is not selected, block focus change
        }
        return false; // otherwise, allow focus change
    }
}