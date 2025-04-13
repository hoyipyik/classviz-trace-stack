import { relayout } from "../../graphPanel.js";
import { $, on } from "../../shorthands.js";

/**
 * MethodsDisplayManager - Manages the addition and removal of method nodes
 * within a Cytoscape.js graph, including styling and restoring original node states.
 * Modified to work with d3-flame-chart cascade data and object-based nodeMap.
 */
export class MethodsDisplayManager {

  constructor(cy, rootNode, nodeMap, sharedStates) {
    this.cy = cy;
    this.cascadeData = rootNode;
    this.nodeMap = nodeMap || {};
    this.originalNodeDimensions = {};
    this.methodsGraph = null;
    this.EXCEPT_METHODS = [];
    this.getThreadClassNamesCallback = null;
    this.sharedStates = sharedStates;
    this.displayedMethodIds = [];
  }
  
  /**
   * Sets a callback function to provide thread class names
   * @param {Function} callback - Function that returns an array of thread class names
   */
  setThreadClassNamesCallback(callback) {
    if (typeof callback === 'function') {
      this.getThreadClassNamesCallback = callback;
    } else {
      console.warn("Invalid callback provided to setThreadClassNamesCallback");
    }
  }

  /**
   * Sets the methods graph data containing nodes and edges
   * @param {Object} methodsGraph - Object with nodes and edges arrays
   */
  setMethodsGraph(methodsGraph) {
    this.methodsGraph = methodsGraph;
  }

  /**
   * Updates methods displayed on class visualization
   * Removes any existing methods and adds updated ones
   */
  updateMethodsOnClassviz() {
    // Update EXCEPT_METHODS from callback if available
    if (this.getThreadClassNamesCallback) {
      try {
        this.EXCEPT_METHODS = this.getThreadClassNamesCallback();
        // console.log("Updated EXCEPT_METHODS from callback:", this.EXCEPT_METHODS);
      } catch (error) {
        console.warn("Error getting thread class names:", error);
      }
    }
    
    // First remove any existing methods
    this.removeMethodsFromDisplay();
    this.displayedMethodIds = [];
    
    // Get the updated methods graph
    const methodsGraph = this.extractMethodsToDisplay();
    console.log("Methods graph extracted:", methodsGraph);
    
    // Set the methods graph data and add methods
    this.setMethodsGraph(methodsGraph);
    this.addMethodsToDisplay();
    console.log(this.displayedMethodIds)

    // on('click', $("#btn-relayout"), () => relayout(cy, $('#selectlayout').options[$('#selectlayout').selectedIndex].value));
    $("#btn-relayout").click();
    console.log("Added methods to display on nodes");
  }
  
  /**
   * Recursive function to find selected nodes in the cascade data
   * @param {Object} node - Current node to process
   * @param {Set} selectedNodes - Set to collect selected nodes
   * @param {Object} nodeParentMap - Object to track parent-child relationships
   * @param {String} parentId - ID of the parent node
   */
  _findSelectedNodes(node, selectedNodes, nodeParentMap, parentId = null) {
    if (!node) return;
    
    // Current node ID
    const nodeId = node.id || node.name;
    
    // Store parent relationship
    if (parentId) {
      nodeParentMap[nodeId] = parentId;
    }
    // console.log(node, "‹€››‹€€€€€€€€€€€€€€€€")
    // Check if node is selected
    if (node.selected === true) {
      selectedNodes.add(nodeId);
    }
    
    // Process children recursively
    if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        this._findSelectedNodes(child, selectedNodes, nodeParentMap, nodeId);
      });
    }
  }
  
  /**
   * Extracts special nodes from cascade data and constructs a new graph
   * preserving the hierarchical relationships between special nodes.
   *
   * @returns {Object} - Object with nodes and edges arrays for the new graph
   */
  extractMethodsToDisplay() {
    // Arrays for our results
    const specialNodes = [];
    const specialEdges = [];
    
    // Maps for tracking
    const selectedNodeIds = new Set(); // Set of selected node IDs
    const nodeParentMap = {}; // Object storing node ID to parent ID mapping
    const labelToNodeData = {}; // Object storing labels to node data mapping
    
    // Step 1: Find all selected nodes in the cascade data
    this._findSelectedNodes(this.cascadeData, selectedNodeIds, nodeParentMap);
    
    // Log for debugging
    console.log(`Found ${selectedNodeIds.size} selected nodes`);
    
    // Step 2: Create node data for all selected nodes
    selectedNodeIds.forEach(nodeId => {
      // Get node from nodeMap
      const node = this.nodeMap[nodeId];
      if (!node) {
        console.warn(`Node not found in nodeMap: ${nodeId}`);
        return;
      }
      
      try {
        const label = node.label || node.name || nodeId;
        
        // Extract class ID from method ID
        const methodId = label;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) {
          console.warn(`Invalid method ID format (missing parentheses): ${methodId}`);
          return;
        }
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) {
          console.warn(`Invalid method ID format (missing class delimiter): ${methodId}`);
          return;
        }
        
        const classId = methodId.substring(0, lastDotBeforeParens);
        let parent = classId;
        
        // methodId not in EXCEPT_METHODS, parent use classId, else ''
        if (this.EXCEPT_METHODS.includes(methodId)) {
          parent = '';
        }
        
        // Create node data with original ID as a property
        const nodeData = {
          ...node,
          id: label,
          originalId: nodeId, // Store original ID to maintain relationship with original graph
          parent: parent,
          visible: true,
          name: label.split('.').pop(),
          labels: ["Operation"],
          properties: {
            ...node,
            kind: "method",
            simpleName: label.split('.').pop(),
          }
        };
        
        // Add to special nodes array
        specialNodes.push({
          data: nodeData
        });
        
        // Store mapping of label to node data
        if (!labelToNodeData[label]) {
          labelToNodeData[label] = [];
        }
        labelToNodeData[label].push(nodeData);
      } catch (error) {
        console.warn(`Error processing node ${nodeId}:`, error);
      }
    });
    
    // Step 3: For each selected node, find its nearest selected ancestors
    if (!this.sharedStates.traceMode) {
      selectedNodeIds.forEach(nodeId => {
        this._findNearestSelectedAncestors(
          nodeId,
          selectedNodeIds,
          nodeParentMap,
          specialEdges
        );
      });
    }
    
    return {
      nodes: specialNodes,
      edges: specialEdges
    };
  
  }
  
  /**
   * Find the nearest selected ancestors for a node and create edges
   * between the node and its selected ancestors.
   *
   * @param {string} nodeId - The ID of the node to find ancestors for
   * @param {Set<string>} selectedNodeIds - Set of selected node IDs
   * @param {Object} nodeParentMap - Object mapping node ID to parent ID
   * @param {Array} specialEdges - Array to store the created edges
   */
  _findNearestSelectedAncestors(nodeId, selectedNodeIds, nodeParentMap, specialEdges) {
    try {
      // Start from the node's parent
      let currentId = nodeParentMap[nodeId];
      
      // Process special case: root nodes don't have ancestors
      if (!currentId) return;
      
      // Keep track of visited nodes to avoid cycles
      const visited = new Set();
      visited.add(nodeId);
      
      // Track the path length
      let pathLength = 0;
      
      // Go up the tree until we find a selected ancestor or reach root
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        pathLength++;
        
        // If this ancestor is selected, create an edge and stop searching upward
        if (selectedNodeIds.has(currentId)) {
          // Get the nodes from nodeMap
          const sourceNode = this.nodeMap[currentId];
          const targetNode = this.nodeMap[nodeId];
          
          if (!sourceNode || !targetNode) {
            console.warn(`Cannot find one or both nodes: ${currentId} -> ${nodeId}`);
            return;
          }
          
          const sourceLabel = sourceNode.label || sourceNode.name || currentId;
          const targetLabel = targetNode.label || targetNode.name || nodeId;
          
          // Create a unique edge ID that includes both labels and original IDs
          // This ensures uniqueness even with duplicate labels
          const edgeId = `e_${sourceLabel}_${currentId}_${targetLabel}_${nodeId}`;
          
          specialEdges.push({
            data: {
              id: edgeId,
              source: sourceLabel,
              target: targetLabel,
              sourceOriginalId: currentId,
              targetOriginalId: nodeId,
              pathLength: pathLength,
              label: "trace_call",
              interaction: "trace_call"
            }
          });
          return; // Found nearest selected ancestor, no need to go further
        }
        
        // Move up to the next parent
        currentId = nodeParentMap[currentId];
      }
    } catch (error) {
      console.warn(`Error finding ancestors for node ${nodeId}:`, error);
    }
  }

  /**
   * Creates sequential trace edges connecting all nodes in the order of their IDs.
   * Used when traceMode is true.
   * 
   * @param {Array} methodIds - Array of method IDs to connect in sequence
   * @returns {Array} - Array of edge data objects for graph
   */
  _createSequentialTraceEdges(methodIds) {
    const edges = [];
    
    // Extract numeric IDs for sorting
    // Assuming method IDs follow a pattern where the numeric ID can be extracted
    const methodsWithNumericIds = methodIds.map(id => {
      // Try to extract a numeric identifier from the method ID
      // This regex looks for sequences of digits in the string
      const matches = id.match(/\d+/g);
      const numericPart = matches ? parseInt(matches[0], 10) : 0;
      
      return {
        id: id,
        numericId: numericPart
      };
    });
    
    // Sort by numeric ID
    methodsWithNumericIds.sort((a, b) => a.numericId - b.numericId);
    
    // Create edges connecting each method to the next in sequence
    for (let i = 0; i < methodsWithNumericIds.length - 1; i++) {
      const sourceId = methodsWithNumericIds[i].id;
      const targetId = methodsWithNumericIds[i + 1].id;
      
      // Get node data for source and target
      const sourceNode = this.nodeMap[this.cy.$id(sourceId).data('originalId')];
      const targetNode = this.nodeMap[this.cy.$id(targetId).data('originalId')];
      
      if (!sourceNode || !targetNode) {
        console.warn(`Cannot find data for one or both nodes: ${sourceId} -> ${targetId}`);
        continue;
      }
      
      // Create unique edge ID
      const edgeId = `trace_seq_${i}_${sourceId}_${targetId}`;
      
      // Create edge data
      edges.push({
        data: {
          id: edgeId,
          source: sourceId,
          target: targetId,
          sourceOriginalId: sourceNode.id || sourceNode.name,
          targetOriginalId: targetNode.id || targetNode.name,
          pathLength: 1, // Direct connection in sequence
          label: "trace_sequence",
          interaction: "trace_sequence"
        }
      });
    }
    
    console.log("Created sequential trace edges with numeric sorting:", methodsWithNumericIds.map(m => `${m.id} (${m.numericId})`));
    
    return edges;
  }

  /**
   * Adds method nodes and their connections to the graph
   */
  addMethodsToDisplay() {
    if (!this.methodsGraph) {
      console.warn("No methods graph data available to add methods");
      return;
    }

    const { nodes: methodNodes, edges: methodCallEdges } = this.methodsGraph;
    
    // Prepare nodes batch for better performance
    const nodesToAdd = [];
    const parentIds = new Set();
    
    // Store original dimensions of parent nodes before modifying them
    this._storeOriginalDimensions(methodNodes);

    // Process all method nodes
    methodNodes.forEach(methodNode => {
      try {
        if (!methodNode || !methodNode.data || !methodNode.data.id) {
          console.warn("Invalid method node:", methodNode);
          return;
        }
        
        const methodId = methodNode.data.id;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) {
          console.warn(`Invalid method ID format: ${methodId}`);
          return;
        }
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) {
          console.warn(`Cannot extract class ID from method ID: ${methodId}`);
          return;
        }
        
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track parent classes for later height adjustment
        parentIds.add(classId);

        // Create node object
        this.displayedMethodIds.push(methodId);
        nodesToAdd.push({
          group: 'nodes',
          data: { ...methodNode.data }
        });
      } catch (error) {
        console.warn("Error processing method node:", error);
      }
    });

    // Add all nodes in a single batch operation for better performance
    if (nodesToAdd.length > 0) {
      try {
        this.cy.add(nodesToAdd);
        console.log(`Added ${nodesToAdd.length} method nodes`);

        // Sort displayedMethodIds by numeric values in IDs after adding nodes
        // Numeric sorting, not lexicographical
        this.displayedMethodIds.sort((a, b) => {
          // Extract numeric parts from IDs
          const aMatches = a.match(/\d+/g);
          const bMatches = b.match(/\d+/g);
          
          const aNum = aMatches ? parseInt(aMatches[0], 10) : 0;
          const bNum = bMatches ? parseInt(bMatches[0], 10) : 0;
          
          return aNum - bNum;
        });

        // Adjust parent node heights to accommodate methods
        parentIds.forEach(classId => {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            const methodCount = classNode.children().length;
            // Calculate new height based on number of methods
            const newHeight = Math.max(150, 80 + (methodCount * 35));
            
            // Apply styles
            classNode.style({
              'height': newHeight,
              'text-valign': 'top',
              'text-halign': 'center',
              'text-margin-y': 18
            });
          }
        });

        // Style all method nodes
        this._styleMethods(nodesToAdd);
      } catch (error) {
        console.error("Error adding method nodes:", error);
      }
    }

    // Add edges based on trace mode
    if (this.sharedStates.traceMode) {
      // In trace mode, create sequential edges based on ID order
      const sequentialEdges = this._createSequentialTraceEdges(this.displayedMethodIds);
      this._addMethodEdges(sequentialEdges);
    } else {
      // In normal mode, use the existing hierarchy edges
      this._addMethodEdges(methodCallEdges);
    }
  }

  /**
   * Removes method nodes and their connections from the graph
   * and properly triggers layout recalculation
   */
  removeMethodsFromDisplay() {
    if (!this.methodsGraph) {
      console.warn("No methods graph data available to remove methods");
      return;
    }
    
    if (!this.cy) {
      console.error("Main Cytoscape graph is not available");
      return;
    }
    
    try {
      const { nodes: methodNodes, edges: methodCallEdges } = this.methodsGraph;
      
      // Track parent class nodes that need height adjustment
      const parentIds = new Set();
      
      // Collect method IDs to remove
      const methodIds = methodNodes.map(methodNode => {
        if (!methodNode || !methodNode.data || !methodNode.data.id) {
          console.warn("Invalid method node:", methodNode);
          return null;
        }
        
        const methodId = methodNode.data.id;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) {
          console.warn(`Invalid method ID format: ${methodId}`);
          return null;
        }
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) {
          console.warn(`Cannot extract class ID from method ID: ${methodId}`);
          return null;
        }
        
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track the parent class for restoring later
        parentIds.add(classId);
        
        return methodId;
      }).filter(id => id !== null);
      
      // Collect edge IDs to remove - need to include both regular and trace sequence edges
      let edgeIds = [];
      if (methodCallEdges) {
        edgeIds = methodCallEdges.map(edge => edge.data && edge.data.id).filter(id => id);
      }
      
      // Also collect any trace_sequence edges
      const traceSequenceEdges = this.cy.edges(`[interaction = "trace_sequence"]`);
      if (traceSequenceEdges.length > 0) {
        traceSequenceEdges.forEach(edge => {
          edgeIds.push(edge.id());
        });
      }
      
      // Remove all method edges first
      if (edgeIds.length > 0) {
        const edgesToRemove = this.cy.collection();
        edgeIds.forEach(edgeId => {
          const edge = this.cy.$id(edgeId);
          if (edge.length > 0) {
            edgesToRemove.merge(edge);
          }
        });
        
        if (!edgesToRemove.empty()) {
          this.cy.remove(edgesToRemove);
          console.log(`Removed ${edgesToRemove.size()} method call edges`);
        }
      }
      
      // Remove all method nodes
      if (methodIds.length > 0) {
        const nodesToRemove = this.cy.collection();
        methodIds.forEach(methodId => {
          const node = this.cy.$id(methodId);
          if (node.length > 0) {
            nodesToRemove.merge(node);
          }
        });
        
        if (!nodesToRemove.empty()) {
          this.cy.remove(nodesToRemove);
          console.log(`Removed ${nodesToRemove.size()} method nodes`);
        }
      }
      
      // First restore original styles with clean values
      this.cy.batch(() => {
        parentIds.forEach(classId => {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            const originalDimensions = this.originalNodeDimensions[classId];
            
            if (originalDimensions) {
              // Apply only essential style properties to avoid confusing layout
              classNode.style({
                'width': originalDimensions.width,
                'height': originalDimensions.height,
                'text-valign': originalDimensions.textValign || 'center',
                'text-halign': originalDimensions.textHalign || 'center',
                'text-margin-y': originalDimensions.textMarginY || 0
              });
            } else {
              // Standard style reset
              classNode.style({
                'text-valign': 'center',
                'text-halign': 'center',
                'text-margin-y': 0
              });
            }
          }
        });
      });
      
      console.log("Restored original dimensions for all parent nodes");
      
      // IMPORTANT: Let the layout algorithm run AFTER restoring styles
      // This allows it to consider the proper dimensions
      try {
        // Force a small delay to ensure style changes are processed before layout
        setTimeout(() => {
          try {
            // Get current layout from dropdown
            const layoutName = $('#selectlayout').options[$('#selectlayout').selectedIndex].value;
            console.log(`Triggering layout: ${layoutName}`);
            
            // Use the existing relayout function
            relayout(this.cy, layoutName);
          } catch (layoutError) {
            console.warn("Error using relayout:", layoutError);
            // Fallback to direct button click
            $("#btn-relayout").click();
          }
        }, 50);
      } catch (error) {
        console.warn("Error triggering layout:", error);
      }
      
      // Clear the stored dimensions
      this.originalNodeDimensions = {};
    } catch (error) {
      console.error("Error removing methods from display:", error);
    }
  }

  /**
   * Stores the original dimensions more cleanly with specific layout-relevant properties
   */
  _storeOriginalDimensions(methodNodes) {
    try {
      methodNodes.forEach(methodNode => {
        if (!methodNode || !methodNode.data || !methodNode.data.id) return;
        
        const methodId = methodNode.data.id;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) return;
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        if (!this.originalNodeDimensions[classId]) {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            // Store only layout-critical properties
            this.originalNodeDimensions[classId] = {
              // Most important for layout calculation
              width: classNode.style('width'),
              height: classNode.style('height'),
              
              // Text alignment affects internal geometry
              textValign: classNode.style('text-valign'),
              textHalign: classNode.style('text-halign'),
              textMarginY: classNode.style('text-margin-y')
            };
          }
        }
      });
    } catch (error) {
      console.warn("Error storing original dimensions:", error);
    }
  }

  /**
   * Styles method nodes within their parent containers
   * @param {Array} nodesToAdd - Method nodes to style
   * @private
   */
  _styleMethods(nodesToAdd) {
    try {
      // First, group methods by class for more efficient processing
      const methodsByClass = {};
      
      nodesToAdd.forEach(node => {
        if (!node || !node.data || !node.data.id) return;
        
        const methodId = node.data.id;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) return;
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        if (!methodsByClass[classId]) {
          methodsByClass[classId] = [];
        }
        methodsByClass[classId].push(methodId);
      });
      
      // Apply styles class by class
      Object.entries(methodsByClass).forEach(([classId, methodIds]) => {
        if (this.cy.$id(classId).length > 0) {
          // Get all method nodes for this class
          const methodNodes = this.cy.$id(classId).children();
          
          // Position each method node
          methodIds.forEach(methodId => {
            const methodIndex = Array.from(methodNodes).findIndex(n => n.id() === methodId);
            if (methodIndex >= 0) {
              const startPosition = 55;
              const spacing = 35;
              const yPos = startPosition + (methodIndex * spacing);
              
              const node = this.cy.$id(methodId);
              if (node.length > 0) {
                // Get node color from data, or use default
                const nodeData = node.data();
                const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
                
                node.style({
                  'label': nodeData.properties?.simpleName || methodId.split('.').pop(),
                  'color': 'black',
                  'font-size': '12px',
                  'text-valign': 'center',
                  'text-halign': 'center',
                  'background-color': color, // Use explicit color value
                  'border-width': '1px',
                  'border-color': '#999',
                  'border-opacity': 0.8,
                  'shape': 'round-rectangle',
                  'width': '120px',
                  'height': '30px',
                  'text-wrap': 'ellipsis',
                  'text-max-width': '110px',
                  'position-x': 0,
                  'position-y': yPos
                });
              }
            }
          });
        }
      });
    } catch (error) {
      console.warn("Error styling methods:", error);
    }
  }

  /**
   * Adds and styles method call edges
   * @param {Array} methodCallEdges - Edges representing method calls
   * @private
   */
  _addMethodEdges(methodCallEdges) {
    try {
      const edgesToAdd = [];

      // Filter edges where both source and target exist in the graph
      methodCallEdges.forEach(edgeData => {
        if (!edgeData || !edgeData.data) return;
        
        const sourceId = edgeData.data.source;
        const targetId = edgeData.data.target;
        
        if (!sourceId || !targetId) return;

        if (this.cy.$id(sourceId).length > 0 && this.cy.$id(targetId).length > 0) {
          edgesToAdd.push({
            group: 'edges',
            data: edgeData.data
          });
        } else {
          console.warn(`Cannot add edge: ${sourceId} -> ${targetId}, one or both nodes not found`);
        }
      });

      // Add edges in batch
      if (edgesToAdd.length > 0) {
        this.cy.add(edgesToAdd);
        console.log(`Added ${edgesToAdd.length} method call edges`);

        // Style edges based on their interaction type
        if (this.sharedStates.traceMode) {
          // Style trace_sequence edges
          this.cy.edges(`[interaction = "trace_sequence"]`).style({
            'width': 3,
            'line-color': '#4CAF50',  // green
            'target-arrow-color': '#4CAF50',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'line-style': 'solid',
            'arrow-scale': 1.2,
            'opacity': 0.9,
            'source-endpoint': 'outside-to-node',
            'target-endpoint': 'outside-to-node',
            'edge-distances': 'node-position'
          });
        } else {
          // Style trace_call edges
          this.cy.edges(`[interaction = "trace_call"]`).style({
            'width': 2,
            'line-color': '#FF9900',  // orange
            'target-arrow-color': '#FF9900',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'line-style': 'dotted',
            'line-dash-pattern': [2, 2],
            'arrow-scale': 1.2,
            'opacity': 0.8,
            'source-endpoint': 'outside-to-node',
            'target-endpoint': 'outside-to-node',
            'edge-distances': 'node-position'
          });
        }
      }
    } catch (error) {
      console.error("Error adding method edges:", error);
    }
  }
  
  /**
   * Updates the cascade data
   * @param {Object} cascadeData - New cascade data
   */
  setCascadeData(cascadeData) {
    this.cascadeData = cascadeData;
  }
  
  /**
   * Updates the node map for quick lookups
   * @param {Object} nodeMap - Object mapping node IDs to node data
   */
  setNodeMap(nodeMap) {
    this.nodeMap = nodeMap || {};
  }
  
  /**
   * Debug method to print the current cascadeData and nodeMap
   */
  debug() {
    console.log("Current cascadeData:", this.cascadeData);
    console.log("Current nodeMap:", this.nodeMap);
    
    // Count selected nodes
    let selectedCount = 0;
    const countSelected = (node) => {
      if (!node) return;
      if (node.selected === true) selectedCount++;
      if (Array.isArray(node.children)) {
        node.children.forEach(countSelected);
      }
    };
    
    countSelected(this.cascadeData);
    console.log(`Total selected nodes in cascadeData: ${selectedCount}`);
    console.log(`Current trace mode:`, this.sharedStates.traceMode);
  }
}