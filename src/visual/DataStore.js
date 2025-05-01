// DataStore.js - Data management module
/**
 * Data Storage Management Class
 * Responsible for managing all node data, states, and relationships
 */
class DataStore {
  constructor(threadsData, eventBus) {
    // Original thread data, contains multiple threads
    this.threadsData = threadsData;

    this.currentViewMode = 'callTree';

    this.eventBus = eventBus;

    // Current thread name
    this.currentThreadName = null;

    // Current active thread tree data
    this.tree = null;

    // Maps and collections for ALL threads
    this.nodes = new Map();  // Mapping from node ID to node data
    this.state = new Map();  // Mapping from node ID to node state
    this.parents = new Map(); // Mapping from node ID to parent node ID
    this.children = new Map(); // Mapping from node ID to child node ID array
    this.selected = new Set(); // Set of all selected node IDs

    // Thread to nodes mapping
    this.originalIdToThreadMap = new Map(); // Mapping from original ID to thread name
    this.threadToNodesMap = new Map(); // Mapping from thread name to array of node IDs

    // Package name mapping related
    this.packageInfo = new Map(); // Mapping from package name to {totalCount:0, color:""}
    this.packageIDs = new Map(); // Mapping from package name to all node ID arrays
    this.packageSelectedIDs = new Map(); // Mapping from package name to selected node ID arrays

    // Current node id
    this.current = null;

    // All threads' nodes mapping
    // Format: threadName -> Map(nodeId -> nodeData)
    this.allThreadsNodes = new Map();

    // Flame Chart related settings
    this.showLogical = true; // Default display logical view
    // Trace mode for classviz
    this.traceMode = false;  // Default trace mode is call graph mode

    // Application settings
    this.settings = {
      autoExpand: false
    };

    // Initialize all threads node mappings first
    this.initAllThreadsNodes();

    // Initialize all data from all threads
    this.initAllThreadsData();

    // Initialize data - select the first thread as the default thread
    const threadNames = Object.keys(threadsData);
    if (threadNames.length > 0) {
      this.switchThread(threadNames[0]);
    }
  }

  //===============================================
  // 全局线程节点映射的初始化和访问方法
  //===============================================

  // 初始化所有线程的节点映射
  initAllThreadsNodes() {
    // 遍历所有线程
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // 为每个线程创建节点映射
      const threadNodes = new Map();

      // 设置到全局映射
      this.allThreadsNodes.set(threadName, threadNodes);

      // 构建节点映射
      this.buildThreadNodesMap(threadName, threadData);
    });
  }

  // 为特定线程构建节点映射
  buildThreadNodesMap(threadName, threadData) {
    const threadNodes = this.allThreadsNodes.get(threadName);

    // 递归构建节点映射
    const buildNodeMap = (node) => {
      if (!node || !node.id) return;

      // 只存储节点ID到节点数据的映射
      threadNodes.set(node.id, { data: node });

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          buildNodeMap(child);
        });
      }
    };

    // 从根节点开始构建映射
    buildNodeMap(threadData);
  }

  //===============================================
  // 初始化所有线程的数据
  //===============================================

  // 初始化所有线程的所有数据
  initAllThreadsData() {
    // 遍历所有线程
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // 为每个线程创建节点ID数组
      this.threadToNodesMap.set(threadName, []);
      
      // 初始化该线程的所有数据
      this.initThreadData(threadName, threadData);
    });
  }

  // 初始化特定线程的数据
  initThreadData(threadName, node, parentId = null) {
    if (!node || !node.id) return;

    // 存储节点数据
    this.nodes.set(node.id, { data: node });
    
    // 存储节点ID到线程的映射
    this.originalIdToThreadMap.set(node.id, threadName);
    
    // 存储线程到节点ID的映射
    this.threadToNodesMap.get(threadName).push(node.id);

    // 设置初始状态
    this.state.set(node.id, {
      selected: node.selected || false,
      expanded: !node.collapsed,
      highlight: false
    });

    // 处理包名映射
    if (node.packageName) {
      // 初始化包信息
      if (!this.packageInfo.has(node.packageName)) {
        this.packageInfo.set(node.packageName, {
          totalCount: 0,
          color: node.color || ''
        });
        this.packageIDs.set(node.packageName, []);
        this.packageSelectedIDs.set(node.packageName, []);
      }

      // 更新包信息
      const info = this.packageInfo.get(node.packageName);
      info.totalCount++;
      if (!info.color && node.color) {
        info.color = node.color;
      }

      // 添加节点ID到包ID列表
      this.packageIDs.get(node.packageName).push(node.id);

      // 如果节点已经被选中，添加到选中ID列表
      if (node.selected) {
        this.packageSelectedIDs.get(node.packageName).push(node.id);
        this.selected.add(node.id);
      }
    }

    // 设置父子关系
    if (parentId) {
      this.parents.set(node.id, parentId);

      if (!this.children.has(parentId)) {
        this.children.set(parentId, []);
      }
      this.children.get(parentId).push(node.id);
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.initThreadData(threadName, child, node.id);
      });
    }
  }

  getNodeDataById(nodeId) {
    // 直接从全局nodes表中获取
    const node = this.nodes.get(nodeId);
    return node ? node.data : null;
  }
  
  // 根据线程名称和节点ID获取节点数据
  getNodeDataByThreadAndId(threadName, nodeId) {
    const threadNodes = this.allThreadsNodes.get(threadName);
    if (!threadNodes) return null;
    
    const node = threadNodes.get(nodeId);
    return node ? node.data : null;
  }

  // 获取特定线程中的所有节点ID
  getAllNodeIdsForThread(threadName) {
    return this.threadToNodesMap.get(threadName) || [];
  }

  // 获取节点ID所属的线程
  getThreadForNodeId(nodeId) {
    return this.originalIdToThreadMap.get(nodeId);
  }

  //===============================================
  // Flamechart style settings
  //===============================================

  setShowLogical(showLogical) {
    this.showLogical = showLogical;
    // console.log(this.showLogical);
  }

  //================================================
  // Trace mode settings
  //================================================
  setTraceMode(traceMode) {
    this.traceMode = traceMode;
    // console.log(this.traceMode);
  }

  //===============================================
  // Thread switching - Optimized
  //===============================================

  // Get all thread names
  getAllThreadNames() {
    return Object.keys(this.threadsData);
  }

  // Get current thread name
  getCurrentThreadName() {
    return this.currentThreadName;
  }

  // Switch to specified thread - Optimized
  switchThread(threadName) {
    if (!this.threadsData[threadName]) {
      console.error(`Thread '${threadName}' not found!`);
      return false;
    }

    // If it's the same thread, no need to switch
    if (this.currentThreadName === threadName) {
      return true;
    }

    // Update current thread name
    this.currentThreadName = threadName;

    // Set current active thread tree data
    this.tree = this.threadsData[threadName];

    // No need to reset data structures or reinitialize
    // since we already have all data loaded

    // Trigger thread change event
    if (this.eventBus) {
      this.eventBus.publish('threadChanged', {
        threadName: this.currentThreadName
      });
    }

    return true;
  }

  // This method is kept for backward compatibility but is now a no-op
  resetDataStructures() {
    // No longer needed as we keep all data in memory
    console.warn('resetDataStructures called but is now a no-op');
  }

  // This method is kept for backward compatibility but is now a no-op
  initFromData(node, parentId = null) {
    // No longer needed as we load all data at initialization
    console.warn('initFromData called but is now a no-op');
  }

  //===============================================
  // Node state and data access methods
  //===============================================

  // Get node state
  getNodeState(nodeId) {
    return this.state.get(nodeId) || {
      selected: false,
      expanded: false,
      highlight: false
    };
  }

  // Get all child node IDs for a node
  getChildrenIds(nodeId) {
    return this.children.get(nodeId) || [];
  }

  // Get all parent node IDs for a node
  getAncestorIds(nodeId) {
    const ancestors = [];
    let current = nodeId;

    while (this.parents.has(current)) {
      const parentId = this.parents.get(current);
      ancestors.push(parentId);
      current = parentId;
    }

    return ancestors;
  }

  //===============================================
  // Node expand/collapse operations - Unchanged
  //===============================================

  // Expand node
  expand(nodeId) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);

    if (!state.expanded) {
      // Update state mapping
      state.expanded = true;

      // Sync back to original tree data
      nodeInfo.data.collapsed = false;

      return true;
    }

    return false;
  }

  // Collapse node
  collapse(nodeId) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);

    if (state.expanded) {
      // Update state mapping
      state.expanded = false;

      // Sync back to original tree data
      nodeInfo.data.collapsed = true;

      return true;
    }

    return false;
  }

  // Toggle node expand/collapse state
  toggleExpand(nodeId) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);

    // Update state mapping
    state.expanded = !state.expanded;

    // Sync back to original tree data
    nodeInfo.data.collapsed = !state.expanded;

    return true;
  }

  // Expand all descendant nodes
  expandAllDescendants(nodeId) {
    const changed = [];

    // Expand current node
    if (this.expand(nodeId)) {
      changed.push(nodeId);
    }

    // Recursively expand all child nodes
    const processChildren = (parentId) => {
      const children = this.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.expand(childId)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);
    return changed;
  }

  // Collapse all descendant nodes
  collapseAllDescendants(nodeId) {
    const changed = [];

    // Recursively collapse all child nodes
    const processChildren = (parentId) => {
      const children = this.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.collapse(childId)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);
    return changed;
  }

  //===============================================
  // Node select/deselect operations - Unchanged
  //===============================================

  // Select node
  select(nodeId, selected = true, batch = false) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);
    const packageName = nodeInfo.data.packageName;

    if (state.selected !== selected) {
      // Update state mapping
      state.selected = selected;

      // Update selected collection and package selected list
      if (selected) {
        this.selected.add(nodeId);
        if (packageName && this.packageSelectedIDs.has(packageName)) {
          if (!this.packageSelectedIDs.get(packageName).includes(nodeId)) {
            this.packageSelectedIDs.get(packageName).push(nodeId);
          }
        }
      } else {
        this.selected.delete(nodeId);
        if (packageName && this.packageSelectedIDs.has(packageName)) {
          const index = this.packageSelectedIDs.get(packageName).indexOf(nodeId);
          if (index !== -1) {
            this.packageSelectedIDs.get(packageName).splice(index, 1);
          }
        }
      }

      // Sync back to original tree data
      nodeInfo.data.selected = selected;

      // Event Bus publish
      if (this.eventBus) {
        this.eventBus.publish('nodeSelectionChanged', {
          nodeId,
          selected,
          packageName
        });
      }

      // if(!batch){
      // triger single insertion event
      this.eventBus.publish('changeSingleMethodByIdToClassviz', {
        nodeId,
        selected
      });
      // }

      return true;
    }

    return false;
  }

  // Other methods remain unchanged...
  // The rest of your class methods can be left as they are since they
  // operate on the global data structures which now contain data from all threads

  // Deselect node
  deselect(nodeId, batch = false) {
    return this.select(nodeId, false, batch);
  }

  // Select direct child nodes
  selectChildren(nodeId) {
    const children = this.getChildrenIds(nodeId);
    const changed = [];

    // Select current node
    if (this.select(nodeId, true, true)) {
      changed.push(nodeId);
    }

    // Select all direct child nodes
    children.forEach(childId => {
      if (this.select(childId, true, true)) {
        changed.push(childId);
      }
    });
    // publish insert mutli node in manage
    return changed;
  }

  // Deselect direct child nodes
  deselectChildren(nodeId) {
    const children = this.getChildrenIds(nodeId);
    const changed = [];

    children.forEach(childId => {
      if (this.deselect(childId, true)) {
        changed.push(childId);
      }
    });
    // publish insert mutli node in manage
    return changed;
  }

  // Recursively select all child nodes
  selectAllChildren(nodeId) {
    const changed = [];

    // Select current node
    if (this.select(nodeId, true, true)) {
      changed.push(nodeId);
    }

    // Recursively process all child nodes
    const processChildren = (parentId) => {
      const children = this.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.select(childId, true, true)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);
    // publish insert mutli node in manage
    return changed;
  }

  // Recursively deselect all child nodes
  deselectAllChildren(nodeId) {
    const changed = [];

    // Recursively process all child nodes
    const processChildren = (parentId) => {
      const children = this.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.deselect(childId, true)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);
    // publish insert mutli node in manage
    return changed;
  }

  // Select ancestor nodes
  selectAncestors(nodeId) {
    const ancestors = this.getAncestorIds(nodeId);
    const changed = [];

    ancestors.forEach(ancestorId => {
      if (this.select(ancestorId, true, true)) {
        changed.push(ancestorId);
      }
    });
    // publish insert mutli node in manage
    return changed;
  }

  // Deselect ancestor nodes
  deselectAncestors(nodeId) {
    const ancestors = this.getAncestorIds(nodeId);
    const changed = [];

    ancestors.forEach(ancestorId => {
      if (this.deselect(ancestorId, true)) {
        changed.push(ancestorId);
      }
    });
    // publish insert mutli node in manage

    return changed;
  }

  // Select all nodes
  selectAll() {
    const changed = [];

    this.nodes.forEach((_, nodeId) => {
      if (this.select(nodeId, true, true)) {
        changed.push(nodeId);
      }
    });
    // publish insert mutli node in manage

    return changed;
  }

  // Deselect all nodes
  deselectAll() {
    const changed = [];

    this.nodes.forEach((_, nodeId) => {
      if (this.deselect(nodeId, true)) {
        changed.push(nodeId);
      }
    });

    // publish insert mutli node in manage
    return changed;
  }

  // Check if node is selected
  isSelected(nodeId) {
    return this.selected.has(nodeId);
  }

  //===============================================
  // Package related operations - Unchanged
  //===============================================

  // Select nodes by package name - optimized version
  selectByPackage(packageName, selected = true) {
    const changed = [];

    if (this.packageIDs.has(packageName)) {
      const ids = this.packageIDs.get(packageName);

      ids.forEach(nodeId => {
        if (selected ? this.select(nodeId, true, true) : this.deselect(nodeId, true)) {
          changed.push(nodeId);
        }
      });
    }
    // publish insert mutli node in manage

    return changed;
  }

  // Calculate package selection state (true: all selected, false: none selected, null: partially selected) - optimized version
  getPackageSelectionState(packageName) {
    if (!this.packageInfo.has(packageName)) return false;

    const totalCount = this.packageInfo.get(packageName).totalCount;
    const selectedCount = this.packageSelectedIDs.get(packageName).length;

    if (totalCount === 0) return false;
    if (selectedCount === 0) return false;
    if (selectedCount === totalCount) return true;
    return null; // Partially selected
  }

  // Get all package names - optimized version
  getAllPackages() {
    return Array.from(this.packageInfo.keys());
  }

  // Get package color - new method
  getPackageColor(packageName) {
    return this.packageInfo.has(packageName)
      ? this.packageInfo.get(packageName).color
      : '';
  }

  // Get all node IDs in package - new method
  getPackageNodeIds(packageName) {
    return this.packageIDs.has(packageName)
      ? [...this.packageIDs.get(packageName)]
      : [];
  }

  // Get selected node IDs in package - new method
  getPackageSelectedIds(packageName) {
    return this.packageSelectedIDs.has(packageName)
      ? [...this.packageSelectedIDs.get(packageName)]
      : [];
  }

  //===============================================
  // Highlight and focus related operations - Unchanged
  //===============================================

  // Set current focus node
  setCurrent(nodeId) {
    if (this.nodes.has(nodeId)) {
      // Record current node
      this.current = nodeId;

      return true;
    }
    return false;
  }

  // Highlight node
  highlight(nodeId, highlighted = true) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    if (state.highlight !== highlighted) {
      state.highlight = highlighted;
      return true;
    }

    return false;
  }

  // Clear all highlights
  clearAllHighlights() {
    const changed = [];

    this.nodes.forEach((_, nodeId) => {
      const state = this.state.get(nodeId);
      if (state.highlight) {
        state.highlight = false;
        changed.push(nodeId);
      }
    });

    return changed;
  }

  //===============================================
  // DOM elements and helper methods - Unchanged
  //===============================================

  // Set DOM element reference
  setNodeElement(nodeId, element) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.element = element;
      return true;
    }
    return false;
  }

  // Get node DOM element
  getNodeElement(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.element : null;
  }

  // Format time (helper method)
  formatTime(timeInNanos) {
    if (!timeInNanos) return '';
    return parseFloat(timeInNanos) + 'ns';
    //   const timeInMs = Math.round(timeInNanos / 1000000);
    //   return timeInMs >= 1000 ? 
    //     `${(timeInMs / 1000).toFixed(2)}s` : 
    //     `${timeInMs}ms`;
  }
}

// Export class
export { DataStore };