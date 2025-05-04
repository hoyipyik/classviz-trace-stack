// Renderer.js - UI rendering module
/**
 * Renderer class
 * Responsible for creating and updating DOM elements
 */
class Renderer {
  constructor(dataStore, container, eventBus) {
    // Data source manager
    this.data = dataStore;

    // DOM container
    this.container = container;

    this.eventBus = eventBus;

    // Batch update mode
    this.batchMode = false;
    this.pendingUpdates = new Set();

    // Event listeners
    if (this.eventBus) {
      this.eventBus.subscribe('scrollToFocusedNode', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          setTimeout(() => {
            this.ensureNodeVisible(currentNodeId);
            this.updateCurrentNodeFocusUI(currentNodeId);
            this.data.expand(currentNodeId);
            this.updateNodeExpansion(currentNodeId);
            this.scrollToNode(currentNodeId);
          }, 100);
        }
      });
      
      this.eventBus.subscribe('changeCurrentFocusedNode', (data) => {
        if (data && data.nodeId) {
          const label = this.data.getNodeDataById(data.nodeId).label;
          this.ensureNodeVisible(data.nodeId);
          this.updateCurrentMethodDisplay(label);
          this.updateCurrentNodeFocusUI(data.nodeId);
          this.scrollToNode(data.nodeId);
        }
      });

      this.eventBus.subscribe('nodeStructureChanged', ({ nodeId, compressed }) => {
        if (nodeId) {
          this.renderTree();
  
          // 恢复当前节点的焦点
          if (this.data.current) {
            this.ensureNodeVisible(this.data.current);
            this.updateCurrentNodeFocusUI(this.data.current);
            this.scrollToNode(this.data.current);
          }
        }
      })

      this.eventBus.subscribe('nodeDataChanged', (data) => {
        this.nodeDataChangedEventHandler(data);
      });
      
      this.eventBus.subscribe('nodeSelectionChanged', (data) => {
        if (data && data.nodeId) {
          // Update current node selection
          const label = this.data.nodes.get(data.nodeId).data.label;
          if (data.nodeId === this.data.current) {
            this.updateCurrentMethodDisplay(label);
          }
        }
      });
    }

    this.listenToCurrentNodeSelectionCheckBox();
  }

  // Render the tree
  renderTree() {
    this.container.innerHTML = '';

    // Get root node
    const rootNode = this.data.tree;

    if (rootNode) {
      // Create root element
      const rootElement = this.createNodeElement(rootNode.id);
      this.container.appendChild(rootElement);
    } else {
      console.error("No root node found!");
    }
  }

  nodeDataChangedEventHandler(data) {
    if (data && data.nodeId) {
      // Update node data
      this.updateNode(data.nodeId);

      const nodeElement = this.data.getNodeElement(data.nodeId);
      if (nodeElement) {
        // First remove all classes
        nodeElement.classList.remove('recursive-entry-node');
        nodeElement.classList.remove('fan-out-node');
        nodeElement.classList.remove('implementation-entry-node');

        // Then add classes as needed
        if (data.field === 'recursiveEntryPoint' && data.value) {
          nodeElement.classList.add('recursive-entry-node');
          return
        }

        if (data.field === 'fanOut' && data.value) {
          nodeElement.classList.add('fan-out-node');
          return
        }

        if (data.field === 'implementationEntryPoint' && data.value) {
          nodeElement.classList.add('implementation-entry-node');
        }
      }
    }
  }

  listenToCurrentNodeSelectionCheckBox() {
    const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');
    if (currentNodeCheckbox) {
      currentNodeCheckbox.addEventListener('change', (e) => {
        if (this.data.current) {
          this.data.select(this.data.current, e.target.checked);
          this.updateNode(this.data.current);
          this.eventBus.publish('refreshFlame', {});
        }
      });
    }
  }

  // Create a node element
  createNodeElement(nodeId) {
    const nodeData = this.data.getNodeDataById(nodeId);
    const nodeState = this.data.getNodeState(nodeId);

    if (!nodeData) return null;

    // Create list item
    const li = document.createElement('li');
    li.dataset.nodeId = nodeId;

    // Create call item div
    const itemDiv = document.createElement('div');
    itemDiv.className = 'call-item';
    itemDiv.dataset.nodeId = nodeId;

    // Apply color
    if (nodeData.color) {
      itemDiv.style.borderLeft = `4px solid ${nodeData.color}`;
      itemDiv.style.backgroundColor = `${nodeData.color}20`; // Add transparency
    }

    // Apply selected state (checkbox selection)
    if (nodeState.selected) {
      itemDiv.classList.add('selected');
    }

    // Apply status of special nodes
    if (nodeData.status) {
      if (nodeData.status.implementationEntryPoint) {
        itemDiv.classList.add('implementation-entry-node');
      }

      if (nodeData.status.fanOut) {
        itemDiv.classList.add('fan-out-node');
      }

      if (nodeData.status.recursiveEntryPoint) {
        itemDiv.classList.add('recursive-entry-node');
      }
    }

    // Apply highlight state
    if (nodeState.highlight) {
      itemDiv.classList.add('search-highlight');
    }

    // Save node element to data store
    this.data.setNodeElement(nodeId, itemDiv);

    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.checked = nodeState.selected;
    checkbox.addEventListener('change', () => {
      // Update selected state
      this.data.select(nodeId, checkbox.checked);

      // If checkbox is checked, set current node
      // Trigger current node focus
      if (checkbox.checked) {
        this.data.setCurrent(nodeId);
        this.updateCurrentMethodDisplay(nodeData.label);
        if (this.eventBus) {
          this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', {
            nodeId: nodeId
          });
          this.eventBus.publish('changeClassvizFocus', {
            nodeId: nodeId
          });
        }

      }
    });
    itemDiv.appendChild(checkbox);

    // Create toggle button
    const toggleBtn = document.createElement('span');
    toggleBtn.className = 'toggle-btn';

    const hasChildren = this.data.getChildrenIds(nodeId).length > 0;

    if (hasChildren) {
      toggleBtn.textContent = nodeState.expanded ? '▼' : '▶';

      // Add click event
      // Inside the toggleBtn click event listener in the createNodeElement method
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Store the current expansion state before changing it
        const wasExpanded = nodeState.expanded;
        console.log(nodeState, "node state info")

        // Set current node
        this.data.setCurrent(nodeId);

        // Update method selection checkbox UI in diagram
        this.updateCurrentNodeFocusUI(nodeId);

        // Update current method display in bottom bar
        this.updateCurrentMethodDisplay(nodeData.label);

        // Toggle node expansion (moved here from below)
        this.data.toggleExpand(nodeId);

        // Update node expansion state right away (moved from below)
        this.toggleNodeExpansion(li, nodeId);

        // If click and auto selection is enabled, select children
        if (!wasExpanded && this.data.settings.autoExpand) {
          setTimeout(() => {
            const changedIds = this.data.selectChildren(nodeId);
            this.batchUpdateNodes(changedIds);
            console.log("auto expand and create finished")
          }, 100);
        }else{
          console.log("auto expand and create not triggered")
        }

        if (this.eventBus) {
            this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', {
              nodeId: nodeId
            });
       
        }
      });
    } else {
      // No children, hide toggle button
      toggleBtn.textContent = ''; 
      toggleBtn.style.display = 'none'; 
    }
    itemDiv.appendChild(toggleBtn);

    // Create node percentage
    const percentage = document.createElement('span');
    percentage.className = 'percentage';
    percentage.textContent = (nodeData.percent || '') + '%';
    itemDiv.appendChild(percentage);

    // Create method name
    this.renderMethodName(itemDiv, nodeData.label);

    // Create execution time
    const executionTime = document.createElement('span');
    executionTime.className = 'execution-time';
    executionTime.textContent = this.data.formatTime(nodeData.time);
    itemDiv.appendChild(executionTime);

    // Set node style
    if (nodeData.isRoot) {
      itemDiv.classList.add('root-node');
    }

    // Click method to select event listener
    itemDiv.addEventListener('click', (e) => {
      if (e.target !== checkbox && e.target !== toggleBtn) {
        // Set current node as currentNode
        this.data.setCurrent(nodeId);

        // Update focus node UI
        this.updateCurrentNodeFocusUI(nodeId);

        // Update current method display UI
        this.updateCurrentMethodDisplay(nodeData.label);
        
        if (this.eventBus) {
          this.eventBus.publish('changeCurrentFocusedNodeForStepByStep', {
            nodeId: nodeId
          });
          this.eventBus.publish('changeClassvizFocus', {
            nodeId: nodeId
        });
        }
      }
    });

    li.appendChild(itemDiv);

    // If node is expanded and has children, create child nodes
    if (nodeState.expanded && hasChildren) {
      const childUl = document.createElement('ul');

      // Get all child node IDs
      const childrenIds = this.data.getChildrenIds(nodeId);

      // Create child node elements
      childrenIds.forEach(childId => {
        const childElement = this.createNodeElement(childId);
        childUl.appendChild(childElement);
      });

      li.appendChild(childUl);
    }

    return li;
  }

  // Add method name to container
  renderMethodName(container, fullName) {
    if (!fullName) {
      const methodNameSpan = document.createElement('span');
      methodNameSpan.className = 'method-name';
      methodNameSpan.textContent = 'Unknown';
      container.appendChild(methodNameSpan);
      return;
    }

    const methodMatch = fullName.match(/(.+)\.([^.]+)(\(.*\))/);

    if (methodMatch) {
      const className = methodMatch[1];
      const methodName = methodMatch[2];
      const params = methodMatch[3];

      const methodNameSpan = document.createElement('span');
      methodNameSpan.className = 'method-name';
      methodNameSpan.textContent = `${className}.${methodName}`;
      container.appendChild(methodNameSpan);

      const paramsSpan = document.createElement('span');
      paramsSpan.className = 'params';
      paramsSpan.textContent = params;
      container.appendChild(paramsSpan);
    } else {
      const methodNameSpan = document.createElement('span');
      methodNameSpan.className = 'method-name';
      methodNameSpan.textContent = fullName;
      container.appendChild(methodNameSpan);
    }
  }

  // Toggle node expansion
  toggleNodeExpansion(li, nodeId) {
    const nodeState = this.data.getNodeState(nodeId);
    const nodeElement = li.querySelector('.call-item');
    const toggleBtn = nodeElement.querySelector('.toggle-btn');

    if (!nodeState.expanded) {
      // Folding operation
      const childUl = li.querySelector('ul');
      if (childUl) {
        childUl.style.display = 'none';
      }
      toggleBtn.textContent = '▶';
    } else {
      // Expanding operation
      let childUl = li.querySelector('ul');

      if (!childUl) {
        // First time expanding, create child nodes
        childUl = document.createElement('ul');

        // Get all child node IDs
        const childrenIds = this.data.getChildrenIds(nodeId);

        // Create child node elements
        childrenIds.forEach(childId => {
          const childElement = this.createNodeElement(childId);
          childUl.appendChild(childElement);
        });

        li.appendChild(childUl);
      } else {
        // Already exists, just show it
        childUl.style.display = '';
      }
      // Update toggle button text
      toggleBtn.textContent = '▼';
    }
  }

  // Update node UI
  updateNode(nodeId) {
    // In batch update mode, only collect node IDs
    if (this.batchMode) {
      this.pendingUpdates.add(nodeId);
      return;
    }

    const nodeData = this.data.getNodeDataById(nodeId);
    const nodeState = this.data.getNodeState(nodeId);
    const nodeElement = this.data.getNodeElement(nodeId);

    if (!nodeData || !nodeState || !nodeElement) return;

    // Update selected state
    const checkbox = nodeElement.querySelector('.checkbox');
    if (checkbox) {
      checkbox.checked = nodeState.selected;
    }

    // Update highlight state
    if (nodeState.highlight) {
      nodeElement.classList.add('search-highlight');
    } else {
      nodeElement.classList.remove('search-highlight');
    }

    // Update focused node state
    if (this.data.current === nodeId) {
      nodeElement.classList.add('focused');
    } else {
      nodeElement.classList.remove('focused');
    }
  }

  // Batch update nodes
  batchUpdateNodes(nodeIds) {
    // Enter batch update mode
    this.batchMode = true;

    try {
      // Execute updates
      nodeIds.forEach(id => this.updateNode(id));

      // Process pending updates
      const pendingIds = [...this.pendingUpdates];
      this.pendingUpdates.clear();

      // Exit batch update mode
      this.batchMode = false;

      // Actually update all nodes
      pendingIds.forEach(id => this.updateNode(id));
    } catch (error) {
      // Ensure exit from batch update mode
      this.batchMode = false;
      console.error("Error during batch update:", error);
    }
  }

  // Update current node focus UI
  updateCurrentNodeFocusUI(nodeId) {
    // Remove previous focus
    document.querySelectorAll('.call-item.focused').forEach(el => {
      if (el.dataset.nodeId !== nodeId) {
        el.classList.remove('focused');
      }
    });
  
    // // Find the node element in the DOM (in case the reference is stale)
    let nodeElement = this.data.getNodeElement(nodeId);
    
    // If the stored reference is stale, try to find the element in the DOM directly
    if (!nodeElement || !document.contains(nodeElement)) {
      nodeElement = document.querySelector(`.call-item[data-node-id="${nodeId}"]`);
      
      // If found, update the reference in the data store
      if (nodeElement) {
        this.data.setNodeElement(nodeId, nodeElement);
      }
    }
    
    if (nodeElement) {
      nodeElement.classList.add('focused');
    }
  
    // Update current node checkbox
    const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');
    if (currentNodeCheckbox && nodeId) {
      const nodeState = this.data.getNodeState(nodeId);
      currentNodeCheckbox.checked = nodeState.selected;
      currentNodeCheckbox.disabled = false;
    }
  }

  // Update current method display
  updateCurrentMethodDisplay(methodName) {
    const currentMethodElement = document.getElementById('currentMethod');
    const currentNodeCheckbox = document.getElementById('currentNodeCheckbox');

    if (currentMethodElement) {
      currentMethodElement.textContent = methodName || 'No method selected';
    }

    // Update checkbox state based on current node
    if (currentNodeCheckbox) {
      if (this.data.current) {
        const nodeState = this.data.getNodeState(this.data.current);
        currentNodeCheckbox.checked = nodeState.selected;
        currentNodeCheckbox.disabled = false;
      } else {
        currentNodeCheckbox.checked = false;
        currentNodeCheckbox.disabled = true;
      }
    }
  }

  // Scroll to node
  scrollToNode(nodeId) {
    const nodeElement = this.data.getNodeElement(nodeId);
    if (nodeElement) {
      // Get the visualization container
      const container = document.querySelector('.visualization-container');

      if (container) {
        // Calculate the scroll position within the container
        const nodeRect = nodeElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Scroll the container, not the whole page
        container.scrollTo({
          top: container.scrollTop + (nodeRect.top - containerRect.top) - (container.clientHeight / 2) + (nodeRect.height / 2),
          behavior: 'smooth'
        });
      }
    }
  }
  // Update node expansion state (for external API compatibility)
  updateNodeExpansion(nodeId) {
    const nodeState = this.data.getNodeState(nodeId);
    const nodeElement = document.querySelector(`li[data-node-id="${nodeId}"]`);

    if (!nodeElement) return;

    // Use the existing toggleNodeExpansion method with the found element
    this.toggleNodeExpansion(nodeElement, nodeId);
  }

//   /**
//  * 移除节点的所有子节点
//  * @param {string} nodeId - 要移除子节点的节点ID
//  * @returns {boolean} - 操作是否成功
//  */
//   removeChildNodes(nodeId) {
//     // 获取节点元素
//     const nodeElement = document.querySelector(`li[data-node-id="${nodeId}"]`);
//     if (!nodeElement) return false;

//     // 保存当前滚动位置
//     const container = document.querySelector('.visualization-container');
//     const scrollTop = container ? container.scrollTop : 0;

//     // 获取子节点列表
//     const childList = nodeElement.querySelector('ul');
//     if (childList) {
//       // 移除子节点列表
//       childList.remove();

//       // 更新展开/折叠按钮状态
//       const nodeItemElement = nodeElement.querySelector('.call-item');
//       const toggleBtn = nodeItemElement?.querySelector('.toggle-btn');
//       if (toggleBtn) {
//         toggleBtn.textContent = '▶';
//       }
//     }

//     // 恢复滚动位置
//     if (container) {
//       container.scrollTop = scrollTop;
//     }

//     console.log("[DEBUG]Child nodes removed successfully.");

//     return true;
//   }

  // Ensure node is visible (expand all parent nodes)
  ensureNodeVisible(nodeId) {
    // Get all parent nodes
    const ancestors = this.data.getAncestorIds(nodeId);

    // Expand all parent nodes
    ancestors.forEach(ancestorId => {
      const state = this.data.getNodeState(ancestorId);
      if (!state.expanded) {
        // Update data state
        this.data.expand(ancestorId);

        // Update UI
        const ancestorElement = document.querySelector(`li[data-node-id="${ancestorId}"]`);
        if (ancestorElement) {
          this.toggleNodeExpansion(ancestorElement, ancestorId);
        }
      }
    });

    // Scroll to node
    this.scrollToNode(nodeId);
  }
}

export { Renderer };