// cytoscape/nodeTraversal.js - Functions for traversing nodes

/**
 * Get all direct child nodes of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} The child nodes
 */
export function getChildNodes(cy, nodeId) {
    return cy.getElementById(nodeId).outgoers().nodes();
}

/**
 * Get all descendant nodes of a node (recursive)
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} All descendant nodes
 */
export function getAllDescendants(cy, nodeId) {
    const rootNode = cy.getElementById(nodeId);
    const descendants = rootNode.outgoers().nodes();
    const visited = new Set([nodeId]);
    
    // Process each level of descendants using breadth-first search
    let currentLevel = descendants;
    while (currentLevel.length > 0) {
        const nextLevel = cy.collection();
        
        for (let i = 0; i < currentLevel.length; i++) {
            const node = currentLevel[i];
            const id = node.id();
            if (!visited.has(id)) {
                visited.add(id);
                nextLevel.merge(node.outgoers().nodes());
            }
        }
        
        descendants.merge(nextLevel);
        currentLevel = nextLevel;
    }
    
    return descendants;
}

/**
 * Common node properties used across tree functions
 */
const DEFAULT_PROPERTIES = [
    'id', 'methodName', 'className', 'time', 'percent', 'sourceCode', 'visibility',
    'simpleName', 'qualifiedName', 'kind', 'docComment', 'metaSrc', 'description',
    'subtreeSummary', 'subtreeDetailedExplanation', 'returns', 'reason', 'howToUse',
    'howItWorks', 'assertions', 'layer', 'color', 'label', 'detailedDescription',
    'isRoot', 'collapsed'
];

/**
 * Get all descendant nodes of a node in a hierarchical cascade format
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @param {Array<string>} properties - Array of property names to include
 * @param {Set} visited - Set of visited node IDs (internal use for recursion)
 * @returns {Object} Hierarchical tree structure with specified properties and children arrays
 */
export function getAllDescendantsAsTree(cy, nodeId, properties = DEFAULT_PROPERTIES, visited = new Set()) {
    // Check for previously visited nodes to avoid cycles
    if (visited.has(nodeId)) {
        return null;
    }
    
    // Get the node and validate
    const node = cy.getElementById(nodeId);
    if (!node.length) {
        return null;
    }
    
    // Mark this node as visited
    visited.add(nodeId);
    
    // Extract node data once
    const data = node.data();
    
    // Create node object with only necessary properties
    const nodeObj = { id: nodeId, children: [] };
    
    // Add selected properties from node data
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') { // Skip ID as we've already added it
            nodeObj[prop] = data[prop] !== undefined ? data[prop] : '';
        }
    }
    
    // Get immediate children as a collection
    const childNodes = node.outgoers().nodes();
    
    // Process children if there are any
    if (childNodes.length > 0) {
        for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i];
            const childId = childNode.id();
            const childTree = getAllDescendantsAsTree(cy, childId, properties, visited);
            if (childTree) {
                nodeObj.children.push(childTree);
            }
        }
    }
    
    return nodeObj;
}

/**
 * Get a node and its descendants for summary purposes, stopping at special nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the starting node
 * @param {Array<string>} properties - Array of property names to include
 * @param {Set} visited - Set of visited node IDs (internal use for recursion)
 * @returns {Object} Hierarchical tree structure containing the node and its descendants up to special nodes
 */
export function getSubTreeForSummaryAsTree(cy, nodeId, properties = DEFAULT_PROPERTIES, visited = new Set()) {
    // Check for previously visited nodes to avoid cycles
    if (visited.has(nodeId)) {
        return null;
    }
    
    // Get the node and validate
    const node = cy.getElementById(nodeId);
    if (!node.length) {
        return null;
    }
    
    // Extract node data once
    const data = node.data();
    const status = data.status || {};

    // Check for recursive entry point
    if (status.recursiveEntryPoint && visited.size === 0) {
        return getCompressedRecursiveSubTreeAsTree(cy, nodeId, properties);
    }
    
    // Mark this node as visited
    visited.add(nodeId);
    
    // Create node object with only necessary properties
    const nodeObj = { id: nodeId, children: [] };
    
    // Add selected properties from node data
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') { // Skip ID as we've already added it
            nodeObj[prop] = data[prop] !== undefined ? data[prop] : '';
        }
    }
    
    // Check if current node is a special node
    const isSpecialNode = status.fanOut || 
        status.implementationEntryPoint || 
        status.recursiveEntryPoint;
    
    // Only process children if this is not a special node (or if it's the starting node)
    if (!isSpecialNode || nodeId === visited.values().next().value) {
        // Get immediate children as a collection
        const childNodes = node.outgoers().nodes();
        
        // Process children if there are any
        if (childNodes.length > 0) {
            for (let i = 0; i < childNodes.length; i++) {
                const childNode = childNodes[i];
                const childId = childNode.id();
                const childTree = getSubTreeForSummaryAsTree(cy, childId, properties, visited);
                if (childTree) {
                    nodeObj.children.push(childTree);
                }
            }
        }
    }
    
    return nodeObj;
}

/**
 * 优化版的压缩递归子树函数，在单次遍历中同时完成所有操作
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the starting node (recursive entry point)
 * @param {Array<string>} properties - Array of property names to include
 * @returns {Object} Compressed tree structure with entry point and unique subtrees,
 *                   plus the last recursive node separately
 */
export function getCompressedRecursiveSubTreeAsTree(cy, nodeId, properties) {
    // Get the entry point node and validate
    const entryNode = cy.getElementById(nodeId);
    if (!entryNode.length) {
        return null;
    }
    
    // Extract node data
    const entryData = entryNode.data();
    const entryLabel = entryData.label || entryData.methodName || entryData.id;
    
    // Create the root node object with properties
    const rootObj = { 
        id: nodeId,
        isRecursiveSubtree: true,
        children: []
    };
    
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') {
            rootObj[prop] = entryData[prop] !== undefined ? entryData[prop] : '';
        }
    }
    
    // Map to track frequency of similar subtrees
    const subtreeFrequency = new Map(); 
    
    // 在单次遍历中同时找到最后一个递归节点并收集路径上的非递归节点
    const result = traverseRecursiveChainAndCollect(cy, entryNode, entryLabel, properties, subtreeFrequency);
    
    // If we found the last recursive node, process it
    if (result.lastNode) {
        const lastRecursiveNode = result.lastNode;
        const lastNodeData = lastRecursiveNode.data();
        
        // Create object for the last recursive node
        const lastNodeObj = { 
            id: lastRecursiveNode.id(),
            isRecursiveExit: true,
            children: []
        };
        
        // Add properties
        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            if (prop !== 'id') {
                lastNodeObj[prop] = lastNodeData[prop] !== undefined ? lastNodeData[prop] : '';
            }
        }
        
        // Check if the last node itself is a special node
        const lastNodeStatus = lastNodeData.status || {};
        const isLastNodeSpecial = lastNodeStatus.fanOut || 
            lastNodeStatus.implementationEntryPoint || 
            lastNodeStatus.recursiveEntryPoint;
        
        // Handle special nodes and normal nodes differently
        if (isLastNodeSpecial) {
            // If the last node is special, mark it
            lastNodeObj.isSpecialNode = true;
        } else {
            // Get the subtree using getSubTreeForSummaryAsTree
            const subtree = getSubTreeForSummaryAsTree(cy, lastRecursiveNode.id(), properties, new Set());
            if (subtree && subtree.children) {
                lastNodeObj.children = subtree.children;
            }
        }
        
        // Add the last node to children array
        rootObj.children.push(lastNodeObj);
        
        // Add all unique subtree patterns with frequency count
        for (const entry of subtreeFrequency.values()) {
            const subtree = entry.sampleSubtree;
            // Add frequency property to the subtree
            subtree.frequency = entry.count;
            // Add subtree as a child of the root
            rootObj.children.push(subtree);
        }
    }
    
    return rootObj;
}

/**
 * 在单次遍历中找到最后递归节点并收集路径上的非递归节点
 * @param {Object} cy - The Cytoscape instance
 * @param {Object} currentNode - The current node being processed
 * @param {string} recursiveLabel - The label to identify recursive calls
 * @param {Array<string>} properties - Properties to include
 * @param {Map} frequency - Map to track frequency of similar subtrees
 * @param {Set} visited - Set to track visited nodes (for cycle detection)
 * @param {Set} allVisited - Set to track all visited nodes across the recursion
 * @param {Object|null} lastNodeFound - 已找到的最后递归节点 (用于避免收集它的子节点)
 * @returns {Object} Object containing the last recursiveNode and collected data
 */
function traverseRecursiveChainAndCollect(cy, currentNode, recursiveLabel, properties, frequency, visited = new Set(), allVisited = new Set(), lastNodeFound = null) {
    // Check for cycles
    const nodeId = currentNode.id();
    if (visited.has(nodeId)) {
        return { lastNode: null };
    }
    visited.add(nodeId);
    allVisited.add(nodeId);
    
    // 检查这个节点是否是最后的递归节点
    // 如果是最后的递归节点，我们不应收集它的子节点
    const isLastNode = lastNodeFound && lastNodeFound.id() === nodeId;
    
    // Get immediate children
    const childNodes = currentNode.outgoers().nodes();
    if (!childNodes || childNodes.length === 0) {
        return { lastNode: currentNode }; // Leaf node, end of chain
    }
    
    // Find recursive child and collect non-recursive nodes in one pass
    let recursiveChild = null;
    let foundLastNode = false;
    
    // 首先检查是否存在递归子节点
    for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        const childData = childNode.data();
        const childLabel = childData.label || childData.methodName || childData.id;
        
        if (childLabel === recursiveLabel) {
            recursiveChild = childNode;
            break;
        }
    }
    
    // 如果没有找到递归子节点，说明当前节点是递归链的最后一个节点
    if (!recursiveChild) {
        foundLastNode = true;
        lastNodeFound = currentNode;
    }
    
    // 如果这个节点不是最后节点，收集它的非递归子节点
    if (!isLastNode && !foundLastNode) {
        for (let i = 0; i < childNodes.length; i++) {
            const childNode = childNodes[i];
            const childId = childNode.id();
            const childData = childNode.data();
            const childLabel = childData.label || childData.methodName || childData.id;
            
            // 只处理非递归调用
            if (childLabel !== recursiveLabel) {
                // 收集非递归子节点
                const subtree = getSubTreeForSummaryAsTree(cy, childId, properties, new Set(allVisited));
                if (subtree) {
                    // 创建无ID的规范化子树用于比较
                    const subtreePattern = createSubtreePattern(subtree);
                    
                    // 更新频率映射
                    if (frequency.has(subtreePattern)) {
                        frequency.get(subtreePattern).count++;
                    } else {
                        frequency.set(subtreePattern, {
                            count: 1,
                            examples: [subtree.id],
                            sampleSubtree: subtree
                        });
                    }
                }
            }
        }
    }
    
    // If we found a recursive child, continue traversing the chain
    if (recursiveChild) {
        return traverseRecursiveChainAndCollect(cy, recursiveChild, recursiveLabel, properties, frequency, visited, allVisited, lastNodeFound);
    }
    
    // No recursive children, so this is the last node in the chain
    return { lastNode: currentNode };
}

/**
 * Create a pattern string from a subtree that excludes IDs but preserves structure and labels
 * @param {Object} subtree - The subtree to create a pattern from
 * @returns {string} A string representation of the subtree pattern
 */
function createSubtreePattern(subtree) {
    // Clone the subtree without the IDs
    function cloneWithoutIds(node) {
        if (!node) return null;
        
        const clone = {};
        const status = node.status || {};
        const isSpecialNode = status.fanOut || 
            status.implementationEntryPoint || 
            status.recursiveEntryPoint;
        
        // Only copy relevant properties that define the structure
        const keysToKeep = ['label', 'methodName', 'className', 'description'];
        for (let i = 0; i < keysToKeep.length; i++) {
            const key = keysToKeep[i];
            if (node[key] !== undefined) {
                clone[key] = node[key];
            }
        }
        
        // Process children recursively if they exist and if this is not a special node
        if (node.children && node.children.length > 0 && !isSpecialNode) {
            clone.children = [];
            for (let i = 0; i < node.children.length; i++) {
                const childClone = cloneWithoutIds(node.children[i]);
                if (childClone) {
                    clone.children.push(childClone);
                }
            }
        } else {
            clone.children = [];
            
            // Add a marker if this is a special node with children that we're not processing
            if (isSpecialNode && node.children && node.children.length > 0) {
                clone.isSpecialNodeWithChildren = true;
            }
        }
        
        return clone;
    }
    
    const patternObj = cloneWithoutIds(subtree);
    
    // Convert to string for comparison
    return JSON.stringify(patternObj);
}