// ui/renderers/callTree/layoutContainers.js

/**
 * Create the main layout containers for the call tree
 * @returns {Object} The created container elements
 */
export function createLayoutContainers() {
    // Create main layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.id = 'calltree-layout';
    
    // Apply styles using Object.assign for better performance
    Object.assign(layoutContainer.style, {
        width: '100%',
        height: '800px',
        position: 'relative',
        overflow: 'hidden'
    });
    
    // Create Cytoscape container
    const cyContainer = document.createElement('div');
    cyContainer.id = 'cy-container';
    
    Object.assign(cyContainer.style, {
        width: '100%',
        height: '100%',
        transition: 'margin-right 0.3s ease'
    });
    
    layoutContainer.appendChild(cyContainer);
    
    return { layoutContainer, cyContainer };
}