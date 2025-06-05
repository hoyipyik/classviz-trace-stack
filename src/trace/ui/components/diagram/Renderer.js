import { HoverCardManager } from "./stack/HoverCardManager.js";
import { NodeElementFactory } from "./stack/NodeElementFactory.js";
import { NodeEventManager } from "./stack/NodeEventManager.js";
import { NodeUIUpdater } from "./stack/NodeUIUpdater.js";

// Renderer.js 
class Renderer {
  constructor(dataStore, container, eventBus, explainer, classvizManager) {
    this.data = dataStore;
    this.container = container;
    this.eventBus = eventBus;
    this.explainer = explainer;
    this.classvizManager = classvizManager;

    this.elementFactory = new NodeElementFactory(dataStore);
    this.eventManager = new NodeEventManager(dataStore, eventBus, this);
    this.hoverManager = new HoverCardManager(dataStore, explainer);
    this.uiUpdater = new NodeUIUpdater(dataStore, this.elementFactory, this.eventManager);

    // API
    this.batchMode = this.uiUpdater.batchMode;
    this.pendingUpdates = this.uiUpdater.pendingUpdates;

    this._initializeEventListeners();
    this._initializeCurrentNodeCheckbox();
  }


  // ========== Events ==========
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

    nodeElement.classList.remove('recursive-entry-node', 'fan-out-node', 'implementation-entry-node');

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

  // ========== public api ==========
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
    const element = this.elementFactory.createNodeElement(nodeId);
    if (element) {
      this.eventManager.bindNodeEvents(element, nodeId);
    }
    return element;
  }


  updateNodeUI(nodeId) { return this.uiUpdater.updateNodeUI(nodeId); }
  toggleNodeExpansion(li, nodeId) { return this.uiUpdater.toggleNodeExpansion(li, nodeId); }
  batchUpdateNodes(nodeIds) { return this.uiUpdater.batchUpdateNodes(nodeIds); }
  updateCurrentNodeFocusUI(nodeId) { return this.uiUpdater.updateCurrentNodeFocusUI(nodeId); }
  updateCurrentMethodDisplay(methodName) { return this.uiUpdater.updateCurrentMethodDisplay(methodName); }
  updateNodeExpansion(nodeId) { return this.uiUpdater.updateNodeExpansion(nodeId); }
  updateNodeUIExpansion(nodeId) { return this.uiUpdater.updateNodeUIExpansion(nodeId); }
  ensureNodeVisible(nodeId) { return this.uiUpdater.ensureNodeVisible(nodeId); }
  renderMethodName(container, fullName) { return this.elementFactory.renderMethodName(container, fullName); }

  // ========== internal methods ==========
  setCurrentNode(nodeId, label) {
    this.data.setCurrent(nodeId);
    this.updateCurrentNodeFocusUI(nodeId);
    this.updateCurrentMethodDisplay(label);
  }

  publishFocusEvents(nodeId) {
    if (this.eventBus) {
      this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', { nodeId });
      this.eventBus.publish('changeClassvizFocus', { nodeId });
    }
  }

  handleToggleClick(e, nodeId, nodeData) {
    e.stopPropagation();

    const nodeState = this.data.getNodeState(nodeId);
    const wasExpanded = nodeState.expanded;

    this.setCurrentNode(nodeId, nodeData.label);
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

    this.publishFocusEvents(nodeId);
  }

  handleUnselectCurrentNode() {
    if (this.classvizManager && this.classvizManager.stepByStepMode) {
      const selectedNodes = this._findSelectedNodes();
      if (selectedNodes.length > 0) {
        const newFocusNode = selectedNodes[0];
        const nodeData = this.data.getNodeDataById(newFocusNode);
        this.setCurrentNode(newFocusNode, nodeData.label);
        this.publishFocusEvents(newFocusNode);
      } else {
        this.data.setCurrent(null);
        this.updateCurrentMethodDisplay('No method selected');
        this.publishFocusEvents(null);
      }
    }
  }

  _findSelectedNodes() {
    const selectedNodes = [];
    this.data.nodes.forEach((node, nodeId) => {
      const nodeState = this.data.getNodeState(nodeId);
      if (nodeState.selected) {
        selectedNodes.push(nodeId);
      }
    });
    return selectedNodes;
  }

  showStepByStepSnackbar() {
    const snackbar = this._createSnackbar();
    snackbar.textContent = 'You can only focus the selected method only in Step-by-Step mode.';
    
    document.body.appendChild(snackbar);
    
    setTimeout(() => snackbar.classList.add('show'), 10);
    
    setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(snackbar)) {
          document.body.removeChild(snackbar);
        }
      }, 300);
    }, 3000);
  }

  _createSnackbar() {
    const snackbar = document.createElement('div');
    snackbar.className = 'snackbar';
    
    Object.assign(snackbar.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%) translateY(100px)',
      backgroundColor: '#323232',
      color: 'white',
      padding: '16px 24px',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      zIndex: '10001',
      maxWidth: '400px',
      textAlign: 'center',
      transition: 'transform 0.3s ease-in-out',
      opacity: '0.9'
    });
    
    const style = document.createElement('style');
    if (!document.head.querySelector('#snackbar-styles')) {
      style.id = 'snackbar-styles';
      style.textContent = `
        .snackbar.show {
          transform: translateX(-50%) translateY(0) !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    return snackbar;
  }

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
}

export { Renderer };