// TreeOperations.js - Tree manipulation operations
/**
 * Handles tree expansion, collapse, and compression operations
 */
class TreeOperations {
  constructor(nodeStateManager, eventBus) {
    this.nodeStateManager = nodeStateManager;
    this.eventBus = eventBus;
  }

  /**
   * Expand node
   */
  expand(nodeId) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;

    const state = this.nodeStateManager.getNodeState(nodeId);

    if (!state.expanded) {
      this.nodeStateManager.updateExpansion(nodeId, true);
      return true;
    }

    return false;
  }

  /**
   * Collapse node
   */
  collapse(nodeId) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;

    const state = this.nodeStateManager.getNodeState(nodeId);

    if (state.expanded) {
      this.nodeStateManager.updateExpansion(nodeId, false);
      return true;
    }

    return false;
  }

  /**
   * Toggle node expand/collapse state
   */
  toggleExpand(nodeId) {
    if (!this.nodeStateManager.hasNode(nodeId)) return false;

    const state = this.nodeStateManager.getNodeState(nodeId);
    const newExpandedState = !state.expanded;

    this.nodeStateManager.updateExpansion(nodeId, newExpandedState);
    console.log(newExpandedState, "expand state has updated");

    return true;
  }

  /**
   * Expand all descendant nodes
   */
  expandAllDescendants(nodeId) {
    const changed = [];

    // Expand current node
    if (this.expand(nodeId)) {
      changed.push(nodeId);
    }

    // Recursively expand all child nodes
    const processChildren = (parentId) => {
      const children = this.nodeStateManager.getChildrenIds(parentId);

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

  /**
   * Collapse all descendant nodes
   */
  collapseAllDescendants(nodeId) {
    const changed = [];

    // Recursively collapse all child nodes
    const processChildren = (parentId) => {
      const children = this.nodeStateManager.getChildrenIds(parentId);

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

  /**
   * Compress or decompress recursive tree nodes
   * @param {string} nodeId - Node ID of the recursive entry point
   * @param {boolean} compress - true for compression, false for restoration
   * @param {Function} rebuildCallback - Callback to rebuild data structures
   * @returns {boolean} - Whether the operation was successful
   */
  compressRecursiveTree(nodeId, compress = true, rebuildCallback = null) {
    // Get node data
    const nodeInfo = this.nodeStateManager.nodes.get(nodeId);
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
            const pathSignature = this._generatePathSignature(child, recursiveLabel);

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
            this._collectChildrenIds(child.children, nodesToDeselect);
          }
        }
      };

      // Start collecting from the current node's children
      collectNodes(children);

      // Convert merged direct children to an array
      const mergedChildrenArray = Array.from(mergedDirectChildren.values());

      // Merge direct children and exit nodes
      const newChildren = [...mergedChildrenArray, ...exitNodes];

      // Update the node's children to the compressed result
      nodeData.children = newChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));

      // Update node's compression state
      nodeData.compressed = true;

      // Rebuild all data relationships if callback provided
      if (rebuildCallback) {
        rebuildCallback();
      }

      // Trigger update event
      if (this.eventBus) {
        this.eventBus.publish('nodeCompressionTriggered', {
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

      // Rebuild all data relationships if callback provided
      if (rebuildCallback) {
        rebuildCallback();
      }

      // Trigger update event
      if (this.eventBus) {
        this.eventBus.publish('nodeCompressionTriggered', {
          nodeId,
          compressed: false
        });
      }

      return true;
    }
  }

  /**
   * Helper function: recursively collect all child node IDs
   */
  _collectChildrenIds(nodes, idSet) {
    for (const node of nodes) {
      idSet.add(node.id);
      if (node.children && node.children.length > 0) {
        this._collectChildrenIds(node.children, idSet);
      }
    }
  }

  /**
   * Generate path signature for a node
   */
  _generatePathSignature(node, recursiveLabel) {
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
        childSignatures.push(this._generatePathSignature(child, recursiveLabel));
      }

      // Sort child node signatures to ensure that trees with the same structure generate the same signature
      childSignatures.sort();

      // Add child node signatures to the current node's signature
      if (childSignatures.length > 0) {
        signature += "[" + childSignatures.join(",") + "]";
      }
    }

    return signature;
  }
}

export { TreeOperations };