// legend.js - Creates and manages the Cytoscape graph legend

import { PACKAGE_COLORS } from "../../../utils/process/constants.js";

/**
 * Creates a legend for the Cytoscape graph
 * @param {Object} cy - The Cytoscape instance
 * @param {string} parentContainerId - ID of the parent container element for the legend
 * @param {string} position - Position of the legend ('top-left', 'top-right', 'bottom-left', 'bottom-right')
 * @returns {HTMLElement|null} - The legend container element or null if parent not found
 */
export function createLegend(cy, parentContainerId, position = 'top-left') {
    const parentContainer = document.getElementById(parentContainerId);
    if (!parentContainer) {
        console.error(`Parent container with id "${parentContainerId}" not found`);
        return null;
    }

    // Set parent container to relative positioning if static
    if (window.getComputedStyle(parentContainer).position === 'static') {
        parentContainer.style.position = 'relative';
    }

    // Create or clear legend container
    let legendContainer = parentContainer.querySelector('.cytoscape-legend-container');
    if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.className = 'cytoscape-legend-container';
        legendContainer.style.cssText = 'position: absolute; z-index: 10; display: none;';
        parentContainer.appendChild(legendContainer);
    } else {
        legendContainer.innerHTML = '';
    }

    // Create and style the legend element
    const legendEl = createStyledElement('div', {
        className: 'cytoscape-legend',
        cssText: `
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            max-width: 250px;
            font-size: 14px;
            position: relative;
            top: 4px;
            left: 2px;
        `
    });

    // Add header with pin functionality
    const [header, pinButton] = createLegendHeader(legendEl);
    
    // Create a state object to be shared across functions
    const state = { isPinned: false };

    // Create legend sections
    createLayerSection(legendEl);
    createNodeTypeSection(legendEl);
    
    // Add the legend to the container
    legendContainer.appendChild(legendEl);

    // Position the legend
    positionLegend(parentContainerId, position);

    // Create and add the indicator bar
    const indicatorBar = createIndicatorBar(parentContainer);
    
    // Set up event listeners
    setupEventListeners(legendContainer, indicatorBar, pinButton, state);

    // Method to toggle pin state
    legendContainer.togglePin = (pinned) => {
        state.isPinned = pinned !== undefined ? pinned : !state.isPinned;
        pinButton.style.color = state.isPinned ? '#e53e3e' : '#888';
        pinButton.title = state.isPinned ? 'Unpin legend' : 'Pin legend';

        if (state.isPinned) {
            legendContainer.style.display = 'block';
            indicatorBar.style.backgroundColor = 'rgba(229, 62, 62, 0.7)';
        } else {
            indicatorBar.style.backgroundColor = 'rgba(45, 55, 72, 0.85)';
        }

        return state.isPinned;
    };

    return legendContainer;
}

/**
 * Creates a styled DOM element
 * @param {string} tag - The HTML tag name
 * @param {Object} options - Element options (className, cssText, textContent)
 * @returns {HTMLElement} - The created element
 */
function createStyledElement(tag, options = {}) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.cssText) element.style.cssText = options.cssText;
    if (options.textContent) element.textContent = options.textContent;
    return element;
}

/**
 * Creates the legend header with title and pin button
 * @param {HTMLElement} legendEl - The legend container element
 * @returns {Array} - Array containing [headerElement, pinButtonElement]
 */
function createLegendHeader(legendEl) {
    const header = createStyledElement('div', {
        cssText: `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
        `
    });

    const title = createStyledElement('div', {
        textContent: 'Legend',
        cssText: 'font-weight: bold; font-size: 16px;'
    });

    const pinButton = createStyledElement('button', {
        cssText: `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            padding: 0;
            color: #888;
            transition: color 0.2s;
        `
    });
    pinButton.innerHTML = '📌';
    pinButton.title = 'Pin legend';

    header.appendChild(title);
    header.appendChild(pinButton);
    legendEl.appendChild(header);

    return [header, pinButton];
}

/**
 * Creates the layer/package color section of the legend
 * @param {HTMLElement} legendEl - The legend container element
 */
function createLayerSection(legendEl) {
    // Create section heading
    const sectionTitle = createStyledElement('div', {
        textContent: 'Node Colors',
        cssText: 'font-weight: bold; margin: 10px 0 5px 0;'
    });
    legendEl.appendChild(sectionTitle);

    // Create color items
    PACKAGE_COLORS.forEach((color, label) => {
        if (label === 'ROOT') return; // Skip ROOT as it will be in node types

        const item = createStyledElement('div', {
            cssText: 'display: flex; align-items: center; margin-bottom: 6px;'
        });

        const colorSwatch = createStyledElement('div', {
            cssText: `
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background-color: ${color};
                margin-right: 8px;
                border: 1px solid #333;
            `
        });

        const labelEl = createStyledElement('span', { textContent: label });

        item.appendChild(colorSwatch);
        item.appendChild(labelEl);
        legendEl.appendChild(item);
    });
}

/**
 * Creates the node type section of the legend
 * @param {HTMLElement} legendEl - The legend container element
 */
function createNodeTypeSection(legendEl) {
    const nodeSize = 16; // Size of node icons in the legend

    // Create section heading
    const sectionTitle = createStyledElement('div', {
        textContent: 'Node Types',
        cssText: 'font-weight: bold; margin: 15px 0 5px 0;'
    });
    legendEl.appendChild(sectionTitle);

    // Define node types for the legend
    const nodeTypes = [
        {
            label: 'Normal Node',
            style: `background-color: #A0AEC0; width: ${nodeSize}px; height: ${nodeSize}px; border: 1px solid #333; border-radius: 50%;`
        },
        {
            label: 'Fan Out Node',
            style: `background-color: #A0AEC0; width: ${nodeSize * 1.25}px; height: ${nodeSize * 1.25}px; border: 2px solid #000; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);`
        },
        {
            label: 'Recursive Entry Point',
            style: `background-color: #A0AEC0; width: ${nodeSize * 1.25}px; height: ${nodeSize * 1.25}px; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);`
        },
        {
            label: 'Implementation Entry Point',
            style: `background-color: #A0AEC0; width: ${nodeSize * 1.25}px; height: ${nodeSize * 1.25}px; border: 4px solid #000; border-radius: 50%;`
        },
        {
            label: 'Selected Node',
            style: `background-color: #A0AEC0; width: ${nodeSize}px; height: ${nodeSize}px; border: 4px solid #FFC107; border-radius: 50%;`
        }
    ];

    // Create node type items
    nodeTypes.forEach(type => {
        const item = createStyledElement('div', {
            cssText: 'display: flex; align-items: center; margin-bottom: 6px;'
        });

        const nodeIcon = createStyledElement('div', {
            cssText: `${type.style} margin-right: 8px; display: inline-block;`
        });

        const labelEl = createStyledElement('span', { textContent: type.label });

        item.appendChild(nodeIcon);
        item.appendChild(labelEl);
        legendEl.appendChild(item);
    });
}

/**
 * Creates the indicator bar for toggling the legend
 * @param {HTMLElement} parentContainer - The parent container element
 * @returns {HTMLElement} - The indicator bar element
 */
function createIndicatorBar(parentContainer) {
    const indicatorBar = createStyledElement('button', {
        className: 'legend-indicator',
        textContent: 'Legend',
        cssText: `
            position: absolute;
            top: 250px;
            left: 0;
            width: 24px;
            height: auto;
            padding: 12px 1px;
            background-color: rgba(45, 55, 72, 0.85);
            color: white;
            border: none;
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
            cursor: pointer;
            z-index: 9;
            transition: all 0.3s ease;
            writing-mode: vertical-lr;
            text-orientation: upright;
            font-size: 9px;
            letter-spacing: 2px;
            text-transform: uppercase;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
            font-weight: 500;
        `
    });
    
    parentContainer.appendChild(indicatorBar);
    return indicatorBar;
}

/**
 * Sets up event listeners for the legend components
 * @param {HTMLElement} legendContainer - The legend container element
 * @param {HTMLElement} indicatorBar - The indicator bar element
 * @param {HTMLElement} pinButton - The pin button element
 * @param {Object} state - State object containing isPinned property
 */
function setupEventListeners(legendContainer, indicatorBar, pinButton, state) {
    // Add pin functionality
    pinButton.addEventListener('click', () => {
        legendContainer.togglePin();
    });

    // Add hover effect to indicator
    indicatorBar.addEventListener('mouseenter', () => {
        indicatorBar.style.width = '28px';
        indicatorBar.style.backgroundColor = 'rgba(66, 153, 225, 0.95)';
        legendContainer.style.display = 'block';
    });

    indicatorBar.addEventListener('mouseleave', () => {
        indicatorBar.style.width = '24px';
        indicatorBar.style.backgroundColor = 'rgba(45, 55, 72, 0.85)';

        // Don't hide the legend yet as the mouse might have moved to it
        if (!state.isPinned && !legendContainer.matches(':hover')) {
            legendContainer.style.display = 'none';
        }
    });

    legendContainer.addEventListener('mouseleave', () => {
        if (!state.isPinned) {
            legendContainer.style.display = 'none';
            indicatorBar.style.width = '24px'; // Changed from 30px for consistency
            indicatorBar.style.backgroundColor = 'rgba(45, 55, 72, 0.85)'; // Changed for consistency
        }
    });
}

/**
 * Position the legend at a specific location in the graph
 * @param {string} parentContainerId - ID of the parent container element for the legend
 * @param {string} position - Position of the legend ('top-left', 'top-right', 'bottom-left', 'bottom-right')
 */
export function positionLegend(parentContainerId, position = 'top-right') {
    const parentContainer = document.getElementById(parentContainerId);
    if (!parentContainer) return;

    const legendContainer = parentContainer.querySelector('.cytoscape-legend-container');
    if (!legendContainer) return;

    // Set positioning based on specified location
    const positions = {
        'top-left': { top: '10px', left: '10px', bottom: 'auto', right: 'auto' },
        'top-right': { top: '10px', right: '10px', bottom: 'auto', left: 'auto' },
        'bottom-left': { bottom: '10px', left: '10px', top: 'auto', right: 'auto' },
        'bottom-right': { bottom: '10px', right: '10px', top: 'auto', left: 'auto' }
    };
    
    // Apply position styles
    const posStyle = positions[position] || positions['top-right'];
    Object.assign(legendContainer.style, posStyle);
}

/**
 * Toggle legend visibility
 * @param {string} parentContainerId - ID of the parent container element
 * @param {boolean} visible - Whether the legend should be visible
 * @param {boolean} pinned - Whether to pin the legend in the visible state
 */
/**
 * Toggle legend visibility and pinned state
 * @param {string} parentContainerId - ID of the parent container element
 * @param {boolean} visible - Whether the legend should be visible
 * @param {boolean} pinned - Whether to pin the legend in the visible state
 * @returns {boolean|undefined} - The current pinned state or undefined if legend not found
 */
export function toggleLegend(parentContainerId, visible = true, pinned = false) {
    const parentContainer = document.getElementById(parentContainerId);
    if (!parentContainer) return;

    const legendContainer = parentContainer.querySelector('.cytoscape-legend-container');
    if (legendContainer) {
        legendContainer.style.display = visible ? 'block' : 'none';
        if (legendContainer.togglePin) {
            return legendContainer.togglePin(pinned);
        }
    }
}