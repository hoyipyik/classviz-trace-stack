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
    
    // Maps and collections
    this.nodes = new Map();  // Mapping from node ID to node data
    this.state = new Map();  // Mapping from node ID to node state
    this.parents = new Map(); // Mapping from node ID to parent node ID
    this.children = new Map(); // Mapping from node ID to child node ID array
    this.selected = new Set(); // Set of all selected node IDs
    
    // Package name mapping related
    this.packageInfo = new Map(); // Mapping from package name to {totalCount:0, color:""}
    this.packageIDs = new Map(); // Mapping from package name to all node ID arrays
    this.packageSelectedIDs = new Map(); // Mapping from package name to selected node ID arrays
    
    // Current node
    this.current = null;

    // Flame Chart related settings
    this.showLogical = true; // Default display logical view
    // Trace mode for classviz
    this.traceMode = false  // Default trace mode is call graph mode
  
    // Application settings
    this.settings = {
      autoExpand: false
    };
    
    // Initialize data - select the first thread as the default thread
    const threadNames = Object.keys(threadsData);
    if (threadNames.length > 0) {
      this.switchThread(threadNames[0]);
    }
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
  // Thread switching
  //===============================================
  
  // Get all thread names
  getAllThreadNames() {
    return Object.keys(this.threadsData);
  }
  
  // Get current thread name
  getCurrentThreadName() {
    return this.currentThreadName;
  }
  
  // Switch to specified thread
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
    
    // Clear existing data
    this.resetDataStructures();
    
    // Reinitialize with new thread data
    this.initFromData(this.tree);
    
    // Trigger thread change event
    if (this.eventBus) {
      this.eventBus.publish('threadChanged', {
        threadName: this.currentThreadName
      });
    }
    
    return true;
  }
  
  // Reset data structures
  resetDataStructures() {
    this.nodes.clear();
    this.state.clear();
    this.parents.clear();
    this.children.clear();
    this.selected.clear();
    this.packageInfo.clear();
    this.packageIDs.clear();
    this.packageSelectedIDs.clear();
    this.current = null;
  }
  
  //===============================================
  // Initialization and data access
  //===============================================
  
  // Initialize all mappings from raw data
  initFromData(node, parentId = null) {
    if (!node || !node.id) return;
    
    // Store node data
    this.nodes.set(node.id, { data: node });
    
    // Set initial state
    this.state.set(node.id, {
      selected: node.selected || false,
      expanded: !node.collapsed,
      highlight: false
    });
    
    // Handle package name mapping
    if (node.packageName) {
      // Initialize package information
      if (!this.packageInfo.has(node.packageName)) {
        this.packageInfo.set(node.packageName, {
          totalCount: 0,
          color: node.color || ''
        });
        this.packageIDs.set(node.packageName, []);
        this.packageSelectedIDs.set(node.packageName, []);
      }
      
      // Update package information
      const info = this.packageInfo.get(node.packageName);
      info.totalCount++;
      if (!info.color && node.color) {
        info.color = node.color;
      }
      
      // Add node ID to package ID list
      this.packageIDs.get(node.packageName).push(node.id);
      
      // If node is already selected, add to selected ID list
      if (node.selected) {
        this.packageSelectedIDs.get(node.packageName).push(node.id);
        this.selected.add(node.id);
      }
    }
    
    // Set parent-child relationship
    if (parentId) {
      this.parents.set(node.id, parentId);
      
      if (!this.children.has(parentId)) {
        this.children.set(parentId, []);
      }
      this.children.get(parentId).push(node.id);
    }
    
    // Recursively process child nodes
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.initFromData(child, node.id);
      });
    }
  }
  
  // Get node raw data
  getNodeData(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.data : null;
  }
  
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
  // Node expand/collapse operations
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
  // Node select/deselect operations
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
  // Package related operations
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
  // Highlight and focus related operations
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
  // DOM elements and helper methods
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