// cytoscape/nodeTraversal.js - Functions for traversing nodes

/**
 * Get all direct child nodes of a node
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} The child nodes
 */
export function getChildNodes(cy, nodeId) {
    // Use Cytoscape's built-in selector to directly get child nodes
    // This is more efficient than manually traversing edges
    return cy.getElementById(nodeId).outgoers().nodes();
}

/**
 * Get all descendant nodes of a node (recursive)
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @returns {Array} All descendant nodes
 */
export function getAllDescendants(cy, nodeId) {
    // Use a more efficient approach with Cytoscape's built-in traversal
    const rootNode = cy.getElementById(nodeId);
    
    // Use breadth-first search (bfs) to find all descendants
    const descendants = rootNode.outgoers().nodes();
    
    // Track visited nodes to avoid duplicates in cyclic graphs
    const visited = new Set([nodeId]);
    
    // Process each level of descendants
    let currentLevel = descendants;
    while (currentLevel.length > 0) {
        const nextLevel = cy.collection();
        
        currentLevel.forEach(node => {
            const id = node.id();
            if (!visited.has(id)) {
                visited.add(id);
                const children = node.outgoers().nodes();
                nextLevel.merge(children);
            }
        });
        
        descendants.merge(nextLevel);
        currentLevel = nextLevel;
    }
    
    console.log(`Found ${descendants.length} total descendants for node ${nodeId}`);
    return descendants;
}


/**
 * Get all descendant nodes of a node in a hierarchical cascade format
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the parent node
 * @param {Array<string>} properties - Array of property names to include (default: all properties)
 * @param {Set} visited - Set of visited node IDs (internal use for recursion)
 * @returns {Object} Hierarchical tree structure with specified properties and children arrays
 */
export function getAllDescendantsAsTree(cy, nodeId, properties = [
    'id', 
    'methodName', 
    'className', 
    'time', 
    'percent',
    'sourceCode',
    'visibility',
    'simpleName',
    'qualifiedName',
    'kind',
    'docComment',
    'metaSrc',
    'description',
    'subtreeSummary',
    'subtreeDetailedExplanation',
    'returns',
    'reason',
    'howToUse',
    'howItWorks',
    'assertions',
    'layer',
    'color',
    'label',
    'detailedDescription',
    'isRoot',
    'collapsed'
], visited = new Set()) {
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
    
    // Create node object efficiently
    const nodeObj = { id: nodeId};
    
    // Add selected properties from node data
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') { // Skip ID as we've already added it
            nodeObj[prop] = data[prop] !== undefined ? data[prop] : '';
        }
    }
    nodeObj.children = [];
    
    // Get immediate children as a collection
    const childNodes = node.outgoers().nodes();
    
    // Process children if there are any
    if (childNodes.length > 0) {
        // Process each child
        childNodes.forEach(childNode => {
            const childId = childNode.id();
            const childTree = getAllDescendantsAsTree(cy, childId, properties, visited);
            if (childTree) {
                nodeObj.children.push(childTree);
            }
        });
    }
    
    return nodeObj;
}

/**
 * Get a node and its descendants for summary purposes, stopping at special nodes
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the starting node
 * @param {Array<string>} properties - Array of property names to include (default: all common properties)
 * @param {Set} visited - Set of visited node IDs (internal use for recursion)
 * @returns {Object} Hierarchical tree structure containing the node and its descendants up to special nodes
 */
export function getSubTreeForSummaryAsTree(cy, nodeId, properties = [
    'id', 
    'methodName', 
    'className', 
    'time', 
    'percent',
    'sourceCode',
    'visibility',
    'simpleName',
    'qualifiedName',
    'kind',
    'docComment',
    'metaSrc',
    'description',
    'subtreeSummary',
    'subtreeDetailedExplanation',
    'returns',
    'reason',
    'howToUse',
    'howItWorks',
    'assertions',
    'layer',
    'color',
    'label',
    'detailedDescription',
    'isRoot',
    'collapsed'
], visited = new Set()) {
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

    // if status.recursiveEntryPoint and visited is empty
    if (status.recursiveEntryPoint && visited.size === 0) {
        return getCompressedRecursiveSubTreeAsTree(cy, nodeId, properties);
    }
    

     // Mark this node as visited
     visited.add(nodeId);
    
    // Create node object efficiently
    const nodeObj = { id: nodeId };
    
    // Add selected properties from node data
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') { // Skip ID as we've already added it
            nodeObj[prop] = data[prop] !== undefined ? data[prop] : '';
        }
    }
    nodeObj.children = [];
    
    // Check if current node is a special node (without including status in output)
   
    const isSpecialNode = status.fanOut || 
        status.implementationEntryPoint || 
        status.recursiveEntryPoint;
    
    // Only process children if this is not a special node (or if it's the starting node)
    if (!isSpecialNode || nodeId === visited.values().next().value) { // The second condition checks if this is the starting node
        // Get immediate children as a collection
        const childNodes = node.outgoers().nodes();
        
        // Process children if there are any
        if (childNodes.length > 0) {
            // Process each child
            childNodes.forEach(childNode => {
                const childId = childNode.id();
                const childTree = getSubTreeForSummaryAsTree(cy, childId, properties, visited);
                if (childTree) {
                    nodeObj.children.push(childTree);
                }
            });
        }
    }
    
    return nodeObj;
}

/**
 * Get a compressed version of a recursive subtree, collecting all iterations
 * @param {Object} cy - The Cytoscape instance
 * @param {string} nodeId - The ID of the starting node (recursive entry point)
 * @param {Array<string>} properties - Array of property names to include
 * @returns {Object} Compressed tree structure with only first and last recursive nodes
 *                   The last recursive node will include all its children with their full subtrees
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
    const rootObj = { id: nodeId };
    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        if (prop !== 'id') {
            rootObj[prop] = entryData[prop] !== undefined ? entryData[prop] : '';
        }
    }
    rootObj.children = [];
    
    // Map to track frequency of similar subtrees
    const subtreeFrequency = new Map(); 
    
    // Process the recursive chain to find the last recursive node
    const lastRecursiveNode = findLastRecursiveNode(cy, entryNode, entryLabel);
    
    // If we found the last recursive node, add it as the only child of the root
    if (lastRecursiveNode) {
        // Collect all non-recursive function calls along the way with frequency counting
        collectNonRecursiveNodes(cy, entryNode, entryLabel, [], properties, subtreeFrequency);
        
        // Create object for the last recursive node
        const lastNodeObj = { id: lastRecursiveNode.id() };
        const lastNodeData = lastRecursiveNode.data();
        
        // Add properties
        for (let i = 0; i < properties.length; i++) {
            const prop = properties[i];
            if (prop !== 'id') {
                lastNodeObj[prop] = lastNodeData[prop] !== undefined ? lastNodeData[prop] : '';
            }
        }
        
        // Process children of the last recursive node using getSubTreeForSummaryAsTree
        // This is an important part - we want to preserve all children of the last node
        // even though your example might not have any, we need to handle that case properly
        lastNodeObj.children = [];
        const lastNodeChildren = lastRecursiveNode.outgoers().nodes();
        if (lastNodeChildren.length > 0) {
            lastNodeChildren.forEach(childNode => {
                // For each child of the last recursive node, get its full subtree
                const subtree = getSubTreeForSummaryAsTree(cy, childNode.id(), properties);
                if (subtree) {
                    lastNodeObj.children.push(subtree);
                }
            });
        }
        
        // Add the last node as a child of the root
        rootObj.children.push(lastNodeObj);
        
        // Add all unique subtree patterns to the root's children with frequency count
        Array.from(subtreeFrequency.values()).forEach(entry => {
            const subtree = entry.sampleSubtree;
            // Add frequency property to the subtree
            subtree.frequency = entry.count;
            // Add subtree as a child of the root
            rootObj.children.push(subtree);
        });
        
        // Log the frequency information
        console.log("Frequency of subtree patterns:", Array.from(subtreeFrequency.entries()).map(([key, value]) => ({
            pattern: key,
            count: value.count,
            example: value.examples[0]
        })));
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
 */
function collectNonRecursiveNodes(cy, startNode, recursiveLabel, collectedNodes, properties, 
                                 frequency = new Map(), visited = new Set()) {
    // Check for cycles
    const nodeId = startNode.id();
    if (visited.has(nodeId)) {
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
    
    childNodes.forEach(childNode => {
        const childId = childNode.id();
        const childData = childNode.data();
        const childLabel = childData.label || childData.methodName || childData.id;
        
        // Check if this is a recursive call
        if (childLabel === recursiveLabel) {
            recursiveChild = childNode;
        } else {
            // This is a non-recursive function - collect it
            const subtree = getSubTreeForSummaryAsTree(cy, childId, properties);
            if (subtree) {
                // Add to the collection
                collectedNodes.push(subtree);
                
                // Create a normalized version of the subtree for comparison (remove IDs)
                const subtreePattern = createSubtreePattern(subtree);
                
                // Update frequency map
                if (frequency.has(subtreePattern)) {
                    const entry = frequency.get(subtreePattern);
                    entry.count++;
                    // Don't add more examples, just keep the first one
                } else {
                    frequency.set(subtreePattern, {
                        count: 1,
                        examples: [subtree.id],
                        sampleSubtree: subtree
                    });
                }
            }
        }
    });
    
    // Continue down the recursive chain if found
    if (recursiveChild) {
        collectNonRecursiveNodes(cy, recursiveChild, recursiveLabel, collectedNodes, properties, frequency, visited);
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
        
        // Copy all properties except 'id' and 'children'
        Object.keys(node).forEach(key => {
            if (key !== 'id' && key !== 'children') {
                clone[key] = node[key];
            }
        });
        
        // Process children recursively if they exist
        if (node.children && node.children.length > 0) {
            clone.children = node.children.map(child => cloneWithoutIds(child));
        } else {
            clone.children = [];
        }
        
        return clone;
    }
    
    const patternObj = cloneWithoutIds(subtree);
    
    // Convert to string for comparison, focusing on structure and labels
    return JSON.stringify(patternObj, (key, value) => {
        // Only include certain keys that define the structure and behavior
        if (key === 'label' || key === 'methodName' || key === 'className' || 
            key === 'children' || key === 'description') {
            return value;
        }
        // Skip other properties like time, percent, etc. which may vary
        if (typeof key === 'string' && key !== '') {
            return undefined;
        }
        return value;
    });
}