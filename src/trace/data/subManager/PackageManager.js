// PackageManager.js - Package management operations
/**
 * Manages package-related data and operations
 */
class PackageManager {
  constructor(threadManager, eventBus) {
    this.threadManager = threadManager;
    this.eventBus = eventBus;
    
    // Package management structures
    this.packageInfo = new Map(); // Mapping from package name to {totalCount:0, color:""}
    this.packageIDs = new Map(); // Mapping from package name to all node ID arrays
    this.packageSelectedIDs = new Map(); // Mapping from package name to selected node ID arrays
  }

  /**
   * Initialize package information for a node
   */
  initPackageForNode(node) {
    if (!node.packageName) return;

    const packageName = node.packageName;

    // Initialize package information
    if (!this.packageInfo.has(packageName)) {
      this.packageInfo.set(packageName, {
        totalCount: 0,
        color: node.color || ''
      });
      this.packageIDs.set(packageName, []);
      this.packageSelectedIDs.set(packageName, []);
    }

    // Update package information
    const info = this.packageInfo.get(packageName);
    info.totalCount++;
    if (!info.color && node.color) {
      info.color = node.color;
    }

    // Add node ID to package ID list
    this.packageIDs.get(packageName).push(node.id);

    // If node is already selected, add to selected ID list
    if (node.selected) {
      this.packageSelectedIDs.get(packageName).push(node.id);
    }
  }

  /**
   * Update node selection in package
   */
  updateNodeSelection(packageName, nodeId, selected) {
    if (!this.packageSelectedIDs.has(packageName)) return;

    const selectedIds = this.packageSelectedIDs.get(packageName);

    if (selected) {
      if (!selectedIds.includes(nodeId)) {
        selectedIds.push(nodeId);
      }
    } else {
      const index = selectedIds.indexOf(nodeId);
      if (index !== -1) {
        selectedIds.splice(index, 1);
      }
    }
  }

  /**
   * Select nodes by package name for the current thread only
   */
  selectByPackage(packageName, selected, selectionManager) {
    const changed = [];
    const currentThreadName = this.threadManager.getCurrentThreadName();

    if (!currentThreadName || !this.packageIDs.has(packageName)) {
      return changed;
    }

    // Get all IDs for this package
    const allPackageIds = this.packageIDs.get(packageName);

    // Only process nodes that belong to the current thread
    allPackageIds.forEach(nodeId => {
      // Check if this node belongs to the current thread
      if (this.threadManager.getThreadForNodeId(nodeId) === currentThreadName) {
        if (selected ? selectionManager.select(nodeId, true, true) : selectionManager.deselect(nodeId, true)) {
          changed.push(nodeId);
        }
      }
    });

    // Publish insert multi node in manage
    if (this.eventBus && changed.length > 0) {
      this.eventBus.publish('changeMultiMethodByIdsToClassviz', {
        nodeIds: changed,
        selected
      });
    }

    return changed;
  }

  /**
   * Calculate package selection state (true: all selected, false: none selected, null: partially selected)
   * Only considers nodes in the current thread
   */
  getPackageSelectionState(packageName, nodeStateManager) {
    const currentThreadName = this.threadManager.getCurrentThreadName();

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
      if (this.threadManager.getThreadForNodeId(nodeId) === currentThreadName) {
        totalCountInThread++;
        if (nodeStateManager.isSelected(nodeId)) {
          selectedCountInThread++;
        }
      }
    });

    if (totalCountInThread === 0) return false;
    if (selectedCountInThread === 0) return false;
    if (selectedCountInThread === totalCountInThread) return true;
    return null; // Partially selected
  }

  /**
   * Get all package names for the current thread
   */
  getAllPackages() {
    const currentThreadName = this.threadManager.getCurrentThreadName();
    if (!currentThreadName) return [];

    return this.threadManager.getPackagesForThread(currentThreadName);
  }

  /**
   * Get package color
   */
  getPackageColor(packageName) {
    return this.packageInfo.has(packageName)
      ? this.packageInfo.get(packageName).color
      : '';
  }

  /**
   * Get all node IDs in package for the current thread only
   */
  getPackageNodeIds(packageName) {
    const currentThreadName = this.threadManager.getCurrentThreadName();

    if (!currentThreadName || !this.packageIDs.has(packageName)) {
      return [];
    }

    // Get all IDs for this package
    const allPackageIds = this.packageIDs.get(packageName);

    // Filter to only include nodes from the current thread
    return allPackageIds.filter(nodeId =>
      this.threadManager.getThreadForNodeId(nodeId) === currentThreadName
    );
  }

  /**
   * Get selected node IDs in package for the current thread only
   */
  getPackageSelectedIds(packageName) {
    const currentThreadName = this.threadManager.getCurrentThreadName();

    if (!currentThreadName || !this.packageSelectedIDs.has(packageName)) {
      return [];
    }

    // Get all selected IDs for this package
    const allSelectedIds = this.packageSelectedIDs.get(packageName);

    // Filter to only include nodes from the current thread
    return allSelectedIds.filter(nodeId =>
      this.threadManager.getThreadForNodeId(nodeId) === currentThreadName
    );
  }

  /**
   * Clear all package data
   */
  clear() {
    this.packageInfo.clear();
    this.packageIDs.clear();
    this.packageSelectedIDs.clear();
  }
}

export { PackageManager };