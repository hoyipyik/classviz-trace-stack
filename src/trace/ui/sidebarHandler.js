// sidebarHandler.js - Functions for sidebar creation and management
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

    sidebarHeader.innerHTML = `<div style="overflow-wrap: break-word; word-break: break-word;">${headerText}</div>`;

    // Build sidebar content in the style shown in the image
    let html = '';

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

    // Source code section with dynamic height
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

    // Adjust source code section height after rendering
    setTimeout(() => {
        const sourceCodeContainers = document.querySelectorAll('.source-code-container');
        sourceCodeContainers.forEach(container => {
            const pre = container.querySelector('pre');
            if (pre) {
                // Set container height based on content
                container.style.height = 'auto';
                pre.style.maxHeight = 'none';
            }
        });
    }, 10);
};

let sidebarVisible = false;
/**
 * Functions to toggle sidebar visibility
 * @param {Object} cy - The Cytoscape instance (optional)
 * @returns {Object} Object with show and hide functions
 */
export function toggleSidebar() {
    // 函数显示侧边栏
    const showSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        if (!sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.className = 'sidebar-visible';
            sidebarVisible = true;
            console.log('Showing sidebar', sidebarVisible);
        }
    };

    // 函数隐藏侧边栏
    const hideSidebar = () => {
        const sidebar = document.getElementById('calltree-sidebar');
        console.log(sidebarVisible, sidebar);
        if (sidebarVisible && sidebar) {
            sidebar.style.transform = 'translateX(100%)';
            sidebar.className = 'sidebar-hidden';
            sidebarVisible = false;
            console.log('Hiding sidebar', sidebarVisible);
        }
    };

    return { showSidebar, hideSidebar };
}

// sidebarHandler.js - Functions for sidebar creation and management
/**
 * Create the sidebar element with all its components
 * @returns {HTMLElement} The sidebar container element
 */
// 修改后的createSidebar函数
export function createSidebar() {
    // 先创建并保存sidebar controller对象
    const sidebarController = toggleSidebar();
    
    // 创建主侧边栏容器
    const sidebar = document.createElement('div');
    sidebar.id = 'calltree-sidebar';
    sidebar.className = 'sidebar-hidden';

    // 设置侧边栏样式
    applySidebarStyles(sidebar);

    // 创建并添加关闭按钮
    const closeButton = createCloseButton();
    sidebar.appendChild(closeButton);

    // 创建并添加头部
    const sidebarHeader = createSidebarHeader();
    sidebar.appendChild(sidebarHeader);

    // 创建并添加内容容器
    const sidebarContent = document.createElement('div');
    sidebarContent.id = 'calltree-sidebar-content';
    sidebarContent.style.padding = '0';
    sidebarContent.innerHTML = '<div style="padding: 10px;">Select a node to view details</div>';
    sidebar.appendChild(sidebarContent);

    // 设置关闭按钮事件监听器 - 使用已创建的controller
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebarController.hideSidebar();
    });

    return sidebar;
}

/**
 * Apply styles to the sidebar element
 * @param {HTMLElement} sidebar - The sidebar element
 */
function applySidebarStyles(sidebar) {
    Object.assign(sidebar.style, {
        width: '270px',
        minWidth: '270px',
        height: '100%',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderLeft: '1px solid #ccc',
        padding: '0',
        overflowY: 'auto',
        transition: 'transform 0.3s ease',
        position: 'absolute',
        right: '0',
        top: '0',
        zIndex: '100',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
        transform: 'translateX(100%)'
    });
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
        top: '5px',
        right: '5px',
        zIndex: '101',
        padding: '2px 6px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        color: '#666'
    });

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
        fontWeight: 'bold'
    });

    sidebarHeader.innerHTML = '<div>Node Details</div>';
    return sidebarHeader;
}
