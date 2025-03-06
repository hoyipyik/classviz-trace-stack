// sidebar/controlSection.js - Functions for control section creation and handling

import { expandAllDescendants, toggleChildren } from "../cytoscape/nodeVisibility.js";
import { explainSubTreeFromEnterPoint } from "../cytoscape/subTreeExplain.js";
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
        
        /* Loading bar styles */
        .loading-container {
            margin-top: 8px;
            display: none; /* Initially hidden */
        }
        .loading-text {
            font-size: 12px;
            color: #555;
            margin-bottom: 4px;
        }
        .loading-bar {
            height: 4px;
            width: 100%;
            background-color: #f0f0f0;
            border-radius: 2px;
            overflow: hidden;
            position: relative;
        }
        .loading-progress {
            position: absolute;
            height: 100%;
            width: 100%;
            background-color: hsl(333, 70%, 50%);
            animation: loading-animation 1.5s infinite ease-in-out;
            transform-origin: 0% 50%;
        }
        @keyframes loading-animation {
            0% {
                transform: translateX(-100%);
            }
            50% {
                transform: translateX(0%);
            }
            100% {
                transform: translateX(100%);
            }
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
        <div id="explain-loading-container" class="loading-container">
            <div class="loading-text">Explaining subtree...</div>
            <div class="loading-bar">
                <div class="loading-progress"></div>
            </div>
        </div>
    `;
}

/**
 * Sets up event listeners for control buttons
 * @param {string} nodeId - The ID of the current node
 */
export function setupControlButtons(nodeId) {
    // Define button handlers with async functions
    const buttonHandlers = [
        {
            id: 'toggle-children-btn',
            handler: async () => await executeCytoscapeAction(nodeId, toggleChildren)
        },
        {
            id: 'expand-all-btn',
            handler: async () => await executeCytoscapeAction(nodeId, expandAllDescendants)
        },
        {
            id: 'export-subtree-btn',
            handler: async () => await executeCytoscapeAction(nodeId, exportSubTree)
        },
        {
            id: 'explain-subtree-btn',
            handler: async () => await executeCytoscapeAction(nodeId, explainSubTreeFromEnterPoint)
        }
    ];

    // Attach event listeners to all buttons that exist
    buttonHandlers.forEach(({ id, handler }) => {
        const button = document.getElementById(id);
        if (button) {
            // Remove any existing event listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the async event listener
            newButton.addEventListener('click', async (event) => {
                try {
                    // Disable button during execution to prevent multiple clicks
                    newButton.disabled = true;
                    
                    // Execute the async handler
                    await handler();
                } catch (error) {
                    console.error(`Error in button handler for ${id}:`, error);
                } finally {
                    // Re-enable button after execution
                    newButton.disabled = false;
                }
            });
        }
    });
}

/**
 * Executes a Cytoscape action with error handling
 * @param {string} nodeId - The ID of the current node
 * @param {Function} action - The action function to execute
 * @returns {Promise<any>} - Result of the action
 */
async function executeCytoscapeAction(nodeId, action) {
    const cy = window.cytrace;
    if (!cy) {
        console.error('Cytoscape instance not found');
        return null;
    }
    
    try {
        // Properly await the action's result
        const result = await action(cy, nodeId);
        return result;
    } catch (error) {
        console.error(`Error executing Cytoscape action:`, error);
        throw error; // Re-throw to allow proper handling in the caller
    }
}