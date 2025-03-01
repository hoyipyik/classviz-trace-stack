// sidebarHandler.js - Functions for sidebar creation and management
import { addSourceCodeStyles, applySidebarStyles } from '../style/sidebar.style.js';
import { toggleChildren, expandAllDescendants } from './cytoscapeHandler.js';

// Function to display node information in the sidebar
export const displayNodeInfo = (nodeData) => {
    const sidebarContent = document.getElementById('calltree-sidebar-content');

    if (!sidebarContent) {
        console.error('Sidebar content container not found');
        return;
    }

    // Escape HTML special characters to prevent injection
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Helper function to create a property row
    const createPropertyRow = (label, value, isCode = false) => {
        if (value === undefined || value === null || value === '') {
            return ''; // Don't display empty properties
        }

        const valueHtml = isCode
            ? `<pre class="code-block">${escapeHtml(value)}</pre>`
            : `<div class="property-value">${escapeHtml(value)}</div>`;

        return `
            <div class="property-row">
                <div class="property-label">${label}</div>
                ${valueHtml}
            </div>
        `;
    };

    // Update the sidebar header with full class name - allowing line breaks
    const sidebarHeader = document.getElementById('calltree-sidebar-header');
    let headerText = nodeData.methodName
        ? `${escapeHtml(nodeData.className || '')}.${escapeHtml(nodeData.methodName || '')}()`
        : (nodeData.className || 'Node Details');

    // Insert line breaks at logical points if the text is too long
    if (headerText.length > 30) {
        // Add a line break after the class name before the method name
        const lastDotIndex = headerText.lastIndexOf('.');
        if (lastDotIndex > 0) {
            headerText = headerText.substring(0, lastDotIndex + 1) +
                '<br>' +
                headerText.substring(lastDotIndex + 1);
        }
    }

    sidebarHeader.innerHTML = `<div style="overflow-wrap: break-word; word-break: break-word; width: 100%; padding-right: 20px;">${headerText}</div>`;

    // Build sidebar content in the style shown in the image
    let html = '';
    const hasChildren = window.cytrace.getElementById(nodeData.id).outgoers().length > 0;
    // Add control section with buttons for node manipulation
    html += createControlSection(nodeData.id, hasChildren);

    // Show full ID first
    if (nodeData.id) {
        html += `<div class="info-section">
            <div class="section-header">id</div>
            <div class="section-content">${escapeHtml(nodeData.id)}</div>
        </div>`;
    }

    // Class information - moved to its own section with header and content
    if (nodeData.className) {
        let classType = 'class';
        if (nodeData.kind) {
            if (nodeData.kind.includes('abstract')) classType = 'abstract class';
            else if (nodeData.kind.includes('interface')) classType = 'interface';
            else if (nodeData.kind.includes('enum')) classType = 'enum';
        }

        html += `<div class="info-section">
            <div class="section-header">${classType}</div>
            <div class="section-content">${escapeHtml(nodeData.className)}</div>
        </div>`;
    }

    // Basic information sections
    const basicInfo = [
        {
            label: 'qualifiedName',
            value: nodeData.qualifiedName
        },
        {
            label: 'description',
            value: nodeData.description || '(no description)'
        },
        {
            label: 'docComment',
            value: nodeData.docComment
        },
        {
            label: 'layer',
            value: nodeData.layer
        }
    ];

    // Add basic info
    basicInfo.forEach(item => {
        if (item.value) {
            html += `<div class="info-section">
                <div class="section-header">${item.label}</div>
                <div class="section-content">${escapeHtml(item.value)}</div>
            </div>`;
        }
    });

    // Source code section with horizontal scrolling only
    if (nodeData.sourceCode) {
        html += `<div class="info-section">
            <div class="section-header">sourceCode</div>
            <div class="section-content source-code-container">
                <pre class="source-code-pre">${escapeHtml(nodeData.sourceCode)}</pre>
            </div>
        </div>`;
    }

    // Usage section
    if (nodeData.howToUse || nodeData.howItWorks || nodeData.reason) {
        html += `<div class="info-section">
            <div class="section-header">usage</div>
            <div class="section-content">`;

        // Add usage subsections
        if (nodeData.howToUse) {
            html += createPropertyRow('howToUse', nodeData.howToUse);
        }
        if (nodeData.howItWorks) {
            html += createPropertyRow('howItWorks', nodeData.howItWorks);
        }
        if (nodeData.reason) {
            html += createPropertyRow('reason', nodeData.reason);
        }

        html += `</div></div>`;
    }

    // Method details only if available
    if (nodeData.methodName) {
        html += `<div class="info-section">
            <div class="section-header">methods</div>
            <div class="section-content">
                <div class="method-section">
                    <div class="method-header">${escapeHtml(nodeData.methodName)}()</div>`;

        // Method properties
        const methodProps = [
            { label: 'description', value: nodeData.description },
            { label: 'docComment', value: nodeData.docComment },
            { label: 'time', value: nodeData.time ? `${nodeData.time}ms (${nodeData.percent}%)` : null },
            { label: 'visibility', value: nodeData.visibility },
            { label: 'returns', value: nodeData.returns }
        ];

        methodProps.forEach(prop => {
            if (prop.value) {
                html += `<div class="method-property">
                    <div class="property-label">${prop.label}:</div>
                    <div class="property-value">${escapeHtml(prop.value)}</div>
                </div>`;
            }
        });

        html += `</div></div></div>`;
    }

    // Set the HTML content
    sidebarContent.innerHTML = html;

    // Add event listeners to the control buttons
    setupControlButtons(nodeData.id);

    // Adjust source code section height after rendering
    setTimeout(() => {
        const sourceCodeContainers = document.querySelectorAll('.source-code-container');
        sourceCodeContainers.forEach(container => {
            const pre = container.querySelector('pre');
            if (pre) {
                // Allow horizontal scrolling only, maintain original vertical behavior
                container.style.overflowX = 'auto';
                container.style.overflowY = 'visible';
                pre.style.maxHeight = 'none';
                pre.style.overflow = 'visible';
            }
        });
    }, 10);
};

/**
 * Creates a control section with buttons for node manipulation
 * @param {string} nodeId - The ID of the current node
 * @param {boolean} hasChildren - Whether the node has children
 * @returns {string} HTML for the control section
 */
function createControlSection(nodeId, hasChildren) {
    // If node has no children, return empty control section or a message
    if (!hasChildren) {
        return `
        <div class="info-section control-section">
            <div class="section-header">controls</div>
            <div class="section-content">
                <div class="no-children-message">This node has no children</div>
            </div>
        </div>
        <style>
            .control-section {
                margin-bottom: 10px;
            }
            .no-children-message {
                font-size: 12px;
                color: #888;
                font-style: italic;
                padding: 6px 0;
            }
        </style>
        `;
    }

    // If node has children, return buttons
    return `
    <div class="info-section control-section">
        <div class="section-header">controls</div>
        <div class="section-content">
            <div class="control-buttons">
                <button id="toggle-children-btn" class="control-btn primary-btn" data-node-id="${nodeId}">
                    Toggle Children
                </button>
                <button id="expand-all-btn" class="control-btn primary-btn" data-node-id="${nodeId}">
                    Expand All
                </button>
            </div>
            <div class="control-buttons" style="margin-top: 8px;">
                <button id="export-subtree-btn" class="control-btn export-btn" data-node-id="${nodeId}">
                    Export Subtree
                </button>
                <button id="explain-subtree-btn" class="control-btn explain-btn" data-node-id="${nodeId}">
                    Explain Subtree
                </button>
            </div>
        </div>
    </div>
    <style>
        .control-section {
            margin-bottom: 10px;
        }
        .control-buttons {
            display: flex;
            gap: 8px;
        }
        .control-btn {
            padding: 6px 12px;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            flex: 1;
            text-align: center;
            transition: background-color 0.2s;
        }
        .primary-btn {
            background-color: #4682B4;
        }
        .primary-btn:hover {
            background-color: #36648B;
        }
        .primary-btn:active {
            background-color: #2B4F71;
        }
        .export-btn {
            background-color:hsl(143,74%,42%); /* Sea Green */
        }
        .export-btn:hover {
            background-color: hsl(143,74%,39%);
        }
        .export-btn:active {
            background-color:hsl(143,74%,29%);
        }
        .explain-btn {
            background-color: hsl(333, 70%, 50%); /* Pink/Magenta */
        }
        .explain-btn:hover {
            background-color: hsl(333, 70%, 40%); /* Darker */
        }
        .explain-btn:active {
            background-color: hsl(333, 70%, 30%); /* Even darker */
        }
    </style>
    `;
}

/**
 * Sets up event listeners for control buttons
 * @param {string} nodeId - The ID of the current node
 */
function setupControlButtons(nodeId) {
    // Get the buttons
    const toggleBtn = document.getElementById('toggle-children-btn');
    const expandAllBtn = document.getElementById('expand-all-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            // Get current Cytoscape instance
            const cy = window.cytrace; // Assuming the Cytoscape instance is stored in window.cytrace
            if (cy) {
                toggleChildren(cy, nodeId);
            } else {
                console.error('Cytoscape instance not found');
            }
        });
    }

    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', () => {
            // Get current Cytoscape instance
            const cy = window.cytrace; // Assuming the Cytoscape instance is stored in window.cytrace
            if (cy) {
                expandAllDescendants(cy, nodeId);
            } else {
                console.error('Cytoscape instance not found');
            }
        });
    }
}

let sidebarVisible = false;
/**
 * Functions to toggle sidebar visibility
 * @param {Object} cy - The Cytoscape instance (optional)
 * @returns {Object} Object with show and hide functions
 */
export function toggleSidebar() {
    //show sidebar function
    const showSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        if (!sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.className = 'sidebar-visible';
            sidebarVisible = true;
            // console.log('Showing sidebar', sidebarVisible);
        }
    };

    // hide sidebar function
    const hideSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        // console.log(sidebarVisible, sidebar);
        if (sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(100%)';
            sidebar.className = 'sidebar-hidden';
            sidebarVisible = false;
            // console.log('Hiding sidebar', sidebarVisible);
        }
    };

    return { showSidebar, hideSidebar };
}

/**
 * Create the sidebar element with all its components
 * @returns {HTMLElement} The sidebar container element
 */
export function createSidebar() {
    // Create and save the sidebar controller object
    const sidebarController = toggleSidebar();

    // Create the main sidebar container
    const sidebar = document.createElement('div');
    sidebar.id = 'calltree-sidebar';
    sidebar.className = 'sidebar-hidden';

    // Apply styles to the sidebar element
    applySidebarStyles(sidebar);

    // Create and add the close button
    const closeButton = createCloseButton();
    sidebar.appendChild(closeButton);

    // Create and add the header
    const sidebarHeader = createSidebarHeader();
    sidebar.appendChild(sidebarHeader);

    // Create and add the content container
    const sidebarContent = document.createElement('div');
    sidebarContent.id = 'calltree-sidebar-content';
    sidebarContent.style.padding = '0';
    sidebarContent.innerHTML = '<div style="padding: 10px;">Select a node to view details</div>';
    sidebar.appendChild(sidebarContent);

    // Add event listener to the close button
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebarController.hideSidebar();
    });

    // Add styles for source code display
    addSourceCodeStyles();
    return sidebar;
}


/**
 * Create the close button for the sidebar
 * @returns {HTMLElement} The close button
 */
function createCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.id = 'calltree-sidebar-close';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';

    Object.assign(closeButton.style, {
        position: 'absolute',
        top: '8px',  // Adjusted position
        right: '8px', // Adjusted position
        zIndex: '101',
        padding: '2px 6px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: '#666',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '3px'
    });

    // Add hover effect
    closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = '#e0e0e0';
    };
    closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = 'transparent';
    };

    return closeButton;
}

/**
 * Create the header for the sidebar
 * @returns {HTMLElement} The sidebar header
 */
function createSidebarHeader() {
    const sidebarHeader = document.createElement('div');
    sidebarHeader.id = 'calltree-sidebar-header';

    Object.assign(sidebarHeader.style, {
        backgroundColor: '#e6e6e6',
        padding: '10px',
        borderBottom: '1px solid #ccc',
        fontWeight: 'bold',
        paddingRight: '30px', // Add padding to the right to make room for the close button
        position: 'relative', // Ensure positioning context for header contents
        minHeight: '24px' // Ensure minimum height for header even when empty
    });

    sidebarHeader.innerHTML = '<div style="overflow-wrap: break-word; word-break: break-word; width: 100%;">Node Details</div>';
    return sidebarHeader;
}

