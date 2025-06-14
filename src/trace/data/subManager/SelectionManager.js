// SelectionManager.js - Node selection operations
/**
 * Manages all node selection operations including batch operations
 */
class SelectionManager {
  constructor(nodeStateManager, packageManager, threadManager, eventBus) {
    this.nodeStateManager = nodeStateManager;
    this.packageManager = packageManager;
    this.threadManager = threadManager;
    this.eventBus = eventBus;
  }

  /**
   * Select node
   */
  select(nodeId, selected = true, batch = false) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;

    const nodeInfo = this.nodeStateManager.nodes.get(nodeId);
    const packageName = nodeInfo.data.packageName;

    if (this.nodeStateManager.updateSelection(nodeId, selected)) {
      // Update package selected list
      if (packageName) {
        this.packageManager.updateNodeSelection(packageName, nodeId, selected);
      }

      // Event Bus publish
      if (this.eventBus) {
        this.eventBus.publish('nodeSelectionChanged', {
          nodeId,
          selected,
          packageName
        });
      }

      if (!batch) {
        // Trigger single insertion event
        this.eventBus.publish('changeSingleMethodByIdToClassviz', {
          nodeId,
          selected
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Deselect node
   */
  deselect(nodeId, batch = false) {
    return this.select(nodeId, false, batch);
  }

  /**
   * Check if node is selected
   */
  isSelected(nodeId) {
    return this.nodeStateManager.isSelected(nodeId);
  }

  /**
   * Select direct child nodes
   */
  selectChildren(nodeId) {
    const children = this.nodeStateManager.getChildrenIds(nodeId);
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

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, true);
    return changed;
  }

  /**
   * Deselect direct child nodes
   */
  deselectChildren(nodeId) {
    const children = this.nodeStateManager.getChildrenIds(nodeId);
    const changed = [];

    children.forEach(childId => {
      if (this.deselect(childId, true)) {
        changed.push(childId);
      }
    });

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, false);
    return changed;
  }

  /**
   * Recursively select all child nodes
   */
  selectAllChildren(nodeId) {
    const changed = [];

    // Select current node
    if (this.select(nodeId, true, true)) {
      changed.push(nodeId);
    }

    // Recursively process all child nodes
    const processChildren = (parentId) => {
      const children = this.nodeStateManager.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.select(childId, true, true)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, true);
    return changed;
  }

  /**
   * Recursively deselect all child nodes
   */
  deselectAllChildren(nodeId) {
    const changed = [];

    // Recursively process all child nodes
    const processChildren = (parentId) => {
      const children = this.nodeStateManager.getChildrenIds(parentId);

      children.forEach(childId => {
        if (this.deselect(childId, true)) {
          changed.push(childId);
        }

        // Continue processing children's children
        processChildren(childId);
      });
    };

    processChildren(nodeId);

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, false);
    return changed;
  }

  /**
   * Select direct parent node
   */
  selectParent(nodeId) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;
    
    const ancestors = this.nodeStateManager.getAncestorIds(nodeId);
    if (ancestors.length === 0) return false;
    
    const parentId = ancestors[0];
    const changed = [];
    
    if (this.select(parentId, true, false)) {
      changed.push(parentId);
    }
    
    return changed;
  }

  /**
   * Deselect direct parent node
   */
  deselectParent(nodeId) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;
    
    const ancestors = this.nodeStateManager.getAncestorIds(nodeId);
    if (ancestors.length === 0) return false;
    
    const parentId = ancestors[0];
    const changed = [];
    
    if (this.deselect(parentId, false)) {
      changed.push(parentId);
    }
    
    return changed;
  }

  /**
   * Select ancestor nodes
   */
  selectAncestors(nodeId) {
    const ancestors = this.nodeStateManager.getAncestorIds(nodeId);
    const changed = [];

    ancestors.forEach(ancestorId => {
      if (this.select(ancestorId, true, true)) {
        changed.push(ancestorId);
      }
    });

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, true);
    return changed;
  }

  /**
   * Deselect ancestor nodes
   */
  deselectAncestors(nodeId) {
    const ancestors = this.nodeStateManager.getAncestorIds(nodeId);
    const changed = [];

    ancestors.forEach(ancestorId => {
      if (this.deselect(ancestorId, true)) {
        changed.push(ancestorId);
      }
    });

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, false);
    return changed;
  }

  /**
   * Select all nodes in the current thread
   */
  selectAll() {
    const changed = [];
    const currentThreadName = this.threadManager.getCurrentThreadName();
    const currentThreadNodes = this.threadManager.getAllNodeIdsForThread(currentThreadName);

    currentThreadNodes.forEach(nodeId => {
      if (this.select(nodeId, true, true)) {
        changed.push(nodeId);
      }
    });

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, true);
    return changed;
  }

  /**
   * Deselect all nodes in the current thread
   */
  deselectAll() {
    const changed = [];
    const currentThreadName = this.threadManager.getCurrentThreadName();
    const currentThreadNodes = this.threadManager.getAllNodeIdsForThread(currentThreadName);

    currentThreadNodes.forEach(nodeId => {
      if (this.deselect(nodeId, true)) {
        changed.push(nodeId);
      }
    });

    // Publish insert multi node in manage
    this._publishMultiSelection(changed, false);
    return changed;
  }

  /**
   * Select nodes by package name for the current thread only
   */
  selectByPackage(packageName, selected = true) {
    return this.packageManager.selectByPackage(packageName, selected, this);
  }

  /**
   * Private method to publish multi-selection events
   */
  _publishMultiSelection(nodeIds, selected) {
    if (this.eventBus && nodeIds.length > 0) {
      this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
        nodeIds,
        selected
      });
    }
  }
}

export { SelectionManager };