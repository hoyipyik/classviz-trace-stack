import { relayout } from "../../graphPanel.js";
import { $, on } from "../../shorthands.js";

/**
 * MethodsDisplayManager - Manages method nodes within a Cytoscape.js graph.
 */
export class MethodsDisplayManager {
  constructor(cy, rootNode, nodeMap, sharedStates) {
    this.cy = cy;
    this.cascadeData = rootNode;
    this.nodeMap = nodeMap || {};
    this.originalNodeDimensions = {};
    this.methodsGraph = null;
    this.ALLOWED_LIB_METHODS = [];
    this.getThreadClassNamesCallback = null;
    this.sharedStates = sharedStates;
    this.displayedMethodIds = [];
    
    // Style constants
    this.STYLES = {
      METHOD: { height: '30px', width: '120px', shape: 'round-rectangle', fontSize: '12px' },
      TRACE: { width: 3, color: '#4CAF50', style: 'solid', opacity: 0.9 },
      CALL: { width: 2, color: '#FF9900', style: 'dotted', dashPattern: [2, 2], opacity: 0.8 }
    };
  }
  
  setThreadClassNamesCallback(callback) {
    if (typeof callback === 'function') this.getThreadClassNamesCallback = callback;
    else console.warn("Invalid callback provided");
  }

  setMethodsGraph(methodsGraph) { this.methodsGraph = methodsGraph; }
  setCascadeData(cascadeData) { this.cascadeData = cascadeData; }
  setNodeMap(nodeMap) { this.nodeMap = nodeMap || {}; }
  
  // Main update function
  updateMethodsOnClassviz() {
    // Update exception methods if callback available
    if (this.getThreadClassNamesCallback) {
      try { this.ALLOWED_LIB_METHODS = this.getThreadClassNamesCallback(); } 
      catch (e) { console.warn("Error getting thread class names:", e); }
    }
    
    // Remove existing methods and reset tracking
    this.removeMethodsFromDisplay();
    this.displayedMethodIds = [];
    
    // Extract and set new methods
    const methodsGraph = this.extractMethodsToDisplay();
    this.setMethodsGraph(methodsGraph);
    this.addMethodsToDisplay();
    
    // Trigger layout refresh
    $("#btn-relayout").click();
  }
  
  // Find all selected nodes and their parent relationships
  extractMethodsToDisplay() {
    const specialNodes = [];
    const specialEdges = [];
    const selectedNodeIds = new Set();
    const nodeParentMap = {};
    
    // Recursively find selected nodes
    const findSelected = (node, parentId = null) => {
      if (!node) return;
      const nodeId = node.id || node.name;
      if (parentId) nodeParentMap[nodeId] = parentId;
      if (node.selected === true) selectedNodeIds.add(nodeId);
      if (Array.isArray(node.children)) {
        node.children.forEach(child => findSelected(child, nodeId));
      }
    };
    
    findSelected(this.cascadeData);
    console.log(`Found ${selectedNodeIds.size} selected nodes`);
    
    // Process each selected node
    selectedNodeIds.forEach(nodeId => {
      const node = this.nodeMap[nodeId];
      if (!node) {
        console.warn(`Node not found: ${nodeId}`);
        return;
      }
      
      try {
        const label = node.label || node.name || nodeId;
        const parenIndex = label.indexOf("(");
        if (parenIndex === -1) {
          console.warn(`Invalid method format: ${label}`);
          return;
        }
        
        const lastDotBeforeParens = label.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) {
          console.warn(`Invalid class format: ${label}`);
          return;
        }
        
        const classId = label.substring(0, lastDotBeforeParens);
        const parent = this.ALLOWED_LIB_METHODS.includes(label) ? '' : classId;
        
        // Create node data
        specialNodes.push({
          data: {
            ...node,
            id: label,
            originalId: nodeId,
            parent: parent,
            visible: true,
            name: label.split('.').pop(),
            labels: ["Operation"],
            properties: {
              ...node,
              kind: "method",
              simpleName: label.split('.').pop()
            }
          }
        });
      } catch (e) {
        console.warn(`Error processing node ${nodeId}:`, e);
      }
    });
    
    // Create edges between nodes (only in non-trace mode)
    if (!this.sharedStates.traceMode) {
      selectedNodeIds.forEach(nodeId => {
        // Find nearest selected ancestor
        let currentId = nodeParentMap[nodeId];
        if (!currentId) return;
        
        const visited = new Set([nodeId]);
        let pathLength = 0;
        
        while (currentId && !visited.has(currentId)) {
          visited.add(currentId);
          pathLength++;
          
          if (selectedNodeIds.has(currentId)) {
            // Create edge from ancestor to this node
            const sourceNode = this.nodeMap[currentId];
            const targetNode = this.nodeMap[nodeId];
            
            if (!sourceNode || !targetNode) {
              console.warn(`Missing node data: ${currentId} -> ${nodeId}`);
              return;
            }
            
            const sourceLabel = sourceNode.label || sourceNode.name || currentId;
            const targetLabel = targetNode.label || targetNode.name || nodeId;
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
            return; // Stop after finding first selected ancestor
          }
          
          currentId = nodeParentMap[currentId];
        }
      });
    }
    
    return { nodes: specialNodes, edges: specialEdges };
  }
  
  // Add method nodes to the graph
  addMethodsToDisplay() {
    if (!this.methodsGraph) {
      console.warn("No methods graph data available");
      return;
    }

    const { nodes: methodNodes, edges: methodCallEdges } = this.methodsGraph;
    const nodesToAdd = [];
    const parentIds = new Set();
    
    // Store original dimensions
    methodNodes.forEach(methodNode => {
      if (!methodNode?.data?.id) return;
      
      const methodId = methodNode.data.id;
      const parenIndex = methodId.indexOf("(");
      if (parenIndex === -1) return;
      
      const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
      if (lastDotBeforeParens === -1) return;
      
      const classId = methodId.substring(0, lastDotBeforeParens);
      if (!this.originalNodeDimensions[classId]) {
        const classNode = this.cy.$id(classId);
        if (classNode.length > 0) {
          this.originalNodeDimensions[classId] = {
            width: classNode.style('width'),
            height: classNode.style('height'),
            textValign: classNode.style('text-valign'),
            textHalign: classNode.style('text-halign'),
            textMarginY: classNode.style('text-margin-y')
          };
        }
      }
      
      parentIds.add(classId);
      this.displayedMethodIds.push(methodId);
      nodesToAdd.push({ group: 'nodes', data: { ...methodNode.data } });
    });

    // Add all nodes at once
    if (nodesToAdd.length > 0) {
      try {
        this.cy.add(nodesToAdd);
        
        // Sort IDs numerically
        this.displayedMethodIds.sort((a, b) => {
          const aNum = parseInt(a.match(/\d+/g)?.[0] || '0', 10);
          const bNum = parseInt(b.match(/\d+/g)?.[0] || '0', 10);
          return aNum - bNum;
        });

        // Adjust parent node heights
        parentIds.forEach(classId => {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            const methodCount = classNode.children().length;
            const newHeight = Math.max(150, 80 + (methodCount * 35));
            classNode.style({
              'height': newHeight,
              'text-valign': 'top',
              'text-halign': 'center',
              'text-margin-y': 18
            });
          }
        });

        // Group methods by class for styling
        const methodsByClass = {};
        nodesToAdd.forEach(node => {
          if (!node?.data?.id) return;
          const methodId = node.data.id;
          const parenIndex = methodId.indexOf("(");
          if (parenIndex === -1) return;
          
          const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
          if (lastDotBeforeParens === -1) return;
          
          const classId = methodId.substring(0, lastDotBeforeParens);
          if (!methodsByClass[classId]) methodsByClass[classId] = [];
          methodsByClass[classId].push(methodId);
        });
        
        // Style method nodes
        Object.entries(methodsByClass).forEach(([classId, methodIds]) => {
          if (this.cy.$id(classId).length > 0) {
            const methodNodes = this.cy.$id(classId).children();
            
            methodIds.forEach(methodId => {
              const methodIndex = Array.from(methodNodes).findIndex(n => n.id() === methodId);
              if (methodIndex >= 0) {
                const yPos = 55 + (methodIndex * 35);
                const node = this.cy.$id(methodId);
                if (node.length > 0) {
                  const nodeData = node.data();
                  const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
                  
                  node.style({
                    'label': nodeData.properties?.simpleName || methodId.split('.').pop(),
                    'color': 'black',
                    'font-size': this.STYLES.METHOD.fontSize,
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': color,
                    'border-width': '1px',
                    'border-color': '#999',
                    'border-opacity': 0.8,
                    'shape': this.STYLES.METHOD.shape,
                    'width': this.STYLES.METHOD.width,
                    'height': this.STYLES.METHOD.height,
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
        console.error("Error adding method nodes:", error);
      }
    }

    // Add edges
    if (this.sharedStates.traceMode) {
      // Create sequential edges
      const methodsWithIds = this.displayedMethodIds.map(id => ({
        id: id,
        numericId: parseInt(id.match(/\d+/g)?.[0] || '0', 10)
      })).sort((a, b) => a.numericId - b.numericId);
      
      const sequentialEdges = [];
      for (let i = 0; i < methodsWithIds.length - 1; i++) {
        const sourceId = methodsWithIds[i].id;
        const targetId = methodsWithIds[i + 1].id;
        
        const sourceNode = this.nodeMap[this.cy.$id(sourceId).data('originalId')];
        const targetNode = this.nodeMap[this.cy.$id(targetId).data('originalId')];
        
        if (!sourceNode || !targetNode) continue;
        
        sequentialEdges.push({
          data: {
            id: `trace_seq_${i}_${sourceId}_${targetId}`,
            source: sourceId,
            target: targetId,
            sourceOriginalId: sourceNode.id || sourceNode.name,
            targetOriginalId: targetNode.id || targetNode.name,
            pathLength: 1,
            label: "trace_sequence",
            interaction: "trace_sequence"
          }
        });
      }
      
      this._addEdges(sequentialEdges);
    } else {
      this._addEdges(methodCallEdges);
    }
  }
  
  // Helper to add edges
  _addEdges(edgeData) {
    const edgesToAdd = [];
    
    edgeData.forEach(edge => {
      if (!edge?.data?.source || !edge?.data?.target) return;
      
      const sourceId = edge.data.source;
      const targetId = edge.data.target;
      
      if (this.cy.$id(sourceId).length > 0 && this.cy.$id(targetId).length > 0) {
        edgesToAdd.push({ group: 'edges', data: edge.data });
      }
    });
    
    if (edgesToAdd.length > 0) {
      this.cy.add(edgesToAdd);
      
      // Style edges based on type
      if (this.sharedStates.traceMode) {
        this.cy.edges(`[interaction = "trace_sequence"]`).style({
          'width': this.STYLES.TRACE.width,
          'line-color': this.STYLES.TRACE.color,
          'target-arrow-color': this.STYLES.TRACE.color,
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': this.STYLES.TRACE.style,
          'arrow-scale': 1.2,
          'opacity': this.STYLES.TRACE.opacity,
          'source-endpoint': 'outside-to-node',
          'target-endpoint': 'outside-to-node',
          'edge-distances': 'node-position'
        });
      } else {
        this.cy.edges(`[interaction = "trace_call"]`).style({
          'width': this.STYLES.CALL.width,
          'line-color': this.STYLES.CALL.color,
          'target-arrow-color': this.STYLES.CALL.color,
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': this.STYLES.CALL.style,
          'line-dash-pattern': this.STYLES.CALL.dashPattern,
          'arrow-scale': 1.2,
          'opacity': this.STYLES.CALL.opacity,
          'source-endpoint': 'outside-to-node',
          'target-endpoint': 'outside-to-node',
          'edge-distances': 'node-position'
        });
      }
    }
  }
  
  // Remove methods and restore original node styles
  removeMethodsFromDisplay() {
    if (!this.methodsGraph || !this.cy) return;
    
    try {
      const { nodes: methodNodes } = this.methodsGraph;
      const parentIds = new Set();
      const methodIds = [];
      
      // Collect method IDs and parent classes
      methodNodes.forEach(methodNode => {
        if (!methodNode?.data?.id) return;
        
        const methodId = methodNode.data.id;
        const parenIndex = methodId.indexOf("(");
        if (parenIndex === -1) return;
        
        const lastDotBeforeParens = methodId.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        
        parentIds.add(methodId.substring(0, lastDotBeforeParens));
        methodIds.push(methodId);
      });
      
      // Remove trace edges
      const edgesToRemove = this.cy.edges(`[interaction = "trace_call"], [interaction = "trace_sequence"]`);
      if (!edgesToRemove.empty()) {
        this.cy.remove(edgesToRemove);
      }
      
      // Remove method nodes
      if (methodIds.length > 0) {
        const nodesToRemove = this.cy.collection();
        methodIds.forEach(id => {
          const node = this.cy.$id(id);
          if (node.length > 0) nodesToRemove.merge(node);
        });
        
        if (!nodesToRemove.empty()) {
          this.cy.remove(nodesToRemove);
        }
      }
      
      // Restore original styles
      this.cy.batch(() => {
        parentIds.forEach(classId => {
          const classNode = this.cy.$id(classId);
          if (classNode.length > 0) {
            const originalDimensions = this.originalNodeDimensions[classId];
            
            if (originalDimensions) {
              classNode.style({
                'width': originalDimensions.width,
                'height': originalDimensions.height,
                'text-valign': originalDimensions.textValign || 'center',
                'text-halign': originalDimensions.textHalign || 'center',
                'text-margin-y': originalDimensions.textMarginY || 0
              });
            } else {
              classNode.style({
                'text-valign': 'center',
                'text-halign': 'center',
                'text-margin-y': 0
              });
            }
          }
        });
      });
      
      // Trigger layout update
      setTimeout(() => {
        try {
          const layoutName = $('#selectlayout').options[$('#selectlayout').selectedIndex].value;
          relayout(this.cy, layoutName);
        } catch (e) {
          $("#btn-relayout").click();
        }
      }, 50);
      
      this.originalNodeDimensions = {};
    } catch (error) {
      console.error("Error removing methods:", error);
    }
  }
}