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

    if (compress) {
      return this._performCompression(nodeData, nodeId, rebuildCallback);
    } else {
      return this._performDecompression(nodeData, nodeId, rebuildCallback);
    }
  }

  /**
   * Perform compression operation
   */
  _performCompression(nodeData, nodeId, rebuildCallback) {
    // Already compressed, no need to operate again
    if (nodeData._originalChildren) {
      return false;
    }

    // Step 1: Setup - record recursive label and original children
    const recursiveLabel = nodeData.label;
    const originalChildren = nodeData.children || [];
    
    // Save original for restoration
    nodeData._originalChildren = JSON.parse(JSON.stringify(originalChildren));

    // Step 2: Initialize collections
    const exitNodes = [];
    const subtreeMap = new Map(); // signature -> {frequency, subtree}
    const processingQueue = [...originalChildren]; // nodes to process

    // Step 3: Process all children (traverse the tree)
    while (processingQueue.length > 0) {
      const currentNode = processingQueue.shift();

      if (currentNode.label === recursiveLabel) {
        // This is a recursive node - check if it's an exit node
        const hasRecursiveChildren = (currentNode.children || []).some(
          child => child.label === recursiveLabel
        );

        if (hasRecursiveChildren) {
          // Continue traversing deeper - add children to queue
          processingQueue.push(...(currentNode.children || []));
        } else {
          // This is an exit node - preserve completely
          const exitNode = JSON.parse(JSON.stringify(currentNode));
          exitNode.isExit = true;
          exitNode.parentId = nodeId;
          exitNodes.push(exitNode);
        }
      } else {
        // This is a regular subtree - generate signature and merge
        const signature = this._generatePathSignature(currentNode, recursiveLabel);
        
        if (subtreeMap.has(signature)) {
          // Merge: increment frequency
          const existing = subtreeMap.get(signature);
          existing.frequency += 1;
        } else {
          // New pattern: add to map
          const subtree = JSON.parse(JSON.stringify(currentNode));
          subtree.parentId = nodeId;
          subtreeMap.set(signature, {
            frequency: 1,
            subtree: subtree
          });
        }
      }
    }

    // Step 4: Reconstruct compressed tree
    const compressedChildren = [];

    // Add all merged subtrees from map
    for (const entry of subtreeMap.values()) {
      entry.subtree.freq = entry.frequency;
      compressedChildren.push(entry.subtree);
    }

    // Add all exit nodes
    for (const exitNode of exitNodes) {
      compressedChildren.push(exitNode);
    }

    // Step 5: Update entry node
    nodeData.children = compressedChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    nodeData.compressed = true;

    // Handle completion
    this._handleCompressionComplete(nodeId, true, rebuildCallback);
    
    return true;
  }

  /**
   * Perform decompression operation
   */
  _performDecompression(nodeData, nodeId, rebuildCallback) {
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

    // Handle completion
    this._handleCompressionComplete(nodeId, false, rebuildCallback);

    return true;
  }

  /**
   * Handle completion of compression/decompression
   */
  _handleCompressionComplete(nodeId, compressed, rebuildCallback) {
    // Rebuild all data relationships if callback provided
    if (rebuildCallback) {
      rebuildCallback();
    }

    // Trigger update event
    if (this.eventBus) {
      this.eventBus.publish('nodeCompressionTriggered', {
        nodeId,
        compressed
      });
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