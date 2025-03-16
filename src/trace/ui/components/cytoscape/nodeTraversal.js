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
 * Get a compressed version of a recursive subtree, collecting all iterations
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
    
    // Process the recursive chain to find the last recursive node
    const lastRecursiveNode = findLastRecursiveNode(cy, entryNode, entryLabel);
    
    // If we found the last recursive node, process it
    if (lastRecursiveNode) {
        // Collect all non-recursive function calls along the way with frequency counting
        collectNonRecursiveNodes(
            cy, entryNode, entryLabel, [], properties, 
            subtreeFrequency, new Set(), lastRecursiveNode.id()
        );
        
        // Create object for the last recursive node
        const lastNodeObj = { 
            id: lastRecursiveNode.id(),
            isRecursiveExit: true,
            children: []
        };
        
        const lastNodeData = lastRecursiveNode.data();
        
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
 * Find the last recursive node in a chain
 * @param {Object} cy - The Cytoscape instance
 * @param {Object} startNode - The starting node
 * @param {string} recursiveLabel - The label to identify recursive calls
 * @param {Set} visited - Set to track visited nodes (for cycle detection)
 * @returns {Object|null} The last recursive node or null if not found
 */
function findLastRecursiveNode(cy, startNode, recursiveLabel, visited = new Set()) {
    // Check for cycles
    const nodeId = startNode.id();
    if (visited.has(nodeId)) {
        return null;
    }
    visited.add(nodeId);
    
    // Get immediate children
    const childNodes = startNode.outgoers().nodes();
    if (!childNodes || childNodes.length === 0) {
        return startNode; // This is a leaf node, so it's the last one
    }
    
    // Find the recursive child among the children
    let recursiveChild = null;
    for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        const childData = childNode.data();
        const childLabel = childData.label || childData.methodName || childData.id;
        
        if (childLabel === recursiveLabel) {
            recursiveChild = childNode;
            break;
        }
    }
    
    // If we found a recursive child, continue down the chain
    if (recursiveChild) {
        const lastNode = findLastRecursiveNode(cy, recursiveChild, recursiveLabel, visited);
        return lastNode || recursiveChild;
    }
    
    // No recursive children, so this is the last one
    return startNode;
}

/**
 * Collect non-recursive nodes along the recursive chain
 * @param {Object} cy - The Cytoscape instance
 * @param {Object} startNode - The current node
 * @param {string} recursiveLabel - The label to identify recursive calls
 * @param {Array} collectedNodes - Array to collect non-recursive nodes
 * @param {Array<string>} properties - Properties to include
 * @param {Map} frequency - Map to track frequency of similar subtrees
 * @param {Set} visited - Set to track visited nodes (for cycle detection)
 * @param {string} lastNodeId - ID of the last recursive node (to exclude from collection)
 */
function collectNonRecursiveNodes(cy, startNode, recursiveLabel, collectedNodes, properties, 
                                 frequency, visited, lastNodeId) {
    // Check for cycles
    const nodeId = startNode.id();
    if (visited.has(nodeId) || nodeId === lastNodeId) {
        return;
    }
    visited.add(nodeId);
    
    // Get immediate children
    const childNodes = startNode.outgoers().nodes();
    if (!childNodes || childNodes.length === 0) {
        return;
    }
    
    // Process each child
    let recursiveChild = null;
    
    for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        const childId = childNode.id();
        const childData = childNode.data();
        const childLabel = childData.label || childData.methodName || childData.id;
        
        // Check if this is a recursive call
        if (childLabel === recursiveLabel) {
            recursiveChild = childNode;
        } else {
            // This is a non-recursive function - collect it
            const subtree = getSubTreeForSummaryAsTree(cy, childId, properties, new Set());
            if (subtree) {
                // Add to the collection
                collectedNodes.push(subtree);
                
                // Create a normalized version of the subtree for comparison (remove IDs)
                const subtreePattern = createSubtreePattern(subtree);
                
                // Update frequency map
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
    
    // Continue down the recursive chain if found
    if (recursiveChild && recursiveChild.id() !== lastNodeId) {
        collectNonRecursiveNodes(cy, recursiveChild, recursiveLabel, collectedNodes, 
                                properties, frequency, visited, lastNodeId);
    }
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