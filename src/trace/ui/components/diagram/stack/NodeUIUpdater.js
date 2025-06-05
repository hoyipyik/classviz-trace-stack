
// NodeUIUpdater.js
export class NodeUIUpdater {
    constructor(dataStore, elementFactory, eventManager) {
        this.data = dataStore;
        this.elementFactory = elementFactory;
        this.eventManager = eventManager;

        // Batch update mode
        this.batchMode = false;
        this.pendingUpdates = new Set();
    }

    toggleNodeExpansion(li, nodeId) {
        const nodeState = this.data.getNodeState(nodeId);
        const toggleBtn = li.querySelector('.toggle-btn');

        if (!nodeState.expanded) {
            this._collapseNode(li, toggleBtn);
        } else {
            this._expandNode(li, nodeId, toggleBtn);
        }
    }

    _collapseNode(li, toggleBtn) {
        const childUl = li.querySelector('ul');
        if (childUl) {
            childUl.style.display = 'none';
        }
        toggleBtn.textContent = '▶';
    }

    _expandNode(li, nodeId, toggleBtn) {
        let childUl = li.querySelector('ul');

        if (!childUl) {
            // 创建子容器
            childUl = this.elementFactory._createChildrenContainer(nodeId);
            li.appendChild(childUl);

            // 为新创建的子节点绑定事件
            const newElements = childUl.querySelectorAll('li');
            newElements.forEach(childLi => {
                const childNodeId = childLi.dataset.nodeId;
                if (childNodeId) {
                    this.eventManager.bindNodeEvents(childLi, childNodeId);
                }
            });
        } else {
            childUl.style.display = '';
        }

        toggleBtn.textContent = '▼';
    }

    updateNodeUI(nodeId) {
        const nodeData = this.data.getNodeDataById(nodeId);
        const nodeState = this.data.getNodeState(nodeId);
        const nodeElement = this.data.getNodeElement(nodeId);

        if (!nodeData || !nodeState || !nodeElement) return;

        this._updateNodeCheckboxUI(nodeElement, nodeState);
        this._updateNodeHighlightUI(nodeElement, nodeState);
        this._updateNodeFocusUI(nodeElement, nodeId);
    }

    _updateNodeCheckboxUI(nodeElement, nodeState) {
        const checkbox = nodeElement.querySelector('.checkbox');
        if (checkbox) {
            checkbox.checked = nodeState.selected;
        }
    }

    _updateNodeHighlightUI(nodeElement, nodeState) {
        nodeElement.classList.toggle('search-highlight', nodeState.highlight);
    }

    _updateNodeFocusUI(nodeElement, nodeId) {
        nodeElement.classList.toggle('focused', this.data.current === nodeId);
    }

    batchUpdateNodes(nodeIds) {
        this.batchMode = true;

        try {
            nodeIds.forEach(id => this.updateNodeUI(id));
            const pendingIds = [...this.pendingUpdates];
            this.pendingUpdates.clear();
            this.batchMode = false;
            pendingIds.forEach(id => this.updateNodeUI(id));
        } catch (error) {
            this.batchMode = false;
            console.error("Error during batch update:", error);
        }
    }

    updateCurrentNodeFocusUI(nodeId) {
        // Remove previous focus
        document.querySelectorAll('.call-item.focused').forEach(el => {
            if (el.dataset.nodeId !== nodeId) {
                el.classList.remove('focused');
            }
        });

        let nodeElement = this._findNodeElement(nodeId);
        if (nodeElement) {
            nodeElement.classList.add('focused');
        }

        this._updateCurrentNodeCheckbox(nodeId);
    }

    _findNodeElement(nodeId) {
        let nodeElement = this.data.getNodeElement(nodeId);

        if (!nodeElement || !document.contains(nodeElement)) {
            nodeElement = document.querySelector(`.call-item[data-node-id="${nodeId}"]`);
            if (nodeElement) {
                this.data.setNodeElement(nodeId, nodeElement);
            }
        }

        return nodeElement;
    }

    _updateCurrentNodeCheckbox(nodeId) {
        const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');
        if (currentNodeCheckbox && nodeId) {
            const nodeState = this.data.getNodeState(nodeId);
            currentNodeCheckbox.checked = nodeState.selected;
            currentNodeCheckbox.disabled = false;
        }
    }

    updateCurrentMethodDisplay(methodName) {
        const currentMethodElement = document.getElementById('currentMethod');
        const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');

        if (currentMethodElement) {
            currentMethodElement.textContent = methodName || 'No method selected';
        }

        if (currentNodeCheckbox) {
            if (this.data.current) {
                const nodeState = this.data.getNodeState(this.data.current);
                currentNodeCheckbox.checked = nodeState.selected;
                currentNodeCheckbox.disabled = false;
            } else {
                currentNodeCheckbox.checked = false;
                currentNodeCheckbox.disabled = true;
            }
        }
    }

    updateNodeExpansion(nodeId) {
        this.data.expand(nodeId);
        this.updateNodeUIExpansion(nodeId);
    }

    updateNodeUIExpansion(nodeId) {
        const nodeElement = document.querySelector(`li[data-node-id="${nodeId}"]`);
        if (nodeElement) {
            this.toggleNodeExpansion(nodeElement, nodeId);
        }
    }

    ensureNodeVisible(nodeId) {
        const ancestors = this.data.getAncestorIds(nodeId);

        ancestors.forEach(ancestorId => {
            const state = this.data.getNodeState(ancestorId);
            if (!state.expanded) {
                this.updateNodeExpansion(ancestorId);
            }
        });
    }
}