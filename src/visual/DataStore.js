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
    this.packageInfo = new Map(); // Mapping from package name to {totalCount:0, color:""}
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
    this.traceMode = false;  // Default trace mode is call graph mode

    // Application settings
    this.settings = {
      autoExpand: false
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
  // 全局线程节点映射的初始化和访问方法
  //===============================================

  // 初始化所有线程的节点映射
  initAllThreadsNodes() {
    // 遍历所有线程
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // 为每个线程创建节点映射
      const threadNodes = new Map();

      // 设置到全局映射
      this.allThreadsNodes.set(threadName, threadNodes);

      // 构建节点映射
      this.buildThreadNodesMap(threadName, threadData);
    });
  }

  // 为特定线程构建节点映射
  buildThreadNodesMap(threadName, threadData) {
    const threadNodes = this.allThreadsNodes.get(threadName);

    // 递归构建节点映射
    const buildNodeMap = (node) => {
      if (!node || !node.id) return;

      // 只存储节点ID到节点数据的映射
      threadNodes.set(node.id, { data: node });

      // 递归处理子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          buildNodeMap(child);
        });
      }
    };

    // 从根节点开始构建映射
    buildNodeMap(threadData);
  }

  //===============================================
  // 初始化所有线程的数据
  //===============================================

  // 初始化所有线程的所有数据
  initAllThreadsData() {
    // Initialize thread-to-package mappings
    Object.keys(this.threadsData).forEach(threadName => {
      this.threadToPackageMap.set(threadName, new Set());
    });

    // 遍历所有线程
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // 为每个线程创建节点ID数组
      this.threadToNodesMap.set(threadName, []);

      // 初始化该线程的所有数据
      this.initThreadData(threadName, threadData);
    });
  }

  // 初始化特定线程的数据
  initThreadData(threadName, node, parentId = null) {
    if (!node || !node.id) return;

    // 存储节点数据
    this.nodes.set(node.id, { data: node });

    // 存储节点ID到线程的映射
    this.originalIdToThreadMap.set(node.id, threadName);

    // 存储线程到节点ID的映射
    this.threadToNodesMap.get(threadName).push(node.id);

    // 设置初始状态
    this.state.set(node.id, {
      selected: node.selected || false,
      expanded: !node.collapsed,
      highlight: false
    });

    // 处理包名映射
    if (node.packageName) {
      // Add package name to thread's package set
      this.threadToPackageMap.get(threadName).add(node.packageName);
      
      // 初始化包信息
      if (!this.packageInfo.has(node.packageName)) {
        this.packageInfo.set(node.packageName, {
          totalCount: 0,
          color: node.color || ''
        });
        this.packageIDs.set(node.packageName, []);
        this.packageSelectedIDs.set(node.packageName, []);
      }

      // 更新包信息
      const info = this.packageInfo.get(node.packageName);
      info.totalCount++;
      if (!info.color && node.color) {
        info.color = node.color;
      }

      // 添加节点ID到包ID列表
      this.packageIDs.get(node.packageName).push(node.id);

      // 如果节点已经被选中，添加到选中ID列表
      if (node.selected) {
        this.packageSelectedIDs.get(node.packageName).push(node.id);
        this.selected.add(node.id);
      }
    }

    // 设置父子关系
    if (parentId) {
      this.parents.set(node.id, parentId);

      if (!this.children.has(parentId)) {
        this.children.set(parentId, []);
      }
      this.children.get(parentId).push(node.id);
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.initThreadData(threadName, child, node.id);
      });
    }
  }
  /**
    * 压缩递归树节点
    * @param {string} nodeId - 递归入口点节点ID
    * @param {boolean} compress - true表示压缩，false表示恢复
    * @returns {boolean} - 操作是否成功
    */
  compressRecursiveTree(nodeId, compress = true) {
    // 获取节点数据
    const nodeInfo = this.nodes.get(nodeId);
    if (!nodeInfo || !nodeInfo.data) return false;

    const nodeData = nodeInfo.data;

    // 如果节点不是递归入口点，则返回
    if (!nodeData.status || !nodeData.status.recursiveEntryPoint) {
      return false;
    }

    // 获取当前节点的子节点
    const children = nodeData.children || [];

    // 获取递归节点的标签（方法名）
    const recursiveLabel = nodeData.label;

    // 如果是压缩操作
    if (compress) {
      // 已经压缩过，无需再次操作
      if (nodeData._originalChildren) {
        return false;
      }

      // 深拷贝原始子节点结构以便还原
      nodeData._originalChildren = JSON.parse(JSON.stringify(children));

      // 用于存储合并后的直接子节点
      // 键是子树的调用路径签名，值是子树节点
      const mergedDirectChildren = new Map();

      // 用于存储出口节点（没有递归调用的叶节点）
      const exitNodes = [];

      // 存储需要取消选择的节点ID列表
      const nodesToDeselect = new Set();

      // 收集所有非递归调用的直接子节点和出口节点，同时记录所有访问过的节点
      const collectNodes = (nodes, isDirectChild = true) => {
        for (const child of nodes) {
          // 记录当前节点ID，用于后续取消选择
          nodesToDeselect.add(child.id);

          // 检查节点是否是递归出口节点
          const isExitNode = (node) => {
            // 必须是递归标签
            if (node.label !== recursiveLabel) {
              return false;
            }

            // 如果没有子节点，则是出口节点
            if (!node.children || node.children.length === 0) {
              return true;
            }

            // 检查子节点中是否有递归调用
            for (const childNode of node.children || []) {
              if (childNode.label === recursiveLabel) {
                return false; // 有递归调用，不是出口节点
              }
            }

            return true; // 是递归标签，且子节点中不包含递归调用，是出口节点
          };

          if (isExitNode(child)) {
            // 是出口节点，整个保留下来
            // console.log("找到出口节点:", child.label);
            const exitNode = JSON.parse(JSON.stringify(child));
            exitNode.isExit = true;
            // 设置正确的parentId
            exitNode.parentId = nodeId;
            exitNodes.push(exitNode);
          } else if (child.label === recursiveLabel) {
            // 这是递归调用但不是出口节点，继续向下找
            collectNodes(child.children || [], false);
          } else {
            // 非递归标签节点，生成路径签名并合并
            const pathSignature = generatePathSignature(child);

            if (mergedDirectChildren.has(pathSignature)) {
              // 已存在相同路径签名的节点，合并
              const existingNode = mergedDirectChildren.get(pathSignature);
              const currentNode = JSON.parse(JSON.stringify(child));

              // 设置正确的parentId
              currentNode.parentId = nodeId;

              // 使用ID较小的节点作为保留节点
              let targetNode, sourceNode;
              if (parseInt(existingNode.id) < parseInt(currentNode.id)) {
                targetNode = existingNode;
                sourceNode = currentNode;
              } else {
                targetNode = currentNode;
                sourceNode = existingNode;
                // 更新Map中的节点
                mergedDirectChildren.set(pathSignature, targetNode);
              }

              // 合并频率
              targetNode.freq = (targetNode.freq || 1) + (sourceNode.freq || 1);
            } else {
              // 第一次遇到这个路径签名
              const clonedChild = JSON.parse(JSON.stringify(child));
              // 设置正确的parentId
              clonedChild.parentId = nodeId;
              clonedChild.freq = clonedChild.freq || 1;
              mergedDirectChildren.set(pathSignature, clonedChild);
            }
          }

          // 递归处理子节点，收集更多需要取消选择的节点
          if (child.children && child.children.length > 0) {
            // 递归遍历所有子节点，记录节点ID
            collectChildrenIds(child.children, nodesToDeselect);
          }
        }
      };

      // 辅助函数：递归收集所有子节点ID
      const collectChildrenIds = (nodes, idSet) => {
        for (const node of nodes) {
          idSet.add(node.id);
          if (node.children && node.children.length > 0) {
            collectChildrenIds(node.children, idSet);
          }
        }
      };

      // 生成节点的路径签名
      const generatePathSignature = (node) => {
        // 基本签名是节点的标签
        let signature = node.label;

        // 如果有子节点，递归生成子节点的签名
        if (node.children && node.children.length > 0) {
          // 收集所有子节点的签名
          const childSignatures = [];
          for (const child of node.children) {
            // 跳过递归调用
            if (child.label === recursiveLabel) {
              continue;
            }
            childSignatures.push(generatePathSignature(child));
          }

          // 对子节点签名排序，确保相同结构的子树生成相同的签名
          childSignatures.sort();

          // 将子节点签名加入到当前节点的签名中
          if (childSignatures.length > 0) {
            signature += "[" + childSignatures.join(",") + "]";
          }
        }

        return signature;
      };

      // 从当前节点的子节点开始收集
      collectNodes(children);

      // 转换合并后的直接子节点为数组
      const mergedChildrenArray = Array.from(mergedDirectChildren.values());

      // 合并直接子节点和出口节点
      const newChildren = [...mergedChildrenArray, ...exitNodes];

      // 更新节点的子节点为压缩后的结果
      nodeData.children = newChildren.sort((a, b) => parseInt(a.id) - parseInt(b.id));;

      // 更新节点的压缩状态
      nodeData.compressed = true;

      // console.log("finish compression")
      // this.printNodeData(nodeId);

      // 重建所有数据关系
      this.rebuildDataStructures();

      // console.log("finish decompression")

      // this.printNodeData(nodeId);


      // 触发更新事件
      if (this.eventBus) {
        this.eventBus.publish('nodeStructureChanged', {
          nodeId,
          compressed: true
        });
      }

      return true;
    } else {
      // 恢复操作

      // 如果没有保存的原始结构，无法恢复
      if (!nodeData._originalChildren) {
        return false;
      }

      // 恢复原始子节点结构
      nodeData.children = JSON.parse(JSON.stringify(nodeData._originalChildren));

      // 清除保存的原始结构
      delete nodeData._originalChildren;

      // 更新节点的压缩状态
      nodeData.compressed = false;

      // 重建所有数据关系
      this.rebuildDataStructures();

      // console.log("finish decompression")

      // this.printNodeData(nodeId);

      // 触发更新事件
      if (this.eventBus) {
        this.eventBus.publish('nodeStructureChanged', {
          nodeId,
          compressed: false
        });
      }

      return true;
    }
  }
//   /**
//  * 简单显示节点数据
//  * @param {string} nodeId - 要显示的节点ID
//  */
//   printNodeData(nodeId) {
//     const nodeInfo = this.nodes.get(nodeId);
//     if (!nodeInfo || !nodeInfo.data) {
//       console.log(`节点 ${nodeId} 不存在`);
//       return;
//     }

//     const nodeData = nodeInfo.data;
//     console.log('节点数据:', {
//       id: nodeId,
//       label: nodeData.label,
//       compressed: nodeData.compressed,
//       children: nodeData.children ? nodeData.children.length : 0,
//       childrenData: nodeData.children
//     });

//     // 打印子节点ID列表
//     if (this.children.has(nodeId)) {
//       console.log('全局映射中的子节点IDs:', this.children.get(nodeId));
//     }
//   }

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
    // 直接从全局nodes表中获取
    const node = this.nodes.get(nodeId);
    return node ? node.data : null;
  }

  // 根据线程名称和节点ID获取节点数据
  getNodeDataByThreadAndId(threadName, nodeId) {
    const threadNodes = this.allThreadsNodes.get(threadName);
    if (!threadNodes) return null;

    const node = threadNodes.get(nodeId);
    return node ? node.data : null;
  }

  // 获取特定线程中的所有节点ID
  getAllNodeIdsForThread(threadName) {
    return this.threadToNodesMap.get(threadName) || [];
  }

  // 获取节点ID所属的线程
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
  // Package related operations - MODIFIED for current-thread specific operations
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

// Export class
export { DataStore };