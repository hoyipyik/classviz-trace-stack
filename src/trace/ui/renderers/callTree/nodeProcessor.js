// ui/renderers/callTree/nodeProcessor.js

/**
 * Process nodes to ensure they have all required properties
 * @param {Array} nodes - The array of node objects
 * @returns {Array} Sanitized nodes with default values where needed
 */
export function sanitizeNodes(nodes) {
    return nodes.map(node => {
        // Create a new node object to avoid mutating the original
        const safeNode = { ...node };
        
        // Ensure data property exists
        safeNode.data = { ...node.data || {} };
        
        const data = safeNode.data;
        
        // Set default values for essential properties
        data.className = data.className || '';
        data.methodName = data.methodName || '';
        
        // Set label if not present
        if (!data.label) {
            data.label = data.className + (data.methodName ? '.' + data.methodName + '()' : '');
        }
        
        // Initialize collapsed state
        if (data.collapsed === undefined) {
            data.collapsed = false;
        }
        
        return safeNode;
    });
}