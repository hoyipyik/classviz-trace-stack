import { displayNodeInfo } from "./sidebarHandler.js";

export const callTreeRender = (graph) => {
    const callTreeElement = document.getElementById('calltree');

    // Clear any existing content
    while (callTreeElement.firstChild) {
        callTreeElement.removeChild(callTreeElement.firstChild);
    }

    // Create a container for the layout
    const layoutContainer = document.createElement('div');
    layoutContainer.id = 'calltree-layout';
    layoutContainer.style.width = '100%';
    layoutContainer.style.height = '800px';
    layoutContainer.style.position = 'relative';
    layoutContainer.style.overflow = 'hidden';
    callTreeElement.appendChild(layoutContainer);

    // Create a container for Cytoscape
    const cyContainer = document.createElement('div');
    cyContainer.id = 'cy-container';
    cyContainer.style.width = '100%';
    cyContainer.style.height = '100%';
    cyContainer.style.transition = 'margin-right 0.3s ease';
    layoutContainer.appendChild(cyContainer);

    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'calltree-sidebar';
    sidebar.className = 'sidebar-hidden';
    sidebar.style.width = '270px';
    sidebar.style.minWidth = '270px';
    sidebar.style.height = '100%';
    sidebar.style.backgroundColor = '#f5f5f5';
    sidebar.style.border = '1px solid #ddd';
    sidebar.style.borderLeft = '1px solid #ccc';
    sidebar.style.padding = '0';
    sidebar.style.overflowY = 'auto';
    sidebar.style.transition = 'transform 0.3s ease';
    sidebar.style.position = 'absolute';
    sidebar.style.right = '0';
    sidebar.style.top = '0';
    sidebar.style.zIndex = '100';
    sidebar.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';
    sidebar.style.transform = 'translateX(100%)';
    layoutContainer.appendChild(sidebar);

    // Create close button for sidebar
    const closeButton = document.createElement('button');
    closeButton.id = 'calltree-sidebar-close';
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.zIndex = '101';
    closeButton.style.padding = '2px 6px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '16px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666';
    sidebar.appendChild(closeButton);

    // Create header for sidebar
    const sidebarHeader = document.createElement('div');
    sidebarHeader.id = 'calltree-sidebar-header';
    sidebarHeader.style.backgroundColor = '#e6e6e6';
    sidebarHeader.style.padding = '10px';
    sidebarHeader.style.borderBottom = '1px solid #ccc';
    sidebarHeader.style.fontWeight = 'bold';
    sidebarHeader.innerHTML = '<div>Node Details</div>';
    sidebar.appendChild(sidebarHeader);

    // Create content container for sidebar
    const sidebarContent = document.createElement('div');
    sidebarContent.id = 'calltree-sidebar-content';
    sidebarContent.style.padding = '0';
    sidebar.appendChild(sidebarContent);

    // Add initial content to sidebar
    sidebarContent.innerHTML = '<div style="padding: 10px;">Select a node to view details</div>';

    // Initialize sidebar state
    let sidebarVisible = false;

    // Function to show sidebar
    const showSidebar = () => {
        if (!sidebarVisible) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.className = 'sidebar-visible';
            sidebarVisible = true;

            // Resize the graph to account for sidebar
            if (cy) {
                cyContainer.style.marginRight = '270px';
                setTimeout(() => cy.resize(), 300); // Wait for transition to complete
            }
        }
    };

    // Function to hide sidebar
    const hideSidebar = () => {
        if (sidebarVisible) {
            sidebar.style.transform = 'translateX(100%)';
            sidebar.className = 'sidebar-hidden';
            sidebarVisible = false;

            // Resize the graph to full width
            if (cy) {
                cyContainer.style.marginRight = '0';
                setTimeout(() => cy.resize(), 300); // Wait for transition to complete
            }
        }
    };

    // Close button event listener
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        hideSidebar();
    });

    // Close sidebar when clicking on canvas (but not on nodes)
    cyContainer.addEventListener('click', (e) => {
        // Only close if click was on the background
        if (e.target === cyContainer) {
            hideSidebar();
        }
    });

    let cy;

    try {
        // Ensure all nodes have required properties to prevent null errors
        const safeNodes = graph.nodes.map(node => {
            // Ensure node.data exists and has valid properties
            if (!node.data) {
                node.data = {};
            }

            // Provide default values for essential properties
            if (!node.data.className) node.data.className = 'UnknownClass';
            if (!node.data.methodName) node.data.methodName = 'unknownMethod';
            if (!node.data.label) {
                node.data.label = node.data.className +
                    (node.data.methodName ? '.' + node.data.methodName + '()' : '');
            }

            return node;
        });

        // Initialize Cytoscape with safe nodes and edges
        cy = cytoscape({
            container: cyContainer,
            elements: [...safeNodes, ...graph.edges],
            style: graph.style,
            // layout: {
            //     name: 'cola',
            //     directed: true,
            //     padding: 30,
            //     spacingFactor: 1.5,
            //     roots: ['root'],
            //     animate: true,
            //     animationDuration: 300,
            // }
            layout: {
                name: 'preset' // Use the pre-calculated positions
            }
        });

        // Add interaction handlers
        cy.on('tap', 'node', function (evt) {
            const node = evt.target;
            console.log('Tapped node:', node.id(), node.data());

            // Display node details in the sidebar
            displayNodeInfo(node.data());

            // Show sidebar
            showSidebar();

            // Prevent event from bubbling to canvas
            evt.originalEvent.stopPropagation();
        });

        // Add background click handler to hide sidebar
        cy.on('tap', function (evt) {
            if (evt.target === cy) {
                hideSidebar();
            }
        });

        // Fit the view to see all elements
        cy.fit();

        // 獲取節點的所有子節點
        function getChildNodes(nodeId) {
            const node = cy.getElementById(nodeId);
            return node.outgoers().targets();
        }

        // 獲取節點的所有後代節點（包括子節點的子節點等）
        function getAllDescendants(nodeId) {
            const descendants = [];
            const seen = new Set();

            function collectDescendants(id) {
                if (seen.has(id)) return;
                seen.add(id);

                const children = getChildNodes(id);
                children.forEach(child => {
                    descendants.push(child);
                    collectDescendants(child.id());
                });
            }

            collectDescendants(nodeId);
            return descendants;
        }

        // 切換子節點顯示/隱藏

        // 修改 toggleChildren 函數，使用節點的 data.collapsed 屬性
        function toggleChildren(nodeId) {
            // 獲取節點
            const node = cy.getElementById(nodeId);

            // 切換折疊狀態
            const collapsed = !node.data('collapsed');

            // 更新節點的 collapsed 數據
            cy.getElementById(nodeId).data('collapsed', collapsed);

            // 獲取所有後代節點
            const descendants = getAllDescendants(nodeId);

            if (collapsed) {
                // 折疊：隱藏所有後代
                descendants.forEach(descendant => {
                    descendant.addClass('hidden');
                    // 同時隱藏連到這些節點的邊
                    descendant.connectedEdges().addClass('hidden');

                    // 在小型導航圖中也隱藏
                    minimapCy.getElementById(descendant.id()).addClass('hidden');
                    minimapCy.getElementById(descendant.id()).connectedEdges().addClass('hidden');

                    // 將所有子節點的折疊狀態設為展開，這樣當父節點展開時，子節點就會正確顯示
                    descendant.data('collapsed', true);
                });
            } else {
                // 展開：顯示直接子節點（一層）
                const directChildren = getChildNodes(nodeId);
                directChildren.forEach(child => {
                    child.removeClass('hidden');
                    // 顯示連接這些節點的邊
                    cy.getElementById(nodeId).edgesTo(child).removeClass('hidden');

                    // 在小型導航圖中也顯示
                    minimapCy.getElementById(child.id()).removeClass('hidden');
                    minimapCy.getElementById(nodeId).edgesTo(minimapCy.getElementById(child.id())).removeClass('hidden');
                });
            }

            // 重新運行佈局
            cy.layout({
                name: 'breadthfirst',
                directed: true,
                padding: 30,
                spacingFactor: 1.5,
                roots: ['root'],
                animate: true,
                animationDuration: 300
            }).run();

            // 小型導航圖也需要重新佈局
            minimapCy.layout({
                name: 'breadthfirst',
                directed: true,
                padding: 10,
                spacingFactor: 1.2,
                roots: ['root']
            }).run();

            // 更新側邊欄和視口
            if (selectedNodeId) {
                updateSidebar(selectedNodeId);
            }
            updateViewport();
        }

        // 修改 expandAllDescendants 函數，使用節點的 data.collapsed 屬性
        function expandAllDescendants(nodeId) {
            // 獲取節點
            const node = cy.getElementById(nodeId);

            // 將當前節點的折疊狀態設置為非折疊
            node.data('collapsed', false);

            // 獲取所有後代節點
            const descendants = getAllDescendants(nodeId);

            // 顯示所有後代節點
            descendants.forEach(descendant => {
                descendant.removeClass('hidden');
                // 同時顯示連到這些節點的邊
                descendant.connectedEdges().removeClass('hidden');

                // 在小型導航圖中也顯示
                minimapCy.getElementById(descendant.id()).removeClass('hidden');
                minimapCy.getElementById(descendant.id()).connectedEdges().removeClass('hidden');

                // 將所有子節點的折疊狀態設為非折疊
                descendant.data('collapsed', false);
            });

            // 重新運行佈局以保持樹的美觀
            cy.layout({
                name: 'breadthfirst',
                directed: true,
                padding: 30,
                spacingFactor: 1.5,
                roots: ['root'],
                animate: true,
                animationDuration: 300
            }).run();

            // 小型導航圖也需要重新佈局
            minimapCy.layout({
                name: 'breadthfirst',
                directed: true,
                padding: 10,
                spacingFactor: 1.2,
                roots: ['root']
            }).run();

            // 更新側邊欄和視口
            if (selectedNodeId) {
                updateSidebar(selectedNodeId);
            }
            updateViewport();
        }


    } catch (error) {
        console.error('Error rendering call tree:', error);
        callTreeElement.innerHTML = `
            <div class="error-message">
                <h3>Error rendering call tree</h3>
                <p>${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    }
};
