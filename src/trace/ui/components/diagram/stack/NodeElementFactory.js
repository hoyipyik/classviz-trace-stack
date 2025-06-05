// NodeElementFactory.js 
export class NodeElementFactory {
    constructor(dataStore) {
        this.data = dataStore;
    }

    createNodeElement(nodeId) {
        const nodeData = this.data.getNodeDataById(nodeId);
        const nodeState = this.data.getNodeState(nodeId);

        if (!nodeData) return null;

        const li = document.createElement('li');
        li.dataset.nodeId = nodeId;

        const itemDiv = this._createItemDiv(nodeId, nodeData, nodeState);
        this._attachNodeComponents(itemDiv, nodeId, nodeData, nodeState);

        li.appendChild(itemDiv);

        // Create children if expanded
        if (nodeState.expanded && this.data.getChildrenIds(nodeId).length > 0) {
            const childUl = this._createChildrenContainer(nodeId);
            li.appendChild(childUl);
        }

        return li;
    }

    _createItemDiv(nodeId, nodeData, nodeState) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'call-item';
        itemDiv.dataset.nodeId = nodeId;

        this._applyNodeStyling(itemDiv, nodeData, nodeState);
        this.data.setNodeElement(nodeId, itemDiv);

        return itemDiv;
    }

    _applyNodeStyling(itemDiv, nodeData, nodeState) {
        // Apply color
        if (nodeData.color) {
            itemDiv.style.borderLeft = `4px solid ${nodeData.color}`;
            itemDiv.style.backgroundColor = `${nodeData.color}20`;
        }

        // Apply states
        if (nodeState.selected) itemDiv.classList.add('selected');
        if (nodeState.highlight) itemDiv.classList.add('search-highlight');
        if (nodeData.isRoot) itemDiv.classList.add('root-node');

        // Apply status classes
        if (nodeData.status) {
            const statusMap = {
                implementationEntryPoint: 'implementation-entry-node',
                fanOut: 'fan-out-node',
                recursiveEntryPoint: 'recursive-entry-node'
            };

            Object.entries(statusMap).forEach(([status, className]) => {
                if (nodeData.status[status]) {
                    itemDiv.classList.add(className);
                }
            });
        }
    }

    _attachNodeComponents(itemDiv, nodeId, nodeData, nodeState) {
        // Add checkbox
        const checkbox = this._createCheckbox(nodeId, nodeData, nodeState);
        itemDiv.appendChild(checkbox);

        // Add toggle button
        const toggleBtn = this._createToggleButton(nodeId, nodeData, nodeState);
        itemDiv.appendChild(toggleBtn);

        // Add percentage
        const percentage = this._createPercentageElement(nodeData);
        itemDiv.appendChild(percentage);

        // Add method name
        this.renderMethodName(itemDiv, nodeData.label);

        // Add execution time
        const executionTime = this._createExecutionTimeElement(nodeData);
        itemDiv.appendChild(executionTime);
    }

    _createCheckbox(nodeId, nodeData, nodeState) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox';
        checkbox.checked = nodeState.selected;
        return checkbox;
    }

    _createToggleButton(nodeId, nodeData, nodeState) {
        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';

        const hasChildren = this.data.getChildrenIds(nodeId).length > 0;

        if (hasChildren) {
            toggleBtn.textContent = nodeState.expanded ? '▼' : '▶';
        } else {
            toggleBtn.style.display = 'none';
        }

        return toggleBtn;
    }

    _createPercentageElement(nodeData) {
        const percentage = document.createElement('span');
        percentage.className = 'percentage';
        percentage.textContent = (nodeData.percent || '') + '%';
        return percentage;
    }

    _createExecutionTimeElement(nodeData) {
        const executionTime = document.createElement('span');
        executionTime.className = 'execution-time';
        executionTime.textContent = this.data.formatTime(nodeData.time);
        return executionTime;
    }

    _createChildrenContainer(nodeId) {
        const childUl = document.createElement('ul');
        const childrenIds = this.data.getChildrenIds(nodeId);

        childrenIds.forEach(childId => {
            const childElement = this.createNodeElement(childId);
            childUl.appendChild(childElement);
        });

        return childUl;
    }

    renderMethodName(container, fullName) {
        if (!fullName) {
            this._appendMethodNameSpan(container, 'Unknown');
            return;
        }

        const methodMatch = fullName.match(/(.+)\.([^.]+)(\(.*\))/);

        if (methodMatch) {
            const [, className, methodName, params] = methodMatch;
            this._appendMethodNameSpan(container, `${className}.${methodName}`);
            this._appendParamsSpan(container, params);
        } else {
            this._appendMethodNameSpan(container, fullName);
        }
    }

    _appendMethodNameSpan(container, text) {
        const span = document.createElement('span');
        span.className = 'method-name';
        span.textContent = text;
        container.appendChild(span);
    }

    _appendParamsSpan(container, params) {
        const span = document.createElement('span');
        span.className = 'params';
        span.textContent = params;
        container.appendChild(span);
    }
}
