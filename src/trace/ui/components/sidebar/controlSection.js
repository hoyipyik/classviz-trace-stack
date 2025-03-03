// sidebar/controlSection.js - Functions for control section creation and handling

import { expandAllDescendants, toggleChildren } from "../cytoscape/nodeVisibility.js";
import { exportSubTree } from "../cytoscape/subTreeExport.js";

// Common styles extracted to avoid duplication
const CONTROL_STYLES = `
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
            background-color: hsl(143,74%,42%);
        }
        .export-btn:hover {
            background-color: hsl(143,74%,39%);
        }
        .export-btn:active {
            background-color: hsl(143,74%,29%);
        }
        .explain-btn {
            background-color: hsl(333, 70%, 50%);
        }
        .explain-btn:hover {
            background-color: hsl(333, 70%, 40%);
        }
        .explain-btn:active {
            background-color: hsl(333, 70%, 30%);
        }
        .no-children-message {
            font-size: 12px;
            color: #888;
            font-style: italic;
            padding: 6px 0;
        }
    </style>
`;

/**
 * Creates a control section with buttons for node manipulation
 * @param {string} nodeId - The ID of the current node
 * @param {boolean} hasChildren - Whether the node has children
 * @returns {string} HTML for the control section
 */
export function createControlSection(nodeId, hasChildren) {
    return `
    <div class="info-section control-section">
        <div class="section-header">controls</div>
        <div class="section-content">
            ${hasChildren ? createControlButtons(nodeId) : '<div class="no-children-message">This node has no children</div>'}
        </div>
    </div>
    ${CONTROL_STYLES}
    `;
}

/**
 * Creates the control buttons HTML
 * @param {string} nodeId - The ID of the current node
 * @returns {string} HTML for the control buttons
 */
function createControlButtons(nodeId) {
    return `
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
    `;
}

/**
 * Sets up event listeners for control buttons
 * @param {string} nodeId - The ID of the current node
 */
export function setupControlButtons(nodeId) {
    // Define button handlers
    const buttonHandlers = [
        {
            id: 'toggle-children-btn',
            handler: () => executeCytoscapeAction(nodeId, toggleChildren)
        },
        {
            id: 'expand-all-btn',
            handler: () => executeCytoscapeAction(nodeId, expandAllDescendants)
        },
        {
            id: 'export-subtree-btn',
            handler: () => executeCytoscapeAction(nodeId, exportSubTree)
        },
        {
            id: 'explain-subtree-btn',
            handler: () => console.log('Explain subtree action for node:', nodeId)
        }
    ];

    // Attach event listeners to all buttons that exist
    buttonHandlers.forEach(({ id, handler }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    });
}

/**
 * Executes a Cytoscape action with error handling
 * @param {string} nodeId - The ID of the current node
 * @param {Function} action - The action function to execute
 */
function executeCytoscapeAction(nodeId, action) {
    const cy = window.cytrace;
    if (!cy) {
        console.error('Cytoscape instance not found');
        return;
    }
    action(cy, nodeId);
}