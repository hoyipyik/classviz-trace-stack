// NodeStateManager.js - Node state and relationship management
/**
 * Manages node states, parent-child relationships, and basic node operations
 */
class NodeStateManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Node data structures
    this.nodes = new Map();  // Mapping from node ID to node data
    this.state = new Map();  // Mapping from node ID to node state
    this.parents = new Map(); // Mapping from node ID to parent node ID
    this.children = new Map(); // Mapping from node ID to child node ID array
    this.selected = new Set(); // Set of all selected node IDs
    
    // Current focus node
    this.current = null;
  }

  /**
   * Add a node to the manager
   */
  addNode(node, parentId = null) {
    if (!node || !node.id) return false;

    // Store node data
    this.nodes.set(node.id, { data: node });

    // Set initial state
    this.state.set(node.id, {
      selected: node.selected || false,
      expanded: !node.collapsed,
      highlight: false
    });

    // Set parent-child relationships
    if (parentId) {
      this.parents.set(node.id, parentId);

      if (!this.children.has(parentId)) {
        this.children.set(parentId, []);
      }
      this.children.get(parentId).push(node.id);
    }

    // Handle initial selection
    if (node.selected) {
      this.selected.add(node.id);
    }

    return true;
  }

  /**
   * Get node data by node ID
   */
  getNodeDataById(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.data : null;
  }

  /**
   * Get node state
   */
  getNodeState(nodeId) {
    return this.state.get(nodeId) || {
      selected: false,
      expanded: false,
      highlight: false
    };
  }

  /**
   * Get all child node IDs for a node
   */
  getChildrenIds(nodeId) {
    return this.children.get(nodeId) || [];
  }

  /**
   * Get all parent node IDs for a node
   */
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

  /**
   * Check if node exists
   */
  hasNode(nodeId) {
    return this.nodes.has(nodeId);
  }

  /**
   * Check if node is selected
   */
  isSelected(nodeId) {
    return this.selected.has(nodeId);
  }

  /**
   * Set current focus node
   */
  setCurrent(nodeId) {
    if (this.nodes.has(nodeId)) {
      this.current = nodeId;
      return true;
    }
    return false;
  }

  /**
   * Get current focus node
   */
  getCurrent() {
    return this.current;
  }

  /**
   * Highlight node
   */
  highlight(nodeId, highlighted = true) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    if (state.highlight !== highlighted) {
      state.highlight = highlighted;
      return true;
    }

    return false;
  }

  /**
   * Clear all highlights
   */
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

  /**
   * Set DOM element reference
   */
  setNodeElement(nodeId, element) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.element = element;
      return true;
    }
    return false;
  }

  /**
   * Get node DOM element
   */
  getNodeElement(nodeId) {
    const node = this.nodes.get(nodeId);
    return node ? node.element : null;
  }

  /**
   * Update node selection state
   */
  updateSelection(nodeId, selected) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);

    if (state.selected !== selected) {
      // Update state mapping
      state.selected = selected;

      // Update selected collection
      if (selected) {
        this.selected.add(nodeId);
      } else {
        this.selected.delete(nodeId);
      }

      // Sync back to original tree data
      nodeInfo.data.selected = selected;

      return true;
    }

    return false;
  }

  /**
   * Update node expansion state
   */
  updateExpansion(nodeId, expanded) {
    if (!this.nodes.has(nodeId)) return false;

    const state = this.state.get(nodeId);
    const nodeInfo = this.nodes.get(nodeId);

    // Update state mapping
    state.expanded = expanded;

    // Sync back to original tree data
    nodeInfo.data.collapsed = !expanded;

    return true;
  }

  /**
   * Get all selected node IDs
   */
  getAllSelected() {
    return Array.from(this.selected);
  }

  /**
   * Get all node IDs
   */
  getAllNodeIds() {
    return Array.from(this.nodes.keys());
  }

  /**
   * Clear all data
   */
  clear() {
    this.nodes.clear();
    this.state.clear();
    this.parents.clear();
    this.children.clear();
    this.selected.clear();
    this.current = null;
  }

  /**
   * Save DOM element references before clearing
   */
  saveElementReferences() {
    const savedElements = new Map();
    this.nodes.forEach((node, nodeId) => {
      if (node.element) {
        savedElements.set(nodeId, node.element);
      }
    });
    return savedElements;
  }

  /**
   * Restore DOM element references after rebuilding
   */
  restoreElementReferences(savedElements) {
    savedElements.forEach((element, nodeId) => {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.element = element;
      }
    });
  }
}

export { NodeStateManager };