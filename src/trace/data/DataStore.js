// DataStore.js - Refactored with component architecture
import { ThreadManager } from './subManager/ThreadManager.js';
import { NodeStateManager } from './subManager/NodeStateManager.js';
import { PackageManager } from './subManager/PackageManager.js';
import { SelectionManager } from './subManager/SelectionManager.js';
import { TreeOperations } from './subManager/TreeOperations.js';

/**
 * Data Storage Management Class
 * Responsible for managing all node data, states, and relationships
 * Now uses a component-based architecture while maintaining the same API
 */
class DataStore {
  constructor(threadsData, eventBus) {
    // ===== CORE DATA PROPERTIES =====
    this.threadsData = threadsData;
    this.eventBus = eventBus;
    this.currentViewMode = 'callTree';

    // ===== COMPONENT MANAGERS =====
    this.threadManager = new ThreadManager(threadsData, eventBus);
    this.nodeStateManager = new NodeStateManager(eventBus);
    this.packageManager = new PackageManager(this.threadManager, eventBus);
    this.selectionManager = new SelectionManager(
      this.nodeStateManager, 
      this.packageManager, 
      this.threadManager, 
      eventBus
    );
    this.treeOperations = new TreeOperations(this.nodeStateManager, eventBus);

    // ===== APPLICATION SETTINGS =====
    this.showLogical = true; // Default display logical view (Flame Chart related)
    this.traceMode = true;  // Default trace mode is call graph mode (for classviz)
    this.settings = {
      autoExpand: true, // Default auto-expand nodes
    };

    // ===== API COMPATIBILITY PROPERTIES =====
    // These provide direct access to maintain API compatibility
    this.nodes = this.nodeStateManager.nodes;
    this.state = this.nodeStateManager.state;
    this.parents = this.nodeStateManager.parents;
    this.children = this.nodeStateManager.children;
    this.selected = this.nodeStateManager.selected;
    this.originalIdToThreadMap = this.threadManager.originalIdToThreadMap;
    this.threadToNodesMap = this.threadManager.threadToNodesMap;
    this.packageInfo = this.packageManager.packageInfo;
    this.packageIDs = this.packageManager.packageIDs;
    this.packageSelectedIDs = this.packageManager.packageSelectedIDs;
    this.threadToPackageMap = this.threadManager.threadToPackageMap;
    this.allThreadsNodes = this.threadManager.allThreadsNodes;

    // ===== INITIALIZATION =====
    this.initAllThreadsNodes();
    this.initAllThreadsData();

    // Initialize data - select the first thread as the default thread
    const threadNames = Object.keys(threadsData);
    if (threadNames.length > 0) {
      this.switchThread(threadNames[0]);
    }
  }

  // ===============================================
  // INITIALIZATION METHODS
  // ===============================================

  initAllThreadsNodes() {
    this.threadManager.initAllThreadsNodes();
  }

  initAllThreadsData() {
    this.threadManager.initThreadMappings();
    this.packageManager.clear();
    this.nodeStateManager.clear();

    // Iterate through all threads
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      this.initThreadData(threadName, threadData);
    });
  }

  initThreadData(threadName, node, parentId = null) {
    if (!node || !node.id) return;

    // Add node to state manager
    this.nodeStateManager.addNode(node, parentId);

    // Add node to thread manager
    this.threadManager.addNodeToThread(threadName, node.id, node.packageName);

    // Initialize package for node
    this.packageManager.initPackageForNode(node);

    // Recursively process child nodes
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.initThreadData(threadName, child, node.id);
      });
    }
  }

  rebuildDataStructures() {
    // Save DOM element references
    const savedElements = this.nodeStateManager.saveElementReferences();

    // Clear all managers
    this.threadManager.resetMappings();
    this.packageManager.clear();
    this.nodeStateManager.clear();

    // Rebuild all data
    this.initAllThreadsNodes();
    this.initAllThreadsData();

    // Restore the current thread
    if (this.currentThreadName) {
      this.switchThread(this.currentThreadName);
    }

    // Restore DOM element references
    this.nodeStateManager.restoreElementReferences(savedElements);

    console.log("Data structures rebuilt with element references safely preserved");
  }

  // ===============================================
  // DATA ACCESS METHODS (Delegated)
  // ===============================================

  getNodeDataById(nodeId) {
    return this.nodeStateManager.getNodeDataById(nodeId);
  }

  getNodeDataByThreadAndId(threadName, nodeId) {
    return this.threadManager.getNodeDataByThreadAndId(threadName, nodeId);
  }

  getAllNodeIdsForThread(threadName) {
    return this.threadManager.getAllNodeIdsForThread(threadName);
  }

  getThreadForNodeId(nodeId) {
    return this.threadManager.getThreadForNodeId(nodeId);
  }

  getNodeState(nodeId) {
    return this.nodeStateManager.getNodeState(nodeId);
  }

  getChildrenIds(nodeId) {
    return this.nodeStateManager.getChildrenIds(nodeId);
  }

  getAncestorIds(nodeId) {
    return this.nodeStateManager.getAncestorIds(nodeId);
  }

  // ===============================================
  // THREAD MANAGEMENT METHODS (Delegated)
  // ===============================================

  getAllThreadNames() {
    return this.threadManager.getAllThreadNames();
  }

  getCurrentThreadName() {
    return this.threadManager.getCurrentThreadName();
  }

  get currentThreadName() {
    return this.threadManager.getCurrentThreadName();
  }

  get tree() {
    return this.threadManager.tree;
  }

  switchThread(threadName) {
    return this.threadManager.switchThread(threadName);
  }

  // Backward compatibility methods
  resetDataStructures() {
    console.warn('resetDataStructures called but is now a no-op');
  }

  initFromData(node, parentId = null) {
    console.warn('initFromData called but is now a no-op');
  }

  // ===============================================
  // SETTINGS MANAGEMENT
  // ===============================================

  setShowLogical(showLogical) {
    this.showLogical = showLogical;
  }

  setTraceMode(traceMode) {
    this.traceMode = traceMode;
  }

  // ===============================================
  // NODE EXPAND/COLLAPSE OPERATIONS (Delegated)
  // ===============================================

  expand(nodeId) {
    return this.treeOperations.expand(nodeId);
  }

  collapse(nodeId) {
    return this.treeOperations.collapse(nodeId);
  }

  toggleExpand(nodeId) {
    return this.treeOperations.toggleExpand(nodeId);
  }

  expandAllDescendants(nodeId) {
    return this.treeOperations.expandAllDescendants(nodeId);
  }

  collapseAllDescendants(nodeId) {
    return this.treeOperations.collapseAllDescendants(nodeId);
  }

  compressRecursiveTree(nodeId, compress = true) {
    return this.treeOperations.compressRecursiveTree(
      nodeId, 
      compress, 
      () => this.rebuildDataStructures()
    );
  }

  // ===============================================
  // NODE SELECTION OPERATIONS (Delegated)
  // ===============================================

  select(nodeId, selected = true, batch = false) {
    return this.selectionManager.select(nodeId, selected, batch);
  }

  deselect(nodeId, batch = false) {
    return this.selectionManager.deselect(nodeId, batch);
  }

  isSelected(nodeId) {
    return this.selectionManager.isSelected(nodeId);
  }

  selectChildren(nodeId) {
    return this.selectionManager.selectChildren(nodeId);
  }

  deselectChildren(nodeId) {
    return this.selectionManager.deselectChildren(nodeId);
  }

  selectAllChildren(nodeId) {
    return this.selectionManager.selectAllChildren(nodeId);
  }

  deselectAllChildren(nodeId) {
    return this.selectionManager.deselectAllChildren(nodeId);
  }

  selectParent(nodeId) {
    return this.selectionManager.selectParent(nodeId);
  }

  deselectParent(nodeId) {
    return this.selectionManager.deselectParent(nodeId);
  }

  selectAncestors(nodeId) {
    return this.selectionManager.selectAncestors(nodeId);
  }

  deselectAncestors(nodeId) {
    return this.selectionManager.deselectAncestors(nodeId);
  }

  selectAll() {
    return this.selectionManager.selectAll();
  }

  deselectAll() {
    return this.selectionManager.deselectAll();
  }

  selectByPackage(packageName, selected = true) {
    return this.selectionManager.selectByPackage(packageName, selected);
  }

  // ===============================================
  // PACKAGE MANAGEMENT OPERATIONS (Delegated)
  // ===============================================

  getPackageSelectionState(packageName) {
    return this.packageManager.getPackageSelectionState(packageName, this.nodeStateManager);
  }

  getAllPackages() {
    return this.packageManager.getAllPackages();
  }

  getPackageColor(packageName) {
    return this.packageManager.getPackageColor(packageName);
  }

  getPackageNodeIds(packageName) {
    return this.packageManager.getPackageNodeIds(packageName);
  }

  getPackageSelectedIds(packageName) {
    return this.packageManager.getPackageSelectedIds(packageName);
  }

  // ===============================================
  // HIGHLIGHT AND FOCUS OPERATIONS (Delegated)
  // ===============================================

  setCurrent(nodeId) {
    return this.nodeStateManager.setCurrent(nodeId);
  }

  get current() {
    return this.nodeStateManager.getCurrent();
  }

  highlight(nodeId, highlighted = true) {
    return this.nodeStateManager.highlight(nodeId, highlighted);
  }

  clearAllHighlights() {
    return this.nodeStateManager.clearAllHighlights();
  }

  // ===============================================
  // DOM ELEMENT MANAGEMENT (Delegated)
  // ===============================================

  setNodeElement(nodeId, element) {
    return this.nodeStateManager.setNodeElement(nodeId, element);
  }

  getNodeElement(nodeId) {
    return this.nodeStateManager.getNodeElement(nodeId);
  }

  // ===============================================
  // UTILITY METHODS
  // ===============================================

  formatTime(timeInNanos) {
    if (!timeInNanos) return '';
    return parseFloat(timeInNanos) + 'ns';
    // Alternative implementation:
    // const timeInMs = Math.round(timeInNanos / 1000000);
    // return timeInMs >= 1000 ? 
    //   `${(timeInMs / 1000).toFixed(2)}s` : 
    //   `${timeInMs}ms`;
  }
}

export { DataStore };