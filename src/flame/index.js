/**
 * Flame Graph Module
 * A collection of functions for managing the flame graph visualization with a draggable container
 */

export const loadFlameGraphPlugin = () => {

    // Global state variables
    let selectionModeEnabled = false;
    let selectedNodes = [];
    let isDragging = false;
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    let startTop = 0;
    let flameGraph = null;

    console.log("Flame Graph Plugin Loaded");

    /**
     * Maps method call data to flame graph compatible format
     * @param {Object} methodNode - The method call data node
     * @param {boolean} useTimeTotals - Whether to use total time (true) or self time (false) for node values
     * @return {Object} A flame graph compatible data structure
     */
    function mapMethodDataToFlameGraph(methodNode, useTimeTotals = true) {
        if (!methodNode) return null;

        // Create the basic node structure
        const node = {
            name: methodNode.label || `${methodNode.className}.${methodNode.methodName}()`,
            // Ensure a minimum value of 1 to make all methods visible
            value: Math.max(parseInt(useTimeTotals ? methodNode.time : methodNode.selfTime) || 1, 1),
            // Track if node is selected
            selected: false
        };

        // Add children if any
        if (methodNode.children && methodNode.children.length > 0) {
            node.children = methodNode.children.map(child => mapMethodDataToFlameGraph(child, useTimeTotals));
        }

        // Copy all properties from methodNode to the transformed node for metadata
        Object.keys(methodNode).forEach(key => {
            // Skip 'children' as it's already processed, and don't overwrite existing properties
            if (key !== 'children' && !(key in node)) {
                node[key] = methodNode[key];
            }
        });

        // Ensure key timing properties are correctly formatted as integers
        if (methodNode.time) node.totalTime = parseInt(methodNode.time);
        if (methodNode.selfTime) node.selfTime = parseInt(methodNode.selfTime);

        return node;
    }

    /**
     * Function to darken a color
     * @param {string} color - The color to darken
     * @return {string} The darkened color
     */
    function darkenColor(color) {
        // Parse the color to RGB
        let r, g, b;
        if (color.startsWith('#')) {
            // Handle hex color
            const hex = color.substring(1);
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (color.startsWith('rgb')) {
            // Handle rgb color
            const rgbValues = color.match(/\d+/g);
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        } else {
            // For other color formats, return the original color
            return color;
        }

        // Darken the color (multiply by 0.7 to make it 30% darker)
        r = Math.floor(r * 0.7);
        g = Math.floor(g * 0.7);
        b = Math.floor(b * 0.7);

        // Return as RGB format
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Get the color for a node
     * @param {Object} nodeData - The node data
     * @return {string} The color
     */
    function getNodeColor(nodeData) {
        // Use the node's own color if provided
        if (nodeData.color) {
            return nodeData.color;
        }

        // Otherwise use the default coloring scheme
        return d3.scaleOrdinal(d3.schemeCategory10)(nodeData.name);
    }

    /**
     * Create the flame graph instance with configuration
     * @return {Object} The flame graph instance
     */
    function createFlameGraph() {
        return d3.flamegraph()
            .width(document.getElementById('chart').clientWidth - 30)
            .cellHeight(18)
            .transitionDuration(750)
            .minFrameSize(1)
            .transitionEase(d3.easeCubic)
            .sort(true)
            .title("")
            .onClick(function (d) {
                // Log the entire node data to console when clicked
                console.info("Clicked on:", d.data);

                // Get all rectangles in the chart
                const allRects = d3.select("#chart").selectAll("rect");

                // Find and select the rect for the current data
                let clickedRect = null;
                allRects.each(function (nodeData) {
                    if (nodeData === d) {
                        clickedRect = this;
                    }
                });

                if (selectionModeEnabled) {
                    // Handle selection mode logic
                    if (d.data.selected) {
                        // Node is already selected, so deselect it
                        d.data.selected = false;
                        removeNodeFromSelection(d.data);

                        // Reset appearance
                        if (clickedRect) {
                            const nodeColor = getNodeColor(d.data);
                            d3.select(clickedRect).style("fill", nodeColor).style("fill-opacity", "0.4");
                        }
                    } else {
                        // Node is not selected, so select it
                        d.data.selected = true;
                        addNodeToSelection(d.data);

                        // Highlight appearance
                        if (clickedRect) {
                            const nodeColor = getNodeColor(d.data);
                            const darkerColor = darkenColor(nodeColor);
                            d3.select(clickedRect).style("fill", darkerColor).style("fill-opacity", "1");
                        }
                    }
                } else {
                    // When selection mode is disabled, just update details
                    // without changing the visual appearance of any nodes
                }

                // Update the details element with formatted information
                updateDetailsElement(d.data);
            })
            .differential(false)
            .selfValue(false)
            .color(function (d) {
                return getNodeColor(d.data);
            });
    }

    /**
     * Toggle selection mode
     */
    function toggleSelectionMode() {
        selectionModeEnabled = !selectionModeEnabled;

        // Update button appearance
        const button = document.getElementById('selection-btn');
        if (button) {
            button.textContent = selectionModeEnabled ? 'Disable Selection' : 'Enable Selection';
            button.classList.toggle('active', selectionModeEnabled);
        }

        // Update selection count display
        updateSelectionCountDisplay();

        console.log(`Selection mode ${selectionModeEnabled ? 'enabled' : 'disabled'}`);
        console.log(`Currently selected nodes: ${selectedNodes.length}`);
    }

    /**
     * Update the selection count display
     */
    function updateSelectionCountDisplay() {
        const countDisplay = document.getElementById('selection-count');
        if (countDisplay) {
            countDisplay.textContent = `${selectedNodes.length} node(s) selected`;
        }
    }

    /**
     * Check if a node is in the selected list
     * @param {Object} nodeData - The node data
     * @return {boolean} True if selected
     */
    function isNodeSelected(nodeData) {
        return selectedNodes.some(n => n.name === nodeData.name);
    }

    /**
     * Add a node to the selected list
     * @param {Object} nodeData - The node data to add
     */
    function addNodeToSelection(nodeData) {
        // Create a clean copy of the node data to store
        const nodeCopy = {
            name: nodeData.name,
            totalTime: nodeData.totalTime,
            selfTime: nodeData.selfTime,
            package: nodeData.package,
            layer: nodeData.layer,
            visibility: nodeData.visibility
        };

        // Only add if not already in the list
        if (!isNodeSelected(nodeData)) {
            selectedNodes.push(nodeCopy);
            updateSelectionCountDisplay();
            console.log('Node added to selection:', nodeCopy.name);
            console.log('Current selection:', selectedNodes);
        }
    }

    /**
     * Remove a node from the selected list
     * @param {Object} nodeData - The node data to remove
     */
    function removeNodeFromSelection(nodeData) {
        const initialLength = selectedNodes.length;
        selectedNodes = selectedNodes.filter(n => n.name !== nodeData.name);

        if (initialLength !== selectedNodes.length) {
            updateSelectionCountDisplay();
            console.log('Node removed from selection:', nodeData.name);
            console.log('Current selection:', selectedNodes);
        }
    }

    /**
     * Clear all selected nodes
     */
    function clearSelection() {
        // Reset all node appearance
        const allRects = d3.select("#chart").selectAll("rect");
        allRects.each(function (nodeData) {
            if (nodeData && nodeData.data) {
                nodeData.data.selected = false;
                const nodeColor = getNodeColor(nodeData.data);
                d3.select(this).style("fill", nodeColor).style("fill-opacity", "0.4");
            }
        });

        selectedNodes = [];
        updateSelectionCountDisplay();
        console.log('Selection cleared');
    }

    /**
     * Format and display node details in the details element
     * @param {Object} nodeData - The node data
     */
    function updateDetailsElement(nodeData) {
        const details = document.getElementById("details");
        // const resizeHandle = document.getElementById('resize-handle');

        if (!details) return;

        // 確保詳情面板始終是固定高度
        if (!details.classList.contains('expanded')) {
            details.classList.add('expanded');
            // details.style.height = '300px'; // 固定 300px 高度
            details.style.padding = '10px';
            // resizeHandle.style.bottom = '300px'; // 調整 resize-handle 的位置
        }

        // 創建格式化的 HTML 內容
        let content = `
        <h4>${nodeData.name}</h4>
        <div class="details-content">
          <table>
            <tbody>
      `;

        // 添加所有節點屬性到表格
        const excludedProperties = ['children', 'name', 'value', 'selected'];

        Object.keys(nodeData).sort().forEach(key => {
            if (!excludedProperties.includes(key) && nodeData[key] !== undefined && nodeData[key] !== null) {
                // 格式化屬性名稱以便顯示
                const formattedKey = key.replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase());

                let value = nodeData[key];

                // 如果值是物件或陣列，格式化它
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }

                // 特殊處理源碼顯示
                if (key === 'sourceCode') {
                    value = `<pre><code>${value}</code></pre>`;
                }

                content += `
            <tr>
              <th>${formattedKey}</th>
              <td>${value}</td>
            </tr>
          `;
            }
        });

        // 顯示選擇狀態
        content += `
          <tr>
            <th>Selection Status</th>
            <td>${isNodeSelected(nodeData) ? 'Selected' : 'Not Selected'}</td>
          </tr>
      `;

        content += `
          </tbody>
        </table>
        </div>
      `;

        // 設置 HTML 內容
        details.innerHTML = content;
    }

    /**
     * Load data and render the flame graph
     */
    function loadAndRenderData() {
        // Try to load the file, and show an error message if it fails
        d3.json("stacks.json", function (error, data) {
            if (error) {
                console.warn("Failed to load stacks.json:", error);

                // Show a placeholder or error message in the chart
                const chartElement = document.getElementById('chart');
                if (chartElement) {
                    chartElement.innerHTML = `
                        <div style="padding: 20px; text-align: center; color: #666;">
                            <h3>Flame Graph Data Not Available</h3>
                            <p>The stacks.json file could not be loaded. Please make sure it exists and is properly formatted.</p>
                            <p>Error: ${error.message || 'Unknown error'}</p>
                        </div>
                    `;
                }
                return;
            }

            // Transform the data
            const transformedData = mapMethodDataToFlameGraph(data, true);

            // Render the flame graph with the transformed data
            d3.select("#chart")
                .datum(transformedData)
                .call(flameGraph);

            // After rendering, apply opacity to all nodes
            // Use a setTimeout to ensure that all rectangles are rendered
            setTimeout(function () {
                d3.selectAll("#chart rect").style("fill-opacity", "0.4");
            }, 100);

            // After rendering, ensure container can show the entire graph
            adjustContainerHeight();
        });
    }

    /**
     * Adjust the container height to ensure all methods are visible
     */
    function adjustContainerHeight() {
        // Get the SVG element created by d3-flamegraph
        const flamegraphSvg = d3.select("#chart svg");
        if (!flamegraphSvg.empty()) {
            // Get the actual height needed
            const actualHeight = flamegraphSvg.node().getBBox().height;
            // Add some padding
            const adjustedHeight = actualHeight + 20;

            // Set the height to ensure all content is visible
            flamegraphSvg.attr("height", adjustedHeight);
        }
    }

    /**
     * Search for a term in the flame graph
     */
    // function searchFlameGraph() {
    //     var term = document.getElementById("term").value;
    //     if (flameGraph) {
    //         flameGraph.search(term);
    //     }
    // }

    /**
     * Clear the search term and results
     */
    // function clearSearch() {
    //     document.getElementById('term').value = '';
    //     if (flameGraph) {
    //         flameGraph.clear();
    //     }
    // }

    /**
     * Reset zoom level to default
     */
    function resetZoom() {
        if (flameGraph) {
            flameGraph.resetZoom();
            // After resetting zoom, adjust container height again
            setTimeout(adjustContainerHeight, 800);
        }
    }

    /**
     * Set up event handlers for UI elements
     */
    function setupEventHandlers() {
        // Search button
        // const searchBtn = document.getElementById('search-btn');
        // if (searchBtn) {
        //     searchBtn.addEventListener('click', searchFlameGraph);
        // }

        // Clear button
        // const clearBtn = document.getElementById('clear-btn');
        // if (clearBtn) {
        //     clearBtn.addEventListener('click', clearSearch);
        // }

        // Reset zoom button
        const resetZoomBtn = document.getElementById('reset-zoom-btn');
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', resetZoom);
        }

        // Selection mode button
        const selectionBtn = document.getElementById('selection-btn');
        if (selectionBtn) {
            selectionBtn.addEventListener('click', toggleSelectionMode);
        }

        // Clear selection button
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', clearSelection);
        }

        // Search form submit
        // const term = document.getElementById('term');
        // if (term) {
        //     term.addEventListener('keypress', function (event) {
        //         if (event.key === 'Enter') {
        //             event.preventDefault();
        //             searchFlameGraph();
        //         }
        //     });
        // }

        // Set up container dragging
        setupDraggableContainer();

        // Set up details panel resizing
        setupResizeHandler();

        // Handle window resize
        window.addEventListener('resize', function () {
            if (flameGraph && document.getElementById('chart')) {
                // Adjust the flame graph width
                flameGraph.width(document.getElementById('chart').clientWidth - 20);

                // Rerender the flame graph
                d3.select("#chart").call(flameGraph);

                // After rendering, ensure container can show the entire graph
                setTimeout(adjustContainerHeight, 100);
            }
        });
    }

    /**
     * Set up draggable container with optimized drag handling
     */
    function setupDraggableContainer() {
        const container = document.getElementById('flame-container');
        const dragHandle = document.getElementById('drag-handle');
    
        if (!container || !dragHandle) {
            console.warn("Could not find flame container or drag handle");
            return;
        }
    
        // Make sure the container is initially visible with only the drag handle showing
        container.style.display = 'flex';
        
        // Add a state indicator element
        const stateIndicator = document.createElement('div');
        stateIndicator.className = 'flame-state-indicator';
        stateIndicator.textContent = 'Minimized';
        container.appendChild(stateIndicator);
        
        // Container states: minimized, scrollable, expanded
        let containerState = 'minimized';
        
        // Add a toggle button for scrollable mode
        const toggleScrollBtn = document.createElement('button');
        toggleScrollBtn.id = 'toggle-scroll-btn';
        toggleScrollBtn.className = 'control-btn toggle-scroll';
        toggleScrollBtn.textContent = 'Enable Scrolling';
        
        // Find the controls container and add the button
        const controls = document.getElementById('controls');
        if (controls) {
            // Insert the toggle button as the first child
            controls.insertBefore(toggleScrollBtn, controls.firstChild);
            
            // Add click event handler
            toggleScrollBtn.addEventListener('click', toggleScrollableMode);
        }
        
        /**
         * Toggle between minimized and scrollable modes
         */
        function toggleScrollableMode() {
            if (containerState === 'minimized') {
                // Switch to scrollable mode
                container.classList.add('scrollable');
                container.classList.remove('active');
                containerState = 'scrollable';
                stateIndicator.textContent = 'Scrollable';
                toggleScrollBtn.textContent = 'Disable Scrolling';
                toggleScrollBtn.classList.add('active');
            } else if (containerState === 'scrollable') {
                // Switch back to minimized mode
                container.classList.remove('scrollable');
                container.classList.remove('active');
                containerState = 'minimized';
                stateIndicator.textContent = 'Minimized';
                toggleScrollBtn.textContent = 'Enable Scrolling';
                toggleScrollBtn.classList.remove('active');
                // Reset scroll position
                container.scrollTop = 0;
            } else if (containerState === 'expanded') {
                // Switch from expanded to scrollable
                container.classList.add('scrollable');
                container.classList.remove('active');
                containerState = 'scrollable';
                stateIndicator.textContent = 'Scrollable';
                toggleScrollBtn.textContent = 'Disable Scrolling';
                toggleScrollBtn.classList.add('active');
            }
        }
        
        // Handle double-click on drag handle to toggle between all three states
        dragHandle.addEventListener('dblclick', function(e) {
            e.preventDefault();
            
            if (containerState === 'minimized') {
                // Switch to expanded
                container.classList.add('active');
                container.classList.remove('scrollable');
                containerState = 'expanded';
                stateIndicator.textContent = 'Expanded';
                toggleScrollBtn.textContent = 'Enable Scrolling';
                toggleScrollBtn.classList.remove('active');
            } else if (containerState === 'scrollable') {
                // Switch to expanded
                container.classList.add('active');
                container.classList.remove('scrollable');
                containerState = 'expanded';
                stateIndicator.textContent = 'Expanded';
                toggleScrollBtn.textContent = 'Enable Scrolling';
                toggleScrollBtn.classList.remove('active');
            } else if (containerState === 'expanded') {
                // Switch to minimized
                container.classList.remove('active');
                container.classList.remove('scrollable');
                containerState = 'minimized';
                stateIndicator.textContent = 'Minimized';
                toggleScrollBtn.textContent = 'Enable Scrolling';
                toggleScrollBtn.classList.remove('active');
                // Reset scroll position
                container.scrollTop = 0;
            }
        });
        
        // Variables for drag functionality
        let isDragging = false;
        let startY = 0;
        let startHeight = 0;
        
        // Use passive event listeners for better touch performance
        dragHandle.addEventListener('mousedown', function(e) {
            e.preventDefault(); // Prevent text selection during drag
            
            // Skip if it's a double-click (handled by dblclick event)
            if (e.detail > 1) return;
            
            isDragging = true;
            startY = e.clientY;
            startHeight = container.offsetHeight;
            
            // Disable transitions during drag for smoother feel
            container.style.transition = 'none';
            
            function handleDragMove(ev) {
                if (!isDragging) return;
                
                const deltaY = startY - ev.clientY;
                let newHeight = startHeight + deltaY;
                
                // Constrain height within reasonable limits
                const minHeight = 10; // Just the drag handle
                const maxHeight = window.innerHeight - 36; // Full height minus top navbar
                
                newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
                
                // Update height
                container.style.height = newHeight + 'px';
                
                // Update state based on current height
                if (newHeight <= 50) {
                    // Visual state only - don't change containerState during drag
                    if (!container.classList.contains('scrollable')) {
                        stateIndicator.textContent = 'Minimized (dragging)';
                    }
                } else if (newHeight >= maxHeight - 100) {
                    stateIndicator.textContent = 'Expanded (dragging)';
                } else {
                    stateIndicator.textContent = 'Scrollable (dragging)';
                }
            }
            
            function handleDragEnd(ev) {
                isDragging = false;
                
                // Re-enable transitions
                container.style.transition = '';
                
                // Determine final state based on height
                const currentHeight = container.offsetHeight;
                const maxHeight = window.innerHeight - 36;
                
                // Use thresholds to determine state
                if (currentHeight <= 50) {
                    // Minimize
                    container.style.height = '10px';
                    container.classList.remove('active', 'scrollable');
                    containerState = 'minimized';
                    stateIndicator.textContent = 'Minimized';
                    toggleScrollBtn.textContent = 'Enable Scrolling';
                    toggleScrollBtn.classList.remove('active');
                    // Reset scroll position
                    container.scrollTop = 0;
                } else if (currentHeight >= maxHeight - 100) {
                    // Expand
                    container.classList.add('active');
                    container.classList.remove('scrollable');
                    containerState = 'expanded';
                    stateIndicator.textContent = 'Expanded';
                    toggleScrollBtn.textContent = 'Enable Scrolling';
                    toggleScrollBtn.classList.remove('active');
                } else {
                    // Scrollable
                    container.classList.add('scrollable');
                    container.classList.remove('active');
                    containerState = 'scrollable';
                    stateIndicator.textContent = 'Scrollable';
                    toggleScrollBtn.textContent = 'Disable Scrolling';
                    toggleScrollBtn.classList.add('active');
                }
                
                // Clean up
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
            }
            
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
        });
        
        // Handle mouse wheel over drag handle when in minimized state
        dragHandle.addEventListener('wheel', function(e) {
            if (containerState === 'minimized') {
                // If minimized, scroll wheel expands to scrollable
                e.preventDefault();
                toggleScrollableMode();
            }
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Alt+F to toggle flame graph states
            if (e.altKey && e.key === 'f') {
                e.preventDefault();
                
                if (containerState === 'minimized') {
                    // Minimized -> Scrollable
                    toggleScrollableMode();
                } else if (containerState === 'scrollable') {
                    // Scrollable -> Expanded
                    container.classList.add('active');
                    container.classList.remove('scrollable');
                    containerState = 'expanded';
                    stateIndicator.textContent = 'Expanded';
                    toggleScrollBtn.textContent = 'Enable Scrolling';
                    toggleScrollBtn.classList.remove('active');
                } else if (containerState === 'expanded') {
                    // Expanded -> Minimized
                    container.classList.remove('active');
                    container.classList.remove('scrollable');
                    containerState = 'minimized';
                    stateIndicator.textContent = 'Minimized';
                    toggleScrollBtn.textContent = 'Enable Scrolling';
                    toggleScrollBtn.classList.remove('active');
                    // Reset scroll position
                    container.scrollTop = 0;
                }
            }
        });
    }

    /**
 * Make sure the drag handle is visible and functional when scrolling
 */
    function enhanceScrollBehavior() {
        const container = document.getElementById('flame-container');
        const chart = document.getElementById('chart');

        if (container && chart) {
            // When scrolling in the container, update the state of sticky elements
            container.addEventListener('scroll', function () {
                // You could add animation effects or visual indicators for scrolling if desired
                if (container.scrollTop > 0) {
                    container.classList.add('scrolled');
                } else {
                    container.classList.remove('scrolled');
                }
            }, { passive: true });

            // Make sure chart contents are fully visible
            chart.addEventListener('mouseenter', function () {
                if (!container.classList.contains('active')) {
                    // Slightly increase our visibility when hovering over the chart
                    // This helps with interacting with the flame graph in collapsed mode
                    chart.style.pointerEvents = 'auto';
                }
            });

            chart.addEventListener('mouseleave', function () {
                if (!container.classList.contains('active')) {
                    chart.style.pointerEvents = '';
                }
            });
        }
    }

    /**
     * Check if the flame graph container exists, create it if not
     */
    function ensureFlameGraphContainer() {
        let container = document.getElementById('flame-container');

        if (!container) {
            console.log("Creating flame graph container");

            // Create the container structure
            container = document.createElement('div');
            container.id = 'flame-container';
            container.className = 'flame-container';

            // Create drag handle
            const dragHandle = document.createElement('div');
            dragHandle.id = 'drag-handle';
            dragHandle.className = 'drag-handle';

            const dragIndicator = document.createElement('div');
            dragIndicator.className = 'drag-indicator';
            dragHandle.appendChild(dragIndicator);

            // Create controls area
            const controls = document.createElement('div');
            controls.id = 'controls';
            controls.className = 'controls';

            // Add controls content
            controls.innerHTML = `
                <input type="text" id="term" class="search-box" placeholder="Search...">
                <button class="control-btn" id="search-btn">Search</button>
                <button class="control-btn" id="clear-btn">Clear</button>
                <button class="control-btn" id="reset-zoom-btn">Reset Zoom</button>
                <button class="control-btn" id="selection-btn">Enable Selection</button>
                <button class="control-btn" id="clear-selection-btn">Clear Selection</button>
                <span id="selection-count">0 node(s) selected</span>
            `;

            // Create content area
            const content = document.createElement('div');
            content.className = 'content';

            // Create chart area
            const chart = document.createElement('div');
            chart.id = 'chart';

            // Create resize handle
            // const resizeHandle = document.createElement('div');
            // resizeHandle.id = 'resize-handle';
            // resizeHandle.className = 'resize-handle';

            // Create details area
            const details = document.createElement('div');
            details.id = 'details';

            // Assemble the structure
            content.appendChild(chart);
            content.appendChild(resizeHandle);
            content.appendChild(details);

            container.appendChild(dragHandle);
            container.appendChild(controls);
            container.appendChild(content);

            // Add to the document
            document.body.appendChild(container);

            return true; // Container was created
        }

        return false; // Container already existed
    }

    /**
     * Initialize everything
     */
    function initFlameGraph() {
        console.log("Initializing Flame Graph");
    
        // Create or ensure the container exists
        const containerCreated = ensureFlameGraphContainer();
        
        if (containerCreated) {
            console.log("Flame graph container created");
        }
    
        // Create the flame graph
        flameGraph = createFlameGraph();
    
        // Load and render data
        loadAndRenderData();
    
        // Set up event handlers with the new height-based approach
        setupEventHandlers();
        
        // Adjust chart on window resize
        window.addEventListener('resize', function() {
            // If the container is in expanded mode, adjust its height
            const container = document.getElementById('flame-container');
            if (container && container.classList.contains('active')) {
                container.style.height = (window.innerHeight - 36) + 'px';
            }
            
            // Adjust flame graph width if needed
            if (flameGraph && document.getElementById('chart')) {
                flameGraph.width(document.getElementById('chart').clientWidth - 20);
                d3.select("#chart").call(flameGraph);
            }
        });
        
        console.log("Flame Graph initialized with height-based behavior");
    }
    // Initialize when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", initFlameGraph);
    } else {
        // Document already loaded, run immediately
        initFlameGraph();
    }
}