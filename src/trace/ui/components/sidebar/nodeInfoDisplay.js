// sidebar/nodeInfoDisplay.js - Functions for displaying node information
import { escapeHtml, createPropertyRow, formatHeaderText } from './utils.js';
import { createControlSection, setupControlButtons } from './controlSection.js';

/**
 * Display node information in the sidebar
 * @param {Object} nodeData - Data for the node to display
 */
export const displayNodeInfo = (nodeData) => {
    const sidebarContent = document.getElementById('calltree-sidebar-content');
    const sidebarHeader = document.getElementById('calltree-sidebar-header');

    if (!sidebarContent || !sidebarHeader) {
        console.error('Sidebar elements not found');
        return;
    }

    // Update the sidebar header with formatted class name
    const headerText = nodeData.methodName
        ? `${escapeHtml(nodeData.className || '')}.${escapeHtml(nodeData.methodName || '')}()`
        : (nodeData.className || 'Node Details');

    sidebarHeader.innerHTML = `<div style="overflow-wrap: break-word; word-break: break-word; width: 100%; padding-right: 20px;">${formatHeaderText(headerText)}</div>`;

    // Build sidebar content
    const hasChildren = window.cytrace.getElementById(nodeData.id).outgoers().length > 0;
    
    // Construct HTML using template literals and function composition
    const contentSections = [
        createIdSection(nodeData),
        createControlSection(nodeData.id, hasChildren),
        createClassInfoSection(nodeData),
        createBasicInfoSections(nodeData),
        createSubtreeExplanationSection(nodeData),
        createSourceCodeSection(nodeData),
        createUsageSection(nodeData),
        createMethodDetailsSection(nodeData)
    ].join('');
    
    // Set the HTML content
    sidebarContent.innerHTML = contentSections;

    // Add event listeners to the control buttons
    setupControlButtons(nodeData.id);

    // Use requestAnimationFrame for better performance than setTimeout
    requestAnimationFrame(adjustSourceCodeContainers);
};

/**
 * Creates the ID section
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for ID section
 */
function createIdSection(nodeData) {
    if (!nodeData.id) return '';
    
    return `<div class="info-section">
        <div class="section-header">id</div>
        <div class="section-content">${escapeHtml(nodeData.id)}</div>
    </div>`;
}

/**
 * Creates the class information section
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for class info section
 */
function createClassInfoSection(nodeData) {
    if (!nodeData.className) return '';
    
    let classType = 'class';
    if (nodeData.kind) {
        if (nodeData.kind.includes('abstract')) classType = 'abstract class';
        else if (nodeData.kind.includes('interface')) classType = 'interface';
        else if (nodeData.kind.includes('enum')) classType = 'enum';
    }

    return `<div class="info-section">
        <div class="section-header">${classType}</div>
        <div class="section-content">${escapeHtml(nodeData.className)}</div>
    </div>`;
}

/**
 * Creates the subtree explanation section
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for subtree explanation section
 */
function createSubtreeExplanationSection(nodeData) {
    // Only generate this section if the node has children
    const hasChildren = window.cytrace.getElementById(nodeData.id).outgoers().length > 0;
    if (!hasChildren) return '';
    
    // Default values or extract from nodeData if available
    const detailedBehaviour = nodeData.subtreeExplanation?.detailedBehaviour || '';
    const flowRepresentation = nodeData.subtreeExplanation?.flowRepresentation || '';
    const briefSummary = nodeData.subtreeExplanation?.briefSummary || '';

    return `<div class="info-section" id="subtree-explanation-container">
        <div class="section-header">subtree explanation</div>
        <div class="section-content">
            ${createPropertyRow('briefSummary', briefSummary || 'No summary available', false, 'briefSummary-container')}
            ${createPropertyRow('detailedBehaviour', detailedBehaviour || 'No detailed behavior available', false, 'detailedBehaviour-container')}
            ${createPropertyRow('flowRepresentation', flowRepresentation || 'No flow representation available', false, 'flowRepresentation-container')}
        </div>
    </div>`;
}

/**
 * Creates the basic information sections
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for basic info sections
 */
function createBasicInfoSections(nodeData) {
    // Define basic information fields to display
    const basicInfo = [
        { label: 'qualifiedName', value: nodeData.qualifiedName },
        { label: 'description', value: nodeData.description || '(no description)' },
        { label: 'docComment', value: nodeData.docComment },
        { label: 'layer', value: nodeData.layer }
    ];

    // Filter out undefined values and map to HTML
    return basicInfo
        .filter(item => item.value)
        .map(item => `<div class="info-section">
            <div class="section-header">${item.label}</div>
            <div class="section-content">${escapeHtml(item.value)}</div>
        </div>`)
        .join('');
}

/**
 * Creates the source code section if source code exists
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for source code section
 */
function createSourceCodeSection(nodeData) {
    if (!nodeData.sourceCode) return '';
    
    return `<div class="info-section">
        <div class="section-header">sourceCode</div>
        <div class="section-content source-code-container">
            <pre class="source-code-pre">${escapeHtml(nodeData.sourceCode)}</pre>
        </div>
    </div>`;
}

/**
 * Creates the usage section if usage data exists
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for usage section
 */
function createUsageSection(nodeData) {
    const { howToUse, howItWorks, reason } = nodeData;
    
    if (!howToUse && !howItWorks && !reason) return '';
    
    const usageContent = [
        howToUse && createPropertyRow('howToUse', howToUse),
        howItWorks && createPropertyRow('howItWorks', howItWorks),
        reason && createPropertyRow('reason', reason)
    ].filter(Boolean).join('');

    return `<div class="info-section">
        <div class="section-header">usage</div>
        <div class="section-content">${usageContent}</div>
    </div>`;
}

/**
 * Creates the method details section if method data exists
 * @param {Object} nodeData - Node data
 * @returns {string} HTML for method details section
 */
function createMethodDetailsSection(nodeData) {
    if (!nodeData.methodName) return '';
    
    // Method properties with their labels and values
    const methodProps = [
        { label: 'description', value: nodeData.description },
        { label: 'docComment', value: nodeData.docComment },
        { label: 'time', value: nodeData.time ? `${nodeData.time}ms (${nodeData.percent}%)` : null },
        { label: 'visibility', value: nodeData.visibility },
        { label: 'returns', value: nodeData.returns }
    ];

    const methodPropsHtml = methodProps
        .filter(prop => prop.value)
        .map(prop => `<div class="method-property">
            <div class="property-label">${prop.label}:</div>
            <div class="property-value">${escapeHtml(prop.value)}</div>
        </div>`)
        .join('');

    return `<div class="info-section">
        <div class="section-header">methods</div>
        <div class="section-content">
            <div class="method-section">
                <div class="method-header">${escapeHtml(nodeData.methodName)}()</div>
                ${methodPropsHtml}
            </div>
        </div>
    </div>`;
}

/**
 * Adjusts source code containers for proper display
 */
function adjustSourceCodeContainers() {
    document.querySelectorAll('.source-code-container').forEach(container => {
        const pre = container.querySelector('pre');
        if (pre) {
            // Optimize for better display
            container.style.overflowX = 'auto';
            container.style.overflowY = 'visible';
            pre.style.maxHeight = 'none';
            pre.style.overflow = 'visible';
        }
    });
}