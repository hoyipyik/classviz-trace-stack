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
    this.packageInfo = new Map(); // Mapping from package name to {totalCount:0, color:""export { DataStore };
    this.packageIDs = new Map(); // Mapping from package name to all node ID arrays
    this.packageSelectedIDs = new Map(); // Mapping from package name to selected node ID arrays
    
    // Thread-specific package mappings
    this.threadToPackageMap = new Map(); // Mapping from thread name to Set of package names in that thread

    // Current node id
    this.current = null;

    // All threads' nodes mapping
    // Format: threadName -> Map(nodeId -> nodeData)
    this.allThreadsNodes = new Map();

    // Flame Chart related settings
    this.showLogical = true; // Default display logical view
    // Trace mode for classviz
    this.traceMode = true;  // Default trace mode is call graph mode

    // Application settings
    this.settings = {
      autoExpand: true, // Default auto-expand nodes
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
  // Initialization and access methods for global thread nodes mapping
  //===============================================

  // Initialize all thread node mappings
  initAllThreadsNodes() {
    // Iterate through all threads
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // Create node mapping for each thread
      const threadNodes = new Map();

      // Set to global mapping
      this.allThreadsNodes.set(threadName, threadNodes);

      // Build node mapping
      this.buildThreadNodesMap(threadName, threadData);
    });
  }

  // Build node mapping for a specific thread
  buildThreadNodesMap(threadName, threadData) {
    const threadNodes = this.allThreadsNodes.get(threadName);

    // Recursively build node mapping
    const buildNodeMap = (node) => {
      if (!node || !node.id) return;

      // Only store node ID to node data mapping
      threadNodes.set(node.id, { data: node });

      // Recursively process child nodes
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          buildNodeMap(child);
        });
      }
    };

    // Start building mapping from the root node
    buildNodeMap(threadData);
  }

  //===============================================
  // Initialize data for all threads
  //===============================================

  // Initialize all data for all threads
  initAllThreadsData() {
    // Initialize thread-to-package mappings
    Object.keys(this.threadsData).forEach(threadName => {
      this.threadToPackageMap.set(threadName, new Set());
    });

    // Iterate through all threads
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // Create node ID array for each thread
      this.threadToNodesMap.set(threadName, []);

      // Initialize all data for this thread
      this.initThreadData(threadName, threadData);
    });
  }

  // Initialize data for a specific thread
  initThreadData(threadName, node, parentId = null) {
    if (!node || !node.id) return;

    // Store node data
    this.nodes.set(node.id, { data: node });

    // Store node ID to thread mapping
    this.originalIdToThreadMap.set(node.id, threadName);

    // Store thread to node ID mapping
    this.threadToNodesMap.get(threadName).push(node.id);

    // Set initial state
    this.state.set(node.id, {
      selected: node.selected || false,
      expanded: !node.collapsed,
      highlight: false
    });

    // Process package name mapping
    if (node.packageName) {
      // Add package name to thread's package set
      this.threadToPackageMap.get(threadName).add(node.packageName);
      
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

    // Set parent-child relationships
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
        this.initThreadData(threadName, child, node.id);
      });
    }
  }
  /**
    * Compress or decompress recursive tree nodes
    * @param {string} nodeId - Node ID of the recursive entry point
    * @param {boolean} compress - true for compression, false for restoration
    * @returns {boolean} - Whether the operation was successful
    */
  compressRecursiveTree(nodeId, compress = true) {
    // Get node data
    const nodeInfo = this.nodes.get(nodeId);
    if (!nodeInfo || !nodeInfo.data) return false;

    const nodeData = nodeInfo.data;

    // If node is not a recursive entry point, return
    if (!nodeData.status || !nodeData.status.recursiveEntryPoint) {
      return false;
    }

    // Get the current node's children
    const children = nodeData.children || [];

    // Get recursive node's label (method name)
    const recursiveLabel = nodeData.label;

    // If it's a compression operation
    if (compress) {
      // Already compressed, no need to operate again
      if (nodeData._originalChildren) {
        return false;
      }

      // Deep copy the original children structure for future restoration
      nodeData._originalChildren = JSON.parse(JSON.stringify(children));

      // For storing merged direct children
      // Key is the child tree's call path signature, value is the child tree node
      const mergedDirectChildren = new Map();

      // For storing exit nodes (leaf nodes without recursive calls)
      const exitNodes = [];

      // For storing node IDs that need to be deselected
      const nodesToDeselect = new Set();

      // Collect all non-recursive direct children and exit nodes, also record all visited nodes
      const collectNodes = (nodes, isDirectChild = true) => {
        for (const child of nodes) {
          // Record current node ID for later deselection
          nodesToDeselect.add(child.id);

          // Check if the node is a recursive exit node
          const isExitNode = (node) => {
            // Must be a recursive label
            if (node.label !== recursiveLabel) {
              return false;
            }

            // If no children, it's an exit node
            if (!node.children || node.children.length === 0) {
              return true;
            }

            // Check if there are recursive calls in the children
            for (const childNode of node.children || []) {
              if (childNode.label === recursiveLabel) {
                return false; // Has recursive calls, not an exit node
              }
            }

            return true; // Is a recursive label, and children don't contain recursive calls, so it's an exit node
          };

          if (isExitNode(child)) {
            // It's an exit node, keep it entirely
            // console.log("Found exit node:", child.label);
            const exitNode = JSON.parse(JSON.stringify(child));
            exitNode.isExit = true;
            // Set correct parentId
            exitNode.parentId = nodeId;
            exitNodes.push(exitNode);
          } else if (child.label === recursiveLabel) {
            // This is a recursive call but not an exit node, continue looking downward
            collectNodes(child.children || [], false);
          } else {
            // Non-recursive label node, generate path signature and merge
            const pathSignature = generatePathSignature(child);

            if (mergedDirectChildren.has(pathSignature)) {
              // Node with the same path signature already exists, merge
              const existingNode = mergedDirectChildren.get(pathSignature);
              const currentNode = JSON.parse(JSON.stringify(child));

              // Set correct parentId
              currentNode.parentId = nodeId;

              // Use the node with the smaller ID as the preserved node
              let targetNode, sourceNode;
              if (parseInt(existingNode.id) < parseInt(currentNode.id)) {
                targetNode = existingNode;
                sourceNode = currentNode;
              } else {
                targetNode = currentNode;
                sourceNode = existingNode;
                // Update the node in the Map
                mergedDirectChildren.set(pathSignature, targetNode);
              }

              // Merge frequency
              targetNode.freq = (targetNode.freq || 1) + (sourceNode.freq || 1);
            } else {
              // First time encountering this path signature
              const clonedChild = JSON.parse(JSON.stringify(child));
              // Set correct parentId
              clonedChild.parentId = nodeId;
              clonedChild.freq = clonedChild.freq || 1;
              mergedDirectChildren.set(pathSignature, clonedChild);
            }
          }

          // Recursively process children, collect more nodes that need to be deselected
          if (child.children && child.children.length > 0) {
            // Recursively traverse all child nodes, record node IDs
            collectChildrenIds(child.children, nodesToDeselect);
          }
        }
      };

      // Helper function: recursively collect all child node IDs
      const collectChildrenIds = (nodes, idSet) => {
        for (const node of nodes) {
          idSet.add(node.id);
          if (node.children && node.children.length > 0) {
            collectChildrenIds(node.children, idSet);
          }
        }
      };

      // Generate path signature for a node
      const generatePathSignature = (node) => {
        // Basic signature is the node's label
        let signature = node.label;

        // If there are child nodes, recursively generate signatures for child nodes
        if (node.children && node.children.length > 0) {
          // Collect signatures for all child nodes
          const childSignatures = [];
          for (const child of node.children) {
            // Skip recursive calls
            if (child.label === recursiveLabel) {
              continue;
            }
            childSignatures.push(generatePathSignature(child));
          }

          // Sort child node signatures to ensure that trees with the same structure generate the same signature
          childSignatures.sort();

          // Add child node signatures to the current node's signature
          if (childSignatures.length > 0) {
            signature += "[" + childSignatures.join(",") + "]";
          }
        }

        return signature;
      };

      // Start collecting from the current node's children
      collectNodes(children);

      // Convert merged direct children to an array
      const mergedChildrenArray = Array.from(mergedDirectChildren.values());

      // Merge direct children and exit nodes
      const newChildren = [...mergedChildrenArray, ...exitNodes];

      // Update the node's children to the compressed result
      nodeData.children = newChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));;

      // Update node's compression state
      nodeData.compressed = true;

      // console.log("finish compression")
      // this.printNodeData(nodeId);

      // Rebuild all data relationships
      this.rebuildDataStructures();

      // console.log("finish decompression")

      // this.printNodeData(nodeId);


      // Trigger update event
      if (this.eventBus) {
        this.eventBus.publish('nodeStructureChanged', {
          nodeId,
          compressed: true
        });
      }

      return true;
    } else {
      // Restoration operation

      // If no saved original structure, cannot restore
      if (!nodeData._originalChildren) {
        return false;
      }

      // Restore original children structure
      nodeData.children = JSON.parse(JSON.stringify(nodeData._originalChildren));

      // Clear saved original structure
      delete nodeData._originalChildren;

      // Update node's compression state
      nodeData.compressed = false;

      // Rebuild all data relationships
      this.rebuildDataStructures();

      // console.log("finish decompression")

      // this.printNodeData(nodeId);

      // Trigger update event
      if (this.eventBus) {
        this.eventBus.publish('nodeStructureChanged', {
          nodeId,
          compressed: false
        });
      }

      return true;
    }
  }


  /**
 * Rebuilds data structures for the current thread only
 * Safely preserves DOM element references 
 */
  rebuildDataStructures() {
    // Step 1: Save all DOM element references with their node IDs
    const savedElements = new Map();
    this.nodes.forEach((node, nodeId) => {
      if (node.element) {
        savedElements.set(nodeId, node.element);
      }
    });

    // Step 2: Create new empty Maps and Sets (no reference issues)
    const newNodes = new Map();
    const newState = new Map();
    const newParents = new Map();
    const newChildren = new Map();
    const newSelected = new Set();
    const newOriginalIdToThreadMap = new Map();
    const newThreadToNodesMap = new Map();
    const newPackageInfo = new Map();
    const newPackageIDs = new Map();
    const newPackageSelectedIDs = new Map();
    const newThreadToPackageMap = new Map();

    // Step 3: Replace the current maps with the new empty ones
    this.nodes = newNodes;
    this.state = newState;
    this.parents = newParents;
    this.children = newChildren;
    this.selected = newSelected;
    this.originalIdToThreadMap = newOriginalIdToThreadMap;
    this.threadToNodesMap = newThreadToNodesMap;
    this.packageInfo = newPackageInfo;
    this.packageIDs = newPackageIDs;
    this.packageSelectedIDs = newPackageSelectedIDs;
    this.threadToPackageMap = newThreadToPackageMap;

    // Step 4: Rebuild all thread mappings and data
    this.initAllThreadsNodes();
    this.initAllThreadsData();

    // Step 5: Restore the current thread
    if (this.currentThreadName) {
      this.switchThread(this.currentThreadName);
    }

    // Step 6: Restore DOM element references
    savedElements.forEach((element, nodeId) => {
      const node = this.nodes.get(nodeId);
      if (node) {
        // Simply assign the saved element to the new node object
        node.element = element;
      }
    });

    console.log("Data structures rebuilt with element references safely preserved");
  }

  getNodeDataById(nodeId) {
    // Get directly from the global nodes table
    const node = this.nodes.get(nodeId);
    return node ? node.data : null;
  }

  // Get node data by thread name and node ID
  getNodeDataByThreadAndId(threadName, nodeId) {
    const threadNodes = this.allThreadsNodes.get(threadName);
    if (!threadNodes) return null;

    const node = threadNodes.get(nodeId);
    return node ? node.data : null;
  }

  // Get all node IDs for a specific thread
  getAllNodeIdsForThread(threadName) {
    return this.threadToNodesMap.get(threadName) || [];
  }

  // Get the thread that a node ID belongs to
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
    console.log(state.expanded, "expand state has updated hihihih")

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
  // Node select/deselect operations - MODIFIED
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

      if (!batch) {
        // triger single insertion event
        this.eventBus.publish('changeSingleMethodByIdToClassviz', {
          nodeId,
          selected
        });
      }

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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: true
    });
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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: false
    });
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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: true
    });
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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: false
    });
    return changed;
  }

  // Select direct parent node
selectParent(nodeId) {
  // Check if node exists
  if (!this.nodes.has(nodeId)) return false;
  
  // Check if node has a parent
  if (!this.parents.has(nodeId)) return false;
  
  const parentId = this.parents.get(nodeId);
  const changed = [];
  
  // Select the parent node
  if (this.select(parentId, true, false)) {
    changed.push(parentId);
  }
  
  return changed;
}

// Deselect direct parent node
deselectParent(nodeId) {
  // Check if node exists
  if (!this.nodes.has(nodeId)) return false;
  
  // Check if node has a parent
  if (!this.parents.has(nodeId)) return false;
  
  const parentId = this.parents.get(nodeId);
  const changed = [];
  
  // Deselect the parent node
  if (this.deselect(parentId, false)) {
    changed.push(parentId);
  }
  
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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: true
    });
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
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: false
    });
    return changed;
  }

  // Select all nodes in the current thread
  selectAll() {
    const changed = [];
    const currentThreadNodes = this.getAllNodeIdsForThread(this.currentThreadName);

    currentThreadNodes.forEach(nodeId => {
      if (this.select(nodeId, true, true)) {
        changed.push(nodeId);
      }
    });

    // publish insert mutli node in manage
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: true
    });

    return changed;
  }

  // Deselect all nodes in the current thread
  deselectAll() {
    const changed = [];
    const currentThreadNodes = this.getAllNodeIdsForThread(this.currentThreadName);

    currentThreadNodes.forEach(nodeId => {
      if (this.deselect(nodeId, true)) {
        changed.push(nodeId);
      }
    });

    // publish insert mutli node in manage
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected: false
    });
    return changed;
  }

  // Check if node is selected
  isSelected(nodeId) {
    return this.selected.has(nodeId);
  }

  //===============================================
  // Package related operations
  //===============================================

  // Select nodes by package name for the current thread only
  selectByPackage(packageName, selected = true) {
    const changed = [];
    const currentThreadName = this.currentThreadName;

    if (!currentThreadName || !this.packageIDs.has(packageName)) {
      return changed;
    }

    // Get all IDs for this package
    const allPackageIds = this.packageIDs.get(packageName);

    // Only process nodes that belong to the current thread
    allPackageIds.forEach(nodeId => {
      // Check if this node belongs to the current thread
      if (this.getThreadForNodeId(nodeId) === currentThreadName) {
        if (selected ? this.select(nodeId, true, true) : this.deselect(nodeId, true)) {
          changed.push(nodeId);
        }
      }
    });

    // publish insert multi node in manage
    this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
      nodeIds: changed,
      selected
    });

    return changed;
  }

  // Calculate package selection state (true: all selected, false: none selected, null: partially selected)
  // Only considers nodes in the current thread
  getPackageSelectionState(packageName) {
    const currentThreadName = this.currentThreadName;

    if (!currentThreadName || !this.packageInfo.has(packageName)) {
      return false;
    }

    // Count total nodes and selected nodes for this package in the current thread
    let totalCountInThread = 0;
    let selectedCountInThread = 0;

    // Get all IDs for this package
    const allPackageIds = this.packageIDs.get(packageName);

    // Count only nodes that belong to the current thread
    allPackageIds.forEach(nodeId => {
      if (this.getThreadForNodeId(nodeId) === currentThreadName) {
        totalCountInThread++;
        if (this.isSelected(nodeId)) {
          selectedCountInThread++;
        }
      }
    });

    if (totalCountInThread === 0) return false;
    if (selectedCountInThread === 0) return false;
    if (selectedCountInThread === totalCountInThread) return true;
    return null; // Partially selected
  }

  // Get all package names for the current thread
  getAllPackages() {
    const currentThreadName = this.currentThreadName;
    if (!currentThreadName) return [];

    // Return the set of packages for the current thread
    const threadPackages = this.threadToPackageMap.get(currentThreadName);
    return threadPackages ? Array.from(threadPackages) : [];
  }

  // Get package color
  getPackageColor(packageName) {
    return this.packageInfo.has(packageName)
      ? this.packageInfo.get(packageName).color
      : '';
  }

  // Get all node IDs in package for the current thread only
  getPackageNodeIds(packageName) {
    const currentThreadName = this.currentThreadName;

    if (!currentThreadName || !this.packageIDs.has(packageName)) {
      return [];
    }

    // Get all IDs for this package
    const allPackageIds = this.packageIDs.get(packageName);

    // Filter to only include nodes from the current thread
    return allPackageIds.filter(nodeId =>
      this.getThreadForNodeId(nodeId) === currentThreadName
    );
  }

  // Get selected node IDs in package for the current thread only
  getPackageSelectedIds(packageName) {
    const currentThreadName = this.currentThreadName;

    if (!currentThreadName || !this.packageSelectedIDs.has(packageName)) {
      return [];
    }

    // Get all selected IDs for this package
    const allSelectedIds = this.packageSelectedIDs.get(packageName);

    // Filter to only include nodes from the current thread
    return allSelectedIds.filter(nodeId =>
      this.getThreadForNodeId(nodeId) === currentThreadName
    );
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

export { DataStore };