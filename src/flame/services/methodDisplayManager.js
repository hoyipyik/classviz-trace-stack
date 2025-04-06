/**
 * MethodsDisplayManager - Manages the addition and removal of method nodes
 * within a Cytoscape.js graph, including styling and restoring original node states.
 */
export class MethodsDisplayManager {
    /**
     * Constructor for the MethodsDisplayManager
     * @param {Object} cy - Cytoscape.js graph instance for displaying methods
     * @param {Object} cytrace - Cytoscape.js graph instance for extracting methods data
     */
    constructor(cy, cytrace) {
      this.cy = cy;
      this.cytrace = cytrace;
      this.originalNodeDimensions = {};
      this.methodsGraph = null;
      this.EXCEPT_METHODS = [];
      this.getThreadClassNamesCallback = null;
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
          console.log("Updated EXCEPT_METHODS from callback:", this.EXCEPT_METHODS);
        } catch (error) {
          console.warn("Error getting thread class names:", error);
        }
      }
      
      // First remove any existing methods
      this.removeMethodsFromDisplay();
      
      // Get the updated methods graph
      const methodsGraph = this.extractMethodsToDisplay();
      console.log("Methods graph extracted:", methodsGraph);
      
      // Set the methods graph data and add methods
      this.setMethodsGraph(methodsGraph);
      this.addMethodsToDisplay();
      
      console.log("Added methods to display on nodes");
    }
    
    /**
     * Extracts special nodes from a Cytoscape.js graph and constructs a new graph
     * preserving the hierarchical relationships between special nodes.
     *
     * @returns {Object} - Object with nodes and edges arrays for the new graph
     */
    extractMethodsToDisplay() {
      // Arrays for our results
      const specialNodes = [];
      const specialEdges = [];
      
      // Maps for tracking
      const specialNodeIds = new Set(); // Set of original node IDs for quick lookup
      const labelToNodeData = new Map(); // Maps labels to node data objects
      
      // Step 1: Identify all special nodes
      this.cytrace.nodes().forEach(node => {
        const status = node.data('status') || {};
        const className = node.data('className');
        const nodeId = node.id();
        const label = node.data('label');
        
        // Check if this is a special node
        if(node.data('selected')) {
          const methodId = label;
          const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
          const classId = methodId.substring(0, lastDotBeforeParens);
          let parent = classId;
          
          // methodId not in EXCEPT_METHODS, parent use classId, else ''
          if (this.EXCEPT_METHODS.includes(methodId)) {
            parent = '';
          }
          
          // Create node data with original ID as a property
          const nodeData = {
            ...node.data(),
            id: label,
            originalId: nodeId, // Store original ID to maintain relationship with original graph
            parent: parent,
            visible: true,
            name: label.split('.').pop(),
            labels: [
              "Operation"
            ],
            properties: {
              ...node.data(),
              kind: "method",
              simpleName: label.split('.').pop(),
            }
          };
          
          // Add to special nodes array
          specialNodes.push({
            data: nodeData
          });
          
          // Store mapping of label to node data
          if (!labelToNodeData.has(label)) {
            labelToNodeData.set(label, []);
          }
          labelToNodeData.get(label).push(nodeData);
          
          // Store original node ID
          specialNodeIds.add(nodeId);
        }
      });
      
      // Step 2: Build parent map for the original graph
      const parentMap = new Map(); // Maps node ID to its parent
      
      this.cytrace.edges().forEach(edge => {
        const source = edge.source().id();
        const target = edge.target().id();
        
        // Add to parent map
        parentMap.set(target, source);
      });
      
      // Step 3: For each special node, find its nearest special ancestors
      specialNodeIds.forEach(nodeId => {
        this._findNearestSpecialAncestors(
          nodeId,
          specialNodeIds,
          parentMap,
          specialEdges
        );
      });
      
      return {
        nodes: specialNodes,
        edges: specialEdges
      };
    }
    
    /**
     * Find the nearest special ancestors for a node and create edges
     * between the node and its special ancestors.
     *
     * @param {string} nodeId - The ID of the node to find ancestors for
     * @param {Set<string>} specialNodeIds - Set of special node IDs
     * @param {Map<string, string>} parentMap - Map of node ID to parent ID
     * @param {Array} specialEdges - Array to store the created edges
     * @private
     */
    _findNearestSpecialAncestors(nodeId, specialNodeIds, parentMap, specialEdges) {
      // Start from the node's parent
      let currentId = parentMap.get(nodeId);
      
      // Process special case: root nodes don't have ancestors
      if (!currentId) return;
      
      // Keep track of visited nodes to avoid cycles
      const visited = new Set();
      visited.add(nodeId);
      
      // Track the path length
      let pathLength = 0;
      
      // Go up the tree until we find a special ancestor or reach root
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        pathLength++;
        
        // If this ancestor is special, create an edge and stop searching upward
        if (specialNodeIds.has(currentId)) {
          // Get the label of source and target nodes from the original graph
          const sourceLabel = this.cytrace.getElementById(currentId).data('label');
          const targetLabel = this.cytrace.getElementById(nodeId).data('label');
          
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
          return; // Found nearest special ancestor, no need to go further
        }
        
        // Move up to the next parent
        currentId = parentMap.get(currentId);
      }
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
        const methodId = methodNode.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track parent classes for later height adjustment
        parentIds.add(classId);
  
        // Create node object
        nodesToAdd.push({
          group: 'nodes',
          data: { ...methodNode.data }
        });
      });
  
      // Add all nodes in a single batch operation for better performance
      if (nodesToAdd.length > 0) {
        this.cy.add(nodesToAdd);
        // console.log(`Added ${nodesToAdd.length} method nodes`);
  
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
      }
  
      // Add edges in batch
      this._addMethodEdges(methodCallEdges);
    }
  
    /**
     * Removes method nodes and their connections from the graph
     * and restores the original node styles
     */
    removeMethodsFromDisplay() {
      if (!this.methodsGraph) {
        console.warn("No methods graph data available to remove methods");
        return;
      }
      
      const { nodes: methodNodes, edges: methodCallEdges } = this.methodsGraph;
      
      // Track parent class nodes that need height adjustment
      const parentIds = new Set();
      
      // Collect method IDs to remove
      const methodIds = methodNodes.map(methodNode => {
        const methodId = methodNode.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Track the parent class for restoring later
        parentIds.add(classId);
        
        return methodId;
      });
      
      // Collect edge IDs to remove
      const edgeIds = methodCallEdges.map(edge => edge.data.id);
      
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
          // console.log(`Removed ${edgesToRemove.size()} method call edges`);
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
          // console.log(`Removed ${nodesToRemove.size()} method nodes`);
        }
      }
      
      // Restore parent class nodes to original style
      parentIds.forEach(classId => {
        const classNode = this.cy.$id(classId);
        if (classNode.length > 0) {
          // Get original dimensions if available
          const originalDimensions = this.originalNodeDimensions[classId];
          
          if (originalDimensions) {
            // Create a complete style object with all properties
            const styleObj = {
              'width': originalDimensions.width,
              'height': originalDimensions.height,
              'text-valign': originalDimensions.textValign,
              'text-halign': originalDimensions.textHalign,
              'text-margin-y': originalDimensions.textMarginY,
              'background-color': originalDimensions.backgroundColor,
              'color': originalDimensions.color,
              'border-width': originalDimensions.borderWidth,
              'border-color': originalDimensions.borderColor,
              'shape': originalDimensions.shape
            };
            
            // Add additional properties if they exist
            if (originalDimensions.borderOpacity) styleObj['border-opacity'] = originalDimensions.borderOpacity;
            if (originalDimensions.fontSize) styleObj['font-size'] = originalDimensions.fontSize;
            if (originalDimensions.textWrap) styleObj['text-wrap'] = originalDimensions.textWrap;
            if (originalDimensions.textMaxWidth) styleObj['text-max-width'] = originalDimensions.textMaxWidth;
            if (originalDimensions.opacity) styleObj['opacity'] = originalDimensions.opacity;
            
            // Apply styles in one go
            classNode.style(styleObj);
            
            // Log restoration for debugging
            // console.log(`Restored original style for class ${classId}`);
          } else {
            // Fallback to default styling if original dimensions not available
            classNode.style({
              'text-valign': 'center',
              'text-halign': 'center',
              'text-margin-y': 0
            });
            console.warn(`No original dimensions found for class ${classId}, using defaults`);
          }
        }
      });
      
      // Force a layout update if needed
      this.cy.layout({
        name: 'preset',
        fit: false,
        animate: false
      }).run();
      
      // Clear the stored dimensions to prevent stale data
      this.originalNodeDimensions = {};
    }
  
    /**
     * Stores the original dimensions and styles of parent class nodes before modifications
     * @param {Array} methodNodes - Method nodes to be added
     * @private
     */
    _storeOriginalDimensions(methodNodes) {
      // Find all parent class IDs
      methodNodes.forEach(methodNode => {
        const methodId = methodNode.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
        const classId = methodId.substring(0, lastDotBeforeParens);
        
        // Store dimensions if not already stored and class exists
        if (!this.originalNodeDimensions[classId]) {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            // Store all relevant style properties
            this.originalNodeDimensions[classId] = {
              width: classNode.style('width'),
              height: classNode.style('height'),
              textValign: classNode.style('text-valign'),
              textHalign: classNode.style('text-halign'),
              textMarginY: classNode.style('text-margin-y'),
              backgroundColor: classNode.style('background-color'),
              color: classNode.style('color'),
              borderWidth: classNode.style('border-width'),
              borderColor: classNode.style('border-color'),
              borderOpacity: classNode.style('border-opacity'),
              shape: classNode.style('shape'),
              fontSize: classNode.style('font-size'),
              textWrap: classNode.style('text-wrap'),
              textMaxWidth: classNode.style('text-max-width'),
              opacity: classNode.style('opacity')
            };
          }
        }
      });
    }
  
    /**
     * Styles method nodes within their parent containers
     * @param {Array} nodesToAdd - Method nodes to style
     * @private
     */
    _styleMethods(nodesToAdd) {
      // First, group methods by class for more efficient processing
      const methodsByClass = {};
      
      nodesToAdd.forEach(node => {
        const methodId = node.data.id;
        const lastDotBeforeParens = methodId.lastIndexOf(".", methodId.indexOf("("));
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
    }
  
    /**
     * Adds and styles method call edges
     * @param {Array} methodCallEdges - Edges representing method calls
     * @private
     */
    _addMethodEdges(methodCallEdges) {
      const edgesToAdd = [];
  
      // Filter edges where both source and target exist in the graph
      methodCallEdges.forEach(edgeData => {
        const sourceId = edgeData.data.source;
        const targetId = edgeData.data.target;
  
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
        // console.log(`Added ${edgesToAdd.length} method call edges`);
  
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
  }