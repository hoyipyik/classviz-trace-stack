import { ALLOWED_LIB_METHODS } from "../trace/utils/process/callTreeParser.js";

export class ClassvizManager {
    constructor(data, cy, eventBus, idRangeByThreadMap) {
        this.stepByStepMode = false;
        this.useNumberedEdges = false;
        this.ALLOWED_LIB_METHODS = ALLOWED_LIB_METHODS;
        this.data = data;
        this.cy = cy;
        this.eventBus = eventBus;

        this.idRangeByThreadMap = idRangeByThreadMap; // Map of thread names to ID ranges;
        this.threadToMethodNodesInOrder = new Map(); // threadname -> method node list {originalId, label(cy node id)}  in order of orignaiId
        this.currentIndexByThread = new Map(); // threadname -> current index in the method node list

        // init this.threadToMethodNodesInOrder with the data
        idRangeByThreadMap.forEach((_, threadName) => {
            this.threadToMethodNodesInOrder.set(threadName, []);
            this.currentIndexByThread.set(threadName, 0);
        });

        this.originalDimensions = {}; // class node id -> original dimensions
        this.insertedNodes = new Map(); // cy method node id (nodeData.label) -> cy method node
        this.insertedEdges = new Map(); // edge node id -> cy edge 

        this.classToMethodsMap = new Map(); // class node id -> method node cy ids list (nodeData.label)

        this.methodLabelToOriginalIds = new Map(); // method node label -> original ID set

        // Uses the original ID from call tree as key: stores edge IDs where this original node is the source/target
        this.originalIdToSourceEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the source
        this.originalIdToTargetEdges = new Map(); // originalId -> Set(edge id) edges where this original node is the target

        const numberedEdgeControlInput = document.getElementById('numberedEdges');
        if (numberedEdgeControlInput) {
            numberedEdgeControlInput.checked = this.useNumberedEdges;
            numberedEdgeControlInput.addEventListener('change', (event) => {
                this.toggleEdgeNumbering(event.target.checked);
            });
        }

        this.eventBus.subscribe('changeSingleMethodByIdToClassviz', (
            { nodeId, selected }) => {
            if (selected) {
                this.insertSingleMethodById(nodeId);
            } else {
                // remove single node
                this.removeSingleMethodById(nodeId);
            }
            if (this.useNumberedEdges) {
                this.switchTraceMode(this.data.traceMode, true);
            }

        });

        this.eventBus.subscribe('changeMultiMethodByIdsToClassviz', (
            { nodeIds, selected }) => {
            if (selected) {
                nodeIds.forEach((nodeId) => {
                    this.insertSingleMethodById(nodeId);
                });
            } else {
                // remove single node
                nodeIds.forEach((nodeId) => {
                    this.removeSingleMethodById(nodeId);
                });
            }
            if (this.useNumberedEdges) {
                this.switchTraceMode(this.data.traceMode, true);
            }
        });

        this.eventBus.subscribe('switchTraceMode', ({ traceMode }) => {
            this.switchTraceMode(traceMode);
        });

        this.eventBus.subscribe('changeCurrentFocusedNodeForStepByStep', ({ nodeId }) => {
            const currentThreadName = this.data.currentThreadName;
            if (!currentThreadName) return;
            // find index in this.threadToMethodNodesInOrder for the current nodeId
            this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
                const index = methodNodes.findIndex(node => node.originalId === nodeId);
                if (index !== -1 && threadName === currentThreadName) {
                    this.currentIndexByThread.set(threadName, index);
                }
            });
        });
    }

    getMethodLabelById(id) {
        const nodeData = this.data.nodes.get(id).data;
        if (nodeData) {
            return nodeData.label;
        } else {
            console.error(`Node with id ${id} not found`);
            return null;
        }

    }

    changeAllMethodNodesColor(color) {
        this.insertedNodes.forEach((node, _) => {
            if (node) {
                node.style({
                    'background-color': color,
                    'border-color': '#999',
                });
            }
        });
    }

    changeColorOfNodeById(id, color) {
        const nodeLabel = this.data.getNodeDataById(id).label;
        const node = this.cy.$id(nodeLabel);
        if (node) {
            node.style({
                'background-color': color,
                'border-color': '#999',
            });
        }
    }

    findClassNodeByNodeLabel(label) {
        const parenIndex = label.indexOf("(");
        if (parenIndex === -1) return;
        const lastDotBeforeParens = label.lastIndexOf(".", parenIndex);
        if (lastDotBeforeParens === -1) return;
        const classId = label.substring(0, lastDotBeforeParens);
        return this.cy.$id(classId);
    }

    // Updated insertSingleMethodById function to maintain threadToMethodNodesInOrder
    insertSingleMethodById(id) {
        // Get the node label (which will be used as the cy node id)
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        // Update the methodLabelToOriginalIds map
        if (!this.methodLabelToOriginalIds.has(nodeLabel)) {
            this.methodLabelToOriginalIds.set(nodeLabel, new Set());
        }
        this.methodLabelToOriginalIds.get(nodeLabel).add(id);

        // Add to threadToMethodNodesInOrder map based on current thread
        const currentThreadName = this.data.currentThreadName;
        if (currentThreadName) {
            if (!this.threadToMethodNodesInOrder.has(currentThreadName)) {
                this.threadToMethodNodesInOrder.set(currentThreadName, []);
            }

            // Check if this node is already in the thread's list
            const threadNodes = this.threadToMethodNodesInOrder.get(currentThreadName);
            const existingNodeIndex = threadNodes.findIndex(node => node.originalId === id);

            // Only add if not already in the list
            if (existingNodeIndex === -1) {
                threadNodes.push({
                    originalId: id,
                    label: nodeLabel
                });

                // Sort the array by originalId to maintain order
                threadNodes.sort((a, b) => {
                    // Convert originalIds to integers for proper numeric comparison
                    return parseInt(a.originalId) - parseInt(b.originalId);
                });
            }
        }

        // Check if the node already exists - if so, we only need to handle edges
        const nodeExists = this.insertedNodes.has(nodeLabel);
        let addedNode = null;

        if (!nodeExists) {
            // Node creation logic - only execute if the node doesn't exist
            // Find the corresponding class node
            const classNode = this.findClassNodeByNodeLabel(nodeLabel);
            const nodeData = this.data.nodes.get(id).data;

            // Check if this is an allowed library method
            const isAllowedLibMethod = this.ALLOWED_LIB_METHODS.includes(nodeLabel);

            // If there's no class node but it's an allowed library method, create it without a parent
            if ((!classNode || classNode.length === 0) && !isAllowedLibMethod) {
                console.warn(`Class node for method ${nodeLabel} not found in cytoscape and not in allowed library methods`);
                return;
            }

            if (isAllowedLibMethod && (!classNode || classNode.length === 0)) {
                // Create library method node without a parent
                const methodNodeData = {
                    group: 'nodes',
                    data: {
                        id: nodeLabel,
                        originalId: id,
                        visible: true,
                        name: nodeLabel.split('.').pop(),
                        labels: ["LibraryOperation"],
                        properties: {
                            ...nodeData,
                            kind: "library-method",
                            simpleName: nodeLabel.split('.').pop()
                        }
                    }
                };

                // Add library method node to cytoscape
                addedNode = this.cy.add(methodNodeData);
                this.insertedNodes.set(nodeLabel, addedNode);

                // Find an appropriate position for the library method node
                // Calculate position that avoids overlap with existing nodes
                const positions = this.cy.nodes().map(n => n.position());
                let posX = 100, posY = 100;

                // If there are other nodes, position relative to them
                if (positions.length > 0) {
                    // Find average position of all nodes
                    const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
                    const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;

                    // Calculate position with some offset from average
                    posX = avgX + (Math.random() * 200 - 100);
                    posY = avgY + (Math.random() * 200 - 100);

                    // Make sure we don't overlap with any existing node
                    let overlap = true;
                    let attempts = 0;
                    while (overlap && attempts < 10) {
                        overlap = false;
                        for (const pos of positions) {
                            const distance = Math.sqrt(Math.pow(posX - pos.x, 2) + Math.pow(posY - pos.y, 2));
                            if (distance < 150) { // Minimum distance to avoid overlap
                                overlap = true;
                                break;
                            }
                        }
                        if (overlap) {
                            posX = avgX + (Math.random() * 400 - 200);
                            posY = avgY + (Math.random() * 400 - 200);
                            attempts++;
                        }
                    }
                }

                // Set the library method node's position
                addedNode.position({
                    x: posX,
                    y: posY
                });

                // Set specialized styles for library method nodes - use node's own color but with dashed border
                const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
                addedNode.style({
                    'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
                    'color': 'black',
                    'font-size': '12px',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': color,
                    'border-width': '2px',
                    'border-color': '#666', // Darker border
                    'border-style': 'dashed', // Dashed border to distinguish library methods
                    'border-opacity': 1,
                    'shape': 'round-rectangle',
                    'width': '140px', // Slightly wider than regular methods
                    'height': '35px', // Slightly taller than regular methods
                    'text-wrap': 'ellipsis',
                    'text-max-width': '130px'
                });
            } else {
                // Regular method node with parent class node
                const classId = classNode.id();
                const currentPosition = classNode.position();

                // If we haven't stored the original dimensions and position of the class node, save them (for potential restoration later)
                if (!this.originalDimensions[classId]) {
                    this.originalDimensions[classId] = {
                        width: classNode.style('width'),
                        height: classNode.style('height'),
                        textValign: classNode.style('text-valign'),
                        textHalign: classNode.style('text-halign'),
                        textMarginY: classNode.style('text-margin-y'),
                        position: { x: currentPosition.x, y: currentPosition.y }
                    };
                }

                // Create method node (note that this node's data.parent is set to classNode)
                const methodNodeData = {
                    group: 'nodes',
                    data: {
                        id: nodeLabel,
                        originalId: id, // We keep just one originalId in the node data
                        parent: classId,
                        visible: true,
                        name: nodeLabel.split('.').pop(),
                        labels: ["Operation"],
                        properties: {
                            ...nodeData,
                            kind: "method",
                            simpleName: nodeLabel.split('.').pop()
                        }
                    }
                };

                // Add method node to cytoscape
                addedNode = this.cy.add(methodNodeData);
                this.insertedNodes.set(nodeLabel, addedNode);

                // Update the classToMethodsMap
                if (!this.classToMethodsMap.has(classId)) {
                    this.classToMethodsMap.set(classId, new Set());
                }
                this.classToMethodsMap.get(classId).add(nodeLabel);

                // Adjust the parent (class) node's style while maintaining its position
                // Dynamically adjust the height based on the number of method nodes
                const methodCount = classNode.children().length;
                const newHeight = Math.max(150, 80 + (methodCount * 110)); // Increased spacing between methods
                const newWidth = Math.max(parseInt(this.originalDimensions[classId].width), 800); // Greatly increased width

                classNode.style({
                    'width': newWidth,
                    'height': newHeight,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'text-margin-y': 18
                });

                // Explicitly reset the class node's position to avoid offset due to style changes
                classNode.position(currentPosition);

                // Calculate the position for the method node
                const methodIndex = classNode.children().length - 1;
                const parentCenter = currentPosition;
                const parentTopY = parentCenter.y - (newHeight / 2);

                // Improved positioning calculation to prevent overlap
                const offsetY = 60 + (methodIndex * 40); // Increased vertical spacing
                const methodAbsoluteY = parentTopY + offsetY;

                // Horizontal centering with variance for many methods
                const horizontalVariance = methodCount > 4 ? (methodIndex % 2) * 20 - 10 : 0;
                const methodAbsoluteX = parentCenter.x + horizontalVariance;

                // Set the method node's position
                addedNode.position({
                    x: methodAbsoluteX,
                    y: methodAbsoluteY
                });

                // Set other styles for the method node (excluding position)
                const color = nodeData.color || nodeData.nodeColor || '#D3D3D3';
                addedNode.style({
                    'label': nodeData.properties?.simpleName || nodeLabel.split('.').pop(),
                    'color': 'black',
                    'font-size': '12px',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': color,
                    'border-width': '1px',
                    'border-color': '#999',
                    'border-opacity': 0.8,
                    'shape': 'round-rectangle',
                    'width': '120px',
                    'height': '30px',
                    'text-wrap': 'ellipsis',
                    'text-max-width': '110px'
                });
            }
        } else {
            // Node already exists, retrieve it for edge creation
            addedNode = this.insertedNodes.get(nodeLabel);
            console.log(`Method node ${nodeLabel} already exists, proceeding with edge creation`);
        }

        // Whether the node is new or existing, create the edges
        this.createEdgesForNode(id, nodeLabel);
    }

    // Updated removeSingleMethodById function to maintain threadToMethodNodesInOrder

    removeSingleMethodById(id) {
        // 获取节点标签
        const nodeLabel = this.getMethodLabelById(id);
        if (!nodeLabel) {
            console.error(`Could not get label for node with id ${id}`);
            return;
        }

        // 从线程节点列表中移除
        this.removeFromThreadMethodNodes(id, nodeLabel);

        // 检查节点是否存在
        if (!this.insertedNodes.has(nodeLabel)) {
            console.warn(`Method node ${nodeLabel} not found, nothing to remove`);
            return;
        }

        // 检查ID是否与方法标签关联
        if (!this.methodLabelToOriginalIds.has(nodeLabel) ||
            !this.methodLabelToOriginalIds.get(nodeLabel).has(id)) {
            console.warn(`ID ${id} not associated with method ${nodeLabel}`);
            return;
        }

        const methodNode = this.insertedNodes.get(nodeLabel);
        if (!methodNode) return;

        // 处理节点的边和连接关系
        this.handleNodeEdges(id, nodeLabel);

        // 更新映射并决定是否删除节点
        this.updateMappingsAndRemoveNode(id, nodeLabel, methodNode);
    }

    /**
 * 为时序模式创建带有序号和颜色的顺序边
 * Creates sequential edges with numbering and color spectrum for trace mode
 */
    createNumberedSequentialEdges() {
        // 遍历每个线程
        this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            // 获取已插入的节点（已选中的节点）
            const selectedNodes = methodNodes.filter(node =>
                this.insertedNodes.has(node.label) &&
                this.data.nodes.get(node.originalId)?.data?.selected
            );

            // 如果线程中少于2个已选中的节点，则无需创建边
            if (selectedNodes.length < 2) {
                return;
            }

            // 清除所有现有边，为重建边做准备
            // 我们只需清除与这个线程中节点相关的边
            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            // 生成颜色谱
            const colorSpectrum = this.generateColorSpectrum(selectedNodes.length - 1);

            // 按照节点在列表中的顺序创建边（链表式连接）
            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                // 创建从当前节点到下一个节点的带编号和颜色的边
                this.createNumberedEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label,
                    i + 1, // 序号从1开始
                    colorSpectrum[i] // 从颜色谱中获取颜色
                );
            }
        });
    }

    /**
     * 为调用树模式创建带有序号和颜色的边，参考现有的rebuildCallTreeEdges实现
     * Creates numbered edges with colors for call tree mode, following the existing rebuildCallTreeEdges implementation
     */
    rebuildNumberedCallTreeEdges() {
        // 清除所有现有边
        this.clearAllEdges();

        // 计算最大深度，为每个深度分配颜色
        const maxDepth = this.calculateMaxDepth();
        const depthColors = this.generateDepthColors(maxDepth);

        // 遍历每个线程
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            // 获取该线程的树数据
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            // 获取该树的根节点
            const rootNode = treeData;
            if (!rootNode) return;

            // 从根节点开始遍历树，创建所有带编号和颜色的边
            this.traverseTreeAndCreateNumberedEdges(rootNode, depthColors);
        });

        console.log(`Recreated numbered call tree edges for all threads`);
    }

    /**
     * 计算选中节点的最大深度
     * @returns {number} 最大深度
     */
    calculateMaxDepth() {
        let maxDepth = 0;

        // 函数递归计算节点深度
        const calculateNodeDepth = (node, depth = 0, visited = new Set()) => {
            if (!node || !node.id || visited.has(node.id)) return depth;
            visited.add(node.id);

            // 获取节点数据
            const nodeData = this.data.nodes.get(node.id)?.data;
            if (!nodeData) return depth;

            const nodeLabel = this.getMethodLabelById(node.id);
            const isNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

            // 如果节点被选中，更新最大深度
            if (isNodeSelected) {
                maxDepth = Math.max(maxDepth, depth);
            }

            // 递归处理子节点
            const children = node.children || [];
            for (const child of children) {
                calculateNodeDepth(child, depth + 1, new Set([...visited]));
            }

            return depth;
        };

        // 遍历每个线程的根节点
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            const treeData = this.data.threadsData[threadName];
            if (treeData) {
                calculateNodeDepth(treeData, 0);
            }
        });

        return maxDepth;
    }

    /**
     * 为每个深度生成颜色
     * @param {number} maxDepth 最大深度
     * @returns {Object} 深度到颜色的映射
     */
    generateDepthColors(maxDepth) {
        const colors = {};

        // 确保至少有一种颜色
        if (maxDepth < 0) maxDepth = 0;

        for (let depth = 0; depth <= maxDepth; depth++) {
            // 在色谱上均匀分布颜色
            const hue = Math.floor((depth / (maxDepth + 1)) * 360);
            colors[depth] = `hsl(${hue}, 80%, 50%)`;
        }

        return colors;
    }

    /**
     * 遍历树并创建带编号和颜色的边
     * @param {Object} node - 当前树节点
     * @param {Object} depthColors - 深度到颜色的映射
     * @param {Set} visited - 已访问节点的集合
     * @param {Number} depth - 当前深度
     * @param {String|null} lastSelectedParentId - 上一个选中的父节点ID
     * @param {String|null} lastSelectedParentLabel - 上一个选中的父节点标签
     */
    traverseTreeAndCreateNumberedEdges(node, depthColors, visited = new Set(), depth = 0, lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || !node.id || visited.has(node.id)) return;
        visited.add(node.id);

        // 获取当前节点信息
        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return; // 节点不存在，跳过处理

        const nodeLabel = this.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

        // 如果当前节点被选中，更新"最后选中的父节点"为当前节点
        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;
        let currentDepth = depth;

        if (isCurrentNodeSelected) {
            // 当前节点被选中，更新为新的父节点
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            // 如果有上一个选中的父节点，创建从父节点到当前节点的边
            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.createNumberedEdge(
                    lastSelectedParentId,
                    lastSelectedParentLabel,
                    node.id,
                    nodeLabel,
                    depth,  // 使用深度作为序号
                    depthColors[depth - 1] || '#999999' // 使用当前深度的颜色
                );
            }
        }

        // 递归处理所有子节点，无论当前节点是否被选中
        const children = node.children || [];
        for (const child of children) {
            this.traverseTreeAndCreateNumberedEdges(
                child,
                depthColors,
                new Set([...visited]), // 创建一个新的visited集合，防止循环引用问题
                isCurrentNodeSelected ? depth + 1 : depth, // 只有当当前节点被选中时才增加深度
                currentSelectedParentId,
                currentSelectedParentLabel
            );
        }
    }
    /**
   * 创建带有序号和颜色的边 (修正版)
   * @param {String} sourceOriginalId - 源节点原始ID
   * @param {String} sourceNodeLabel - 源节点标签
   * @param {String} targetOriginalId - 目标节点原始ID
   * @param {String} targetNodeLabel - 目标节点标签
   * @param {Number} sequenceNumber - 序列号
   * @param {String} color - 边的颜色 (确保传入的是有效的 CSS 颜色字符串)
   */
    createNumberedEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel, sequenceNumber, color) {
        // 生成边的唯一ID
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // 检查边是否已存在
        if (this.insertedEdges.has(edgeId)) {
            console.warn(`Edge with potentially duplicate ID ${edgeId} skipped.`);
            return;
        }

        // 创建边数据
        const edgeData = {
            group: 'edges',
            data: {
                id: edgeId,
                source: sourceNodeLabel,
                target: targetNodeLabel,
                sourceOriginalId: sourceOriginalId,
                targetOriginalId: targetOriginalId,
                label: `${sequenceNumber}`,
                sequenceNumber: sequenceNumber,
                interaction: "trace_call",
                color: color // 存储颜色，但不直接用于样式
            }
        };

        // 添加边到cytoscape
        const edge = this.cy.add(edgeData);

        console.log(`Adding edge ${edgeId} with color = ${color}`);

        // 重要：通过style方法覆盖CSS默认样式
        edge.style({
            'width': 3,
            'line-color': color,
            'target-arrow-color': color,
            'line-fill': 'solid', // 重要：禁用渐变，使用纯色
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': `${sequenceNumber}`,
            'font-size': '14px',
            'font-weight': 'bold',
            'text-background-color': '#FFFFFF',
            'text-background-opacity': 0.7,
            'text-background-shape': 'roundrectangle',
            'text-background-padding': '2px',
            'text-margin-y': -10,
            'color': '#000000'
        });

        // 处理自引用边
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }

        // 存储边到映射中
        this.insertedEdges.set(edgeId, edge);

        // 在原始ID映射中跟踪此边
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);

        return edge;
    }

    /**
     * 生成颜色谱数组
     * @param {Number} count - 需要的颜色数量
     * @returns {Array} - 颜色数组
     */
    generateColorSpectrum(count) {
        const colors = [];

        // 使用HSL颜色空间更容易生成均匀分布的颜色
        // H: 色相(0-360)，S: 饱和度(0-100)，L: 亮度(0-100)
        const saturation = 80; // 饱和度固定
        const lightness = 50;  // 亮度固定

        if (count <= 0) return colors;

        // 生成均匀分布的颜色
        for (let i = 0; i < count; i++) {
            // 在整个色谱上均匀分布色相值
            const hue = Math.floor((i / count) * 360);
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            colors.push(color);
        }

        return colors;
    }

    /**
     * 切换图表的边创建模式并重新创建所有边
     * @param {boolean} traceMode - 是否启用时序模式的边创建
     * @param {boolean} useNumbering - 是否使用带编号和颜色的边
     */
    switchTraceMode(traceMode, useNumbering = this.useNumberedEdges) {
        // 更新模式设置
        this.data.traceMode = traceMode;
        console.log(`Switched to ${traceMode ? 'trace' : 'call tree'} mode with ${useNumbering ? 'numbered' : 'standard'} edges`);

        // 如果没有足够的节点，则无需处理
        if (this.insertedNodes.size <= 1) {
            console.log("Less than 2 nodes exist, no edges to recreate");
            return;
        }

        // 清除所有现有边
        this.clearAllEdges();

        // 根据当前模式和编号选项重新创建边
        if (traceMode) {
            // 时序模式
            if (useNumbering) {
                // 使用带编号和颜色的时序边
                this.createNumberedSequentialEdges();
            } else {
                // 使用标准时序边
                this.createSequentialEdges();
            }
        } else {
            // 调用树模式
            if (useNumbering) {
                // 使用带编号和颜色的调用树边
                this.rebuildNumberedCallTreeEdges();
            } else {
                // 使用标准调用树边
                this.rebuildCallTreeEdges();
            }
        }
    }

    /**
     * 切换边的编号和颜色模式
     * @param {boolean} useNumbering - 是否启用编号模式，如果为undefined则切换当前模式
     * @returns {boolean} - 切换后的模式状态
     */
    toggleEdgeNumbering(useNumbering) {
        // 如果未指定，则切换当前状态
        if (useNumbering === undefined) {
            this.useNumberedEdges = !this.useNumberedEdges;
        } else {
            this.useNumberedEdges = useNumbering;
        }

        // 使用当前traceMode和新的编号设置重新创建边
        this.switchTraceMode(this.data.traceMode, this.useNumberedEdges);

        return this.useNumberedEdges;
    }

    /**
     * 清除图表中的所有边
     */
    clearAllEdges() {
        // 收集所有需要移除的边的ID
        const edgeIds = [];
        this.insertedEdges.forEach((_, id) => {
            edgeIds.push(id);
        });

        // 循环移除每条边
        for (const edgeId of edgeIds) {
            if (this.insertedEdges.has(edgeId)) {
                const edge = this.insertedEdges.get(edgeId);
                // 从cytoscape中移除边
                this.cy.remove(edge);
                // 从我们的映射中移除边
                this.insertedEdges.delete(edgeId);

                // 获取源和目标节点信息
                const sourceOriginalId = edge.data('sourceOriginalId');
                const targetOriginalId = edge.data('targetOriginalId');

                // 从源节点的边集合中移除
                if (sourceOriginalId && this.originalIdToSourceEdges.has(sourceOriginalId)) {
                    this.originalIdToSourceEdges.get(sourceOriginalId).delete(edgeId);
                }

                // 从目标节点的边集合中移除
                if (targetOriginalId && this.originalIdToTargetEdges.has(targetOriginalId)) {
                    this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                }
            }
        }

        console.log(`Cleared all ${edgeIds.length} edges`);
    }

    /**
 * 为调用树模式重建所有边
 */
    rebuildCallTreeEdges() {
        // 利用已有的树结构数据重建边
        this.threadToMethodNodesInOrder.forEach((_, threadName) => {
            // 获取该线程的树数据
            const treeData = this.data.threadsData[threadName];
            if (!treeData) return;

            // 获取该树的根节点
            const rootNode = treeData;
            if (!rootNode) return;

            // 从根节点开始遍历树，创建所有边
            this.traverseTreeAndCreateEdges(rootNode);
        });

        console.log(`Recreated call tree edges for all threads`);
    }

    /**
     * 遍历树并创建边
     * @param {Object} node - 当前树节点
     * @param {Set} visited - 已访问节点的集合（防止循环引用）
     * @param {String|null} lastSelectedParentId - 上一个选中的父节点ID
     * @param {String|null} lastSelectedParentLabel - 上一个选中的父节点标签
     */
    traverseTreeAndCreateEdges(node, visited = new Set(), lastSelectedParentId = null, lastSelectedParentLabel = null) {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);

        // 获取当前节点信息
        const nodeData = this.data.nodes.get(node.id)?.data;
        if (!nodeData) return; // 节点不存在，跳过处理

        const nodeLabel = this.getMethodLabelById(node.id);
        const isCurrentNodeSelected = nodeData.selected && nodeLabel && this.insertedNodes.has(nodeLabel);

        // 如果当前节点被选中，更新"最后选中的父节点"为当前节点
        let currentSelectedParentId = lastSelectedParentId;
        let currentSelectedParentLabel = lastSelectedParentLabel;

        if (isCurrentNodeSelected) {
            // 当前节点被选中，更新为新的父节点
            currentSelectedParentId = node.id;
            currentSelectedParentLabel = nodeLabel;

            // 如果有上一个选中的父节点，创建从父节点到当前节点的边
            if (lastSelectedParentId && lastSelectedParentLabel) {
                this.createEdge(lastSelectedParentId, lastSelectedParentLabel, node.id, nodeLabel);
            }
        }

        // 递归处理所有子节点，无论当前节点是否被选中
        const children = node.children || [];
        for (const child of children) {
            this.traverseTreeAndCreateEdges(
                child,
                visited,
                currentSelectedParentId,
                currentSelectedParentLabel
            );
        }
    }

    // 从线程方法节点列表中移除节点
    removeFromThreadMethodNodes(id, nodeLabel) {
        const currentThreadName = this.data.currentThreadName;
        if (currentThreadName && this.threadToMethodNodesInOrder.has(currentThreadName)) {
            const threadNodes = this.threadToMethodNodesInOrder.get(currentThreadName);
            const nodeIndex = threadNodes.findIndex(node => node.originalId === id);

            if (nodeIndex !== -1) {
                // 从线程的有序列表中移除节点
                threadNodes.splice(nodeIndex, 1);
            }
        }
    }

    // 处理节点的边和连接关系
    handleNodeEdges(id, nodeLabel) {
        // 收集父节点和子节点
        const targetChildrenOriginalIds = [];
        let parentOriginalId = null;

        // 处理以此节点为源的边
        if (this.originalIdToSourceEdges.has(id)) {
            this.originalIdToSourceEdges.get(id).forEach(edgeId => {
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    const targetOriginalId = edge.data('targetOriginalId');
                    targetChildrenOriginalIds.push(targetOriginalId);

                    // 移除边
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    // 更新跟踪映射
                    if (this.originalIdToTargetEdges.has(targetOriginalId)) {
                        this.originalIdToTargetEdges.get(targetOriginalId).delete(edgeId);
                    }
                }
            });
        }

        // 处理以此节点为目标的边
        if (this.originalIdToTargetEdges.has(id)) {
            const parentEdges = Array.from(this.originalIdToTargetEdges.get(id));

            // 确保只有一个父节点
            if (parentEdges.length > 1) {
                console.warn(`Method ${nodeLabel} has multiple parents, expected only one in tree structure`);
            }

            // 处理父边（在树结构中应该只有一个）
            if (parentEdges.length > 0) {
                const edgeId = parentEdges[0];
                const edge = this.insertedEdges.get(edgeId);
                if (edge) {
                    parentOriginalId = edge.data('sourceOriginalId');

                    // 移除边
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);

                    // 更新跟踪映射
                    if (this.originalIdToSourceEdges.has(parentOriginalId)) {
                        this.originalIdToSourceEdges.get(parentOriginalId).delete(edgeId);
                    }
                }
            }
        }

        // 在父节点和子节点之间创建边
        this.reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds);
    }

    // 重新连接父节点和子节点
    reconnectParentToChildren(parentOriginalId, targetChildrenOriginalIds) {
        if (parentOriginalId && targetChildrenOriginalIds.length > 0) {
            const parentNodeLabel = this.getMethodLabelById(parentOriginalId);

            if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                // 从父节点到每个子节点创建直接边
                targetChildrenOriginalIds.forEach(childId => {
                    const childNodeLabel = this.getMethodLabelById(childId);
                    if (childNodeLabel && this.insertedNodes.has(childNodeLabel)) {
                        this.createEdge(parentOriginalId, parentNodeLabel, childId, childNodeLabel);
                    }
                });
            }
        }
    }

    // 更新映射并决定是否删除节点
    updateMappingsAndRemoveNode(id, nodeLabel, methodNode) {
        // 检查这是否是库方法
        const isLibraryMethod = this.ALLOWED_LIB_METHODS.includes(nodeLabel) || !methodNode.parent().length;

        // 如果这不是库方法，获取类节点
        let classId = null;
        if (!isLibraryMethod) {
            const classNode = this.findClassNodeByNodeLabel(nodeLabel);
            if (!classNode || classNode.length === 0) {
                console.warn(`Class node for method ${nodeLabel} not found`);
                return;
            }
            classId = classNode.id();
        }

        // 更新methodLabelToOriginalIds映射
        this.methodLabelToOriginalIds.get(nodeLabel).delete(id);

        // 仅当没有更多原始ID与它关联时才删除节点
        const shouldRemoveNode = this.methodLabelToOriginalIds.get(nodeLabel).size === 0;

        if (shouldRemoveNode) {
            // 从cytoscape中删除节点本身
            this.cy.remove(methodNode);

            // 更新我们的跟踪数据结构
            this.insertedNodes.delete(nodeLabel);
            this.methodLabelToOriginalIds.delete(nodeLabel);

            // 如果这不是库方法，更新类到方法的映射
            if (!isLibraryMethod && classId && this.classToMethodsMap.has(classId)) {
                this.classToMethodsMap.get(classId).delete(nodeLabel);

                // 如果这是类中的最后一个方法，恢复原始尺寸
                if (this.classToMethodsMap.get(classId).size === 0) {
                    this.restoreClassOriginalDimensions(classId);
                } else {
                    // 否则，根据剩余方法调整类大小
                    this.adjustClassSize(classId);
                }
            }
        }

        // 清理跟踪映射，无论我们是否删除了节点
        this.originalIdToSourceEdges.delete(id);
        this.originalIdToTargetEdges.delete(id);
    }
    // Helper method to restore class to original dimensions
    restoreClassOriginalDimensions(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const originalDim = this.originalDimensions[classId];
        if (originalDim) {
            classNode.style({
                'width': originalDim.width,
                'height': originalDim.height,
                'text-valign': originalDim.textValign,
                'text-halign': originalDim.textHalign,
                'text-margin-y': originalDim.textMarginY
            });

            // Reset position if needed
            if (originalDim.position) {
                classNode.position(originalDim.position);
            }
        }
    }

    // Helper method to adjust class size based on number of methods
    adjustClassSize(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const methodCount = classNode.children().length;
        const newHeight = Math.max(150, 80 + (methodCount * 110));
        const newWidth = Math.max(
            parseInt(this.originalDimensions[classId]?.width || 150),
            800
        );

        const currentPosition = classNode.position();

        classNode.style({
            'width': newWidth,
            'height': newHeight
        });

        // Explicitly reset position to avoid offset
        classNode.position(currentPosition);

        // Reposition the remaining methods
        this.repositionMethodsInClass(classId);
    }

    // Helper method to reposition methods after one is removed
    repositionMethodsInClass(classId) {
        const classNode = this.cy.$id(classId);
        if (!classNode || classNode.length === 0) return;

        const children = classNode.children();
        const methodCount = children.length;
        const parentCenter = classNode.position();
        const newHeight = parseInt(classNode.style('height'));
        const parentTopY = parentCenter.y - (newHeight / 2);

        children.forEach((methodNode, index) => {
            // Recalculate position for each method
            const offsetY = 60 + (index * 40);
            const methodAbsoluteY = parentTopY + offsetY;

            // Horizontal centering with variance for many methods
            const horizontalVariance = methodCount > 4 ? (index % 2) * 20 - 10 : 0;
            const methodAbsoluteX = parentCenter.x + horizontalVariance;

            // Set new position
            methodNode.position({
                x: methodAbsoluteX,
                y: methodAbsoluteY
            });
        });
    }

    createEdgesForNode(id, nodeLabel) {
        // 如果只有一个插入的节点，还不需要创建边
        // if (this.insertedNodes.size <= 1) {
        //     console.log("Only one node exists, skipping edge creation");
        //     return;
        // }

        // 从原始数据源获取节点数据
        const nodeData = this.data.nodes.get(id).data;
        if (!nodeData) {
            console.error(`Node data not found for id ${id}`);
            return;
        }

        // 根据traceMode决定边的创建方式
        if (!this.data.traceMode) {
            // 原有的非traceMode逻辑
            // 通过向上遍历调用树查找父节点
            const parentInfo = this.findFirstSelectedParent(id);

            if (parentInfo) {
                const { parentId, parentNodeLabel } = parentInfo;

                // 移除从父节点发出的所有边
                this.removeAllEdgesFromNode(parentId);

                // 现在从父节点向下遍历以创建新边
                this.traverseDownAndCreateEdges(parentId, parentNodeLabel);
            }
            // 如果没有找到选中的父节点，只处理当前节点的连接
            this.traverseDownAndCreateEdges(id, nodeLabel);
        } else {
            // 处理traceMode下的边缘创建
            this.createSequentialEdges();
        }
    }

    // 在traceMode下按照线程内节点的序列顺序创建边
    createSequentialEdges() {
        // 遍历每个线程
        this.threadToMethodNodesInOrder.forEach((methodNodes, threadName) => {
            // 获取已插入的节点（已选中的节点）
            const selectedNodes = methodNodes.filter(node =>
                this.insertedNodes.has(node.label) &&
                this.data.nodes.get(node.originalId)?.data?.selected
            );

            // 如果线程中少于2个已选中的节点，则无需创建边
            if (selectedNodes.length < 2) {
                return;
            }

            // 清除所有现有边，为重建边做准备
            // 我们只需清除与这个线程中节点相关的边
            selectedNodes.forEach(node => {
                this.removeAllEdgesFromNode(node.originalId);
            });

            // 按照节点在列表中的顺序创建边（链表式连接）
            for (let i = 0; i < selectedNodes.length - 1; i++) {
                const currentNode = selectedNodes[i];
                const nextNode = selectedNodes[i + 1];

                // 创建从当前节点到下一个节点的边
                this.createEdge(
                    currentNode.originalId,
                    currentNode.label,
                    nextNode.originalId,
                    nextNode.label
                );
            }
        });
    }

    // Helper method to remove all edges that originate from the given node
    removeAllEdgesFromNode(originalId) {
        if (this.originalIdToSourceEdges.has(originalId)) {
            const edgeIds = this.originalIdToSourceEdges.get(originalId);
            for (const edgeId of edgeIds) {
                // Remove the edge from Cytoscape if it exists
                if (this.insertedEdges.has(edgeId)) {
                    const edge = this.insertedEdges.get(edgeId);
                    this.cy.remove(edge);
                    this.insertedEdges.delete(edgeId);
                    this.originalIdToTargetEdges.forEach((edges, targetId) => {
                        if (edges.has(edgeId)) {
                            edges.delete(edgeId);
                        }
                    });
                }
            }
            // Clear the set of source edges
            this.originalIdToSourceEdges.set(originalId, new Set());
            // console.log(`Removed all edges from node ${originalId}`);
        }
    }

    // Helper method to find the first selected parent node in the call tree
    findFirstSelectedParent(originalId) {
        let currentId = originalId;
        console.log("Current Id, looking for parent node", currentId)

        while (currentId) {
            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) break;

            const parentId = currentNode.data.parentId;
            if (!parentId) break;

            const parentNode = this.data.nodes.get(parentId);
            if (!parentNode) break;

            // Check if the parent is selected
            if (parentNode.data.selected) {
                // Found a selected parent, return its information
                const parentNodeLabel = this.getMethodLabelById(parentId);
                if (parentNodeLabel && this.insertedNodes.has(parentNodeLabel)) {
                    return { parentId, parentNodeLabel };
                }
            }

            // Move up to the parent
            currentId = parentId;
        }

        // No selected parent found
        return null;
    }

    // Helper method to traverse down and create edges from the source node
    // Uses DFS traversal to create edges
    traverseDownAndCreateEdges(originalId, sourceNodeLabel) {
        const visited = new Set();
        // console.log(`Traversing down from ${originalId}  ${sourceNodeLabel} to create edges`);

        // Helper function using DFS traversal
        const dfs = (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            const currentNode = this.data.nodes.get(currentId);
            if (!currentNode) return;

            // Create edges for selected nodes that aren't the source node
            if (currentId !== originalId && currentNode.data.selected) {
                const targetNodeLabel = this.getMethodLabelById(currentId);
                if (targetNodeLabel && this.insertedNodes.has(targetNodeLabel)) {
                    this.createEdge(originalId, sourceNodeLabel, currentId, targetNodeLabel);
                    // Stop traversing deeper after finding a selected node
                    return;
                }
            }

            // Traverse child nodes
            const children = currentNode.data.children || [];
            for (const child of children) {
                // Extract ID from child object
                // Adjust this logic based on your data structure
                const childId = child.id || child.nodeId || child;

                // Ensure a valid ID was extracted
                if (childId && (typeof childId === 'string' || typeof childId === 'number')) {
                    dfs(childId);
                } else {
                    console.error(`Cannot extract valid ID from child:`, child);
                }
            }
        };

        // Start traversal from source node, but don't create edges for source node
        dfs(originalId);
    }

    // Helper method to create an edge between two nodes
    createEdge(sourceOriginalId, sourceNodeLabel, targetOriginalId, targetNodeLabel) {
        // Generate a unique ID for the edge
        const edgeId = `edge_${sourceOriginalId}_${targetOriginalId}_${new Date().getTime()}`;

        // Check if this edge already exists
        if (this.insertedEdges.has(edgeId)) {
            // console.log(`Edge ${edgeId} already exists, skipping creation`);
            return;
        }

        // Create the edge data
        const edgeData = {
            group: 'edges',
            data: {
                id: edgeId,
                source: sourceNodeLabel,
                target: targetNodeLabel,
                sourceOriginalId: sourceOriginalId,
                targetOriginalId: targetOriginalId,
                label: "trace_call",
                interaction: "trace_call"
            }
        };

        // Add the edge to cytoscape
        const edge = this.cy.add(edgeData);
        // console.log(`Edge created: ${edgeId} from ${sourceNodeLabel} to ${targetNodeLabel}`);

        // Style the edge
        edge.style({
            'width': 2,
            'line-color': '#999',
            'target-arrow-color': '#999',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        });

        // For self-referential edges, adjust the curve style to make them visible
        if (sourceNodeLabel === targetNodeLabel) {
            edge.style({
                'curve-style': 'unbundled-bezier',
                'control-point-distances': [50],
                'control-point-weights': [0.5],
                'loop-direction': '0deg',
                'loop-sweep': '90deg'
            });
        }

        // Store the edge in our map
        this.insertedEdges.set(edgeId, edge);

        // Track this edge in our original ID maps
        if (!this.originalIdToSourceEdges.has(sourceOriginalId)) {
            this.originalIdToSourceEdges.set(sourceOriginalId, new Set());
        }
        this.originalIdToSourceEdges.get(sourceOriginalId).add(edgeId);

        if (!this.originalIdToTargetEdges.has(targetOriginalId)) {
            this.originalIdToTargetEdges.set(targetOriginalId, new Set());
        }
        this.originalIdToTargetEdges.get(targetOriginalId).add(edgeId);

        // console.log(`Created edge from ${sourceNodeLabel} to ${targetNodeLabel}`);
    }
}