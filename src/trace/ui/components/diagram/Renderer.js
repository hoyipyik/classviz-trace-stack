// Renderer.js - UI rendering module
/**
 * Renderer class
 * Responsible for creating and updating DOM elements
 */
class Renderer {
  constructor(dataStore, container, eventBus, explainer) {
    this.data = dataStore;
    this.container = container;
    this.eventBus = eventBus;
    this.explainer = explainer;

    // Batch update mode
    this.batchMode = false;
    this.pendingUpdates = new Set();

    this._initializeEventListeners();
    this._initializeCurrentNodeCheckbox();
  }

  // ========== Initialization Methods ==========
  _initializeEventListeners() {
    if (!this.eventBus) return;

    this.eventBus.subscribe('scrollToNodeClickedInFlameChart', this._handleScrollToNodeClickedInFlameChart.bind(this));
    this.eventBus.subscribe('changeCurrentFocusedNode', this._handleCurrentFocusChange.bind(this));
    this.eventBus.subscribe('nodeCompressionTriggered', this._handleCompressionChange.bind(this));
    this.eventBus.subscribe('specialNodeConfigChanged', this._handleSpecialStatusChange.bind(this));
    this.eventBus.subscribe('nodeSelectionChanged', this._handleSelectionChange.bind(this));
  }

  _initializeCurrentNodeCheckbox() {
    const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');
    if (currentNodeCheckbox) {
      currentNodeCheckbox.addEventListener('change', (e) => {
        if (this.data.current) {
          this.data.select(this.data.current, e.target.checked);
          this.updateNodeUI(this.data.current);
          this.eventBus.publish('refreshFlame', {});
        }
      });
    }
  }

  // ========== Event Handlers ==========
  _handleScrollToNodeClickedInFlameChart() {
    const currentNodeId = this.data.current;
    if (currentNodeId) {
      setTimeout(() => {
        this.ensureNodeVisible(currentNodeId);
        this.updateCurrentNodeFocusUI(currentNodeId);
        this.updateNodeExpansion(currentNodeId);
        this.scrollToNode(currentNodeId);
      }, 100);
    }
  }

  _handleCurrentFocusChange(data) {
    if (data && data.nodeId) {
      const label = this.data.getNodeDataById(data.nodeId).label;
      this.ensureNodeVisible(data.nodeId);
      this.updateCurrentMethodDisplay(label);
      this.updateCurrentNodeFocusUI(data.nodeId);
      this.scrollToNode(data.nodeId);
    }
  }

  _handleCompressionChange({ nodeId }) {
    if (nodeId) {
      this.renderTree();
      if (this.data.current) {
        this.ensureNodeVisible(this.data.current);
        this.updateCurrentNodeFocusUI(this.data.current);
        this.scrollToNode(this.data.current);
      }
    }
  }

  _handleSpecialStatusChange(data) {
    if (data && data.nodeId) {
      this.updateNodeUI(data.nodeId);
      this._updateNodeStatusStyle(data);
    }
  }

  _updateNodeStatusStyle(data) {
    const nodeElement = this.data.getNodeElement(data.nodeId);
    if (!nodeElement) return;

    // Remove all status classes
    nodeElement.classList.remove('recursive-entry-node', 'fan-out-node', 'implementation-entry-node');

    // Add appropriate class based on field
    const classMap = {
      'recursiveEntryPoint': 'recursive-entry-node',
      'fanOut': 'fan-out-node',
      'implementationEntryPoint': 'implementation-entry-node'
    };

    if (data.value && classMap[data.field]) {
      nodeElement.classList.add(classMap[data.field]);
    }
  }

  _handleSelectionChange(data) {
    if (data && data.nodeId) {
      const label = this.data.nodes.get(data.nodeId).data.label;
      if (data.nodeId === this.data.current) {
        this.updateCurrentMethodDisplay(label);
      }
    }
  }

  // ========== Main Rendering Methods ==========
  renderTree() {
    this.container.innerHTML = '';
    const rootNode = this.data.tree;

    if (rootNode) {
      const rootElement = this.createNodeElement(rootNode.id);
      this.container.appendChild(rootElement);
    } else {
      console.error("No root node found!");
    }
  }

  createNodeElement(nodeId) {
    const nodeData = this.data.getNodeDataById(nodeId);
    const nodeState = this.data.getNodeState(nodeId);

    if (!nodeData) return null;

    const li = document.createElement('li');
    li.dataset.nodeId = nodeId;

    const itemDiv = this._createItemDiv(nodeId, nodeData, nodeState);
    this._attachNodeComponents(itemDiv, nodeId, nodeData, nodeState);
    this._attachEventListeners(itemDiv, nodeId, nodeData);

    li.appendChild(itemDiv);

    // Create children if expanded
    if (nodeState.expanded && this.data.getChildrenIds(nodeId).length > 0) {
      const childUl = this._createChildrenContainer(nodeId);
      li.appendChild(childUl);
    }

    return li;
  }

  // ========== Node Creation Helper Methods ==========
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
    this._renderMethodName(itemDiv, nodeData.label);

    // Add execution time
    const executionTime = this._createExecutionTimeElement(nodeData);
    itemDiv.appendChild(executionTime);
  }

  _createCheckbox(nodeId, nodeData, nodeState) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = nodeState.selected;

    checkbox.addEventListener('change', () => {
      this.data.select(nodeId, checkbox.checked);
      if (checkbox.checked) {
        this._setCurrentNode(nodeId, nodeData.label);
      }
    });

    return checkbox;
  }

  _createToggleButton(nodeId, nodeData, nodeState) {
    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'toggle-btn';

    const hasChildren = this.data.getChildrenIds(nodeId).length > 0;

    if (hasChildren) {
      toggleBtn.textContent = nodeState.expanded ? '▼' : '▶';
      toggleBtn.addEventListener('click', (e) => {
        this._handleToggleClick(e, nodeId, nodeData, nodeState);
      });
    } else {
      toggleBtn.style.display = 'none';
    }

    return toggleBtn;
  }

  _handleToggleClick(e, nodeId, nodeData, nodeState) {
    e.stopPropagation();

    const wasExpanded = nodeState.expanded;

    this._setCurrentNode(nodeId, nodeData.label);
    this.data.toggleExpand(nodeId);

    const li = e.target.closest('li');
    this.toggleNodeExpansion(li, nodeId);

    // Auto-expand children if enabled
    if (!wasExpanded && this.data.settings.autoExpand) {
      setTimeout(() => {
        const changedIds = this.data.selectChildren(nodeId);
        this.batchUpdateNodes(changedIds);
      }, 100);
    }

    this._publishFocusEvents(nodeId);
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

  // ========== Event Listeners ==========
  _attachEventListeners(itemDiv, nodeId, nodeData) {
    itemDiv.addEventListener('click', (e) => {
      if (this._shouldIgnoreClick(e)) return;

      this._setCurrentNode(nodeId, nodeData.label);
      this._publishFocusEvents(nodeId);
      this.eventBus.publish('changeRegionFocus', { focusedRegionId: nodeId });
    });

    this._attachHoverEvents(itemDiv, nodeId);
  }

  _shouldIgnoreClick(e) {
    return e.target.matches('.checkbox') || e.target.matches('.toggle-btn');
  }

  _setCurrentNode(nodeId, label) {
    this.data.setCurrent(nodeId);
    this.updateCurrentNodeFocusUI(nodeId);
    this.updateCurrentMethodDisplay(label);
  }

  _publishFocusEvents(nodeId) {
    if (this.eventBus) {
      this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', { nodeId });
      this.eventBus.publish('changeClassvizFocus', { nodeId });
    }
  }

  _attachHoverEvents(itemDiv, nodeId) {
    const cleanup = this._createHoverCard(itemDiv, nodeId);
    // Store cleanup function if needed for memory management
  }

  _createHoverCard(itemDiv, nodeId) {
    const itemData = this.data.nodes.get(nodeId).data;
    const hoverCard = this._createHoverCardElement();

    const handleMouseOver = (e) => {
      if (this._shouldIgnoreClick(e)) return;

      const isSpecialNode = this._isSpecialNode(itemData);
      const regionText = this.explainer.regions.get(nodeId)?.briefSummary;

      if (isSpecialNode && regionText) {
        this._showHoverCard(hoverCard, itemData, regionText, e);
      }
    };

    const handleMouseOut = () => {
      hoverCard.style.display = 'none';
    };

    itemDiv.addEventListener('mouseover', handleMouseOver);
    itemDiv.addEventListener('mouseout', handleMouseOut);

    return () => {
      itemDiv.removeEventListener('mouseover', handleMouseOver);
      itemDiv.removeEventListener('mouseout', handleMouseOut);
      if (document.body.contains(hoverCard)) {
        document.body.removeChild(hoverCard);
      }
    };
  }

  _createHoverCardElement() {
    const hoverCard = document.createElement('div');
    Object.assign(hoverCard.style, {
      display: 'none',
      position: 'fixed',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      width: '450px',
      zIndex: '10000'
    });
    hoverCard.className = 'hover-card';
    document.body.appendChild(hoverCard);
    return hoverCard;
  }

  _isSpecialNode(itemData) {
    return itemData.status.fanOut ||
      itemData.status.implementationEntryPoint ||
      itemData.status.recursiveEntryPoint;
  }

  _showHoverCard(hoverCard, itemData, regionText, e) {
    hoverCard.innerHTML = '';

    const labelRow = document.createElement('div');
    labelRow.innerHTML = `<strong>${itemData.label}</strong>`;
    hoverCard.appendChild(labelRow);

    const regionRow = document.createElement('div');
    regionRow.innerHTML = regionText;
    hoverCard.appendChild(regionRow);

    const position = this._calculateHoverPosition(e.clientX, e.clientY);
    hoverCard.style.left = `${position.left}px`;
    hoverCard.style.top = `${position.top}px`;
    hoverCard.style.display = 'block';
  }

  _calculateHoverPosition(mouseX, mouseY) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const cardWidth = 450;
    const cardHeight = 100;

    let left = mouseX + 10;
    let top = mouseY;

    if (left + cardWidth > viewportWidth) {
      left = Math.max(0, mouseX - cardWidth - 10);
    }

    if (top + cardHeight > viewportHeight) {
      top = Math.max(0, mouseY - cardHeight);
    }

    return { left, top };
  }

  // ========== Method Name Rendering ==========
  _renderMethodName(container, fullName) {
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

  // Legacy method for backward compatibility
  renderMethodName(container, fullName) {
    this._renderMethodName(container, fullName);
  }

  // ========== Node Update Methods ==========
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
      childUl = this._createChildrenContainer(nodeId);
      li.appendChild(childUl);
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

  // ========== Focus and Display Methods ==========
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

  // ========== Navigation Methods ==========
  scrollToNode(nodeId) {
    const nodeElement = this.data.getNodeElement(nodeId);
    if (!nodeElement) return;

    const container = document.querySelector('.visualization-container');
    if (container) {
      const nodeRect = nodeElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      container.scrollTo({
        top: container.scrollTop + (nodeRect.top - containerRect.top) -
          (container.clientHeight / 2) + (nodeRect.height / 2),
        behavior: 'smooth'
      });
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

export { Renderer };