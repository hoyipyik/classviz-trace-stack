import { explainSubTree } from "../../../utils/ai/aiService.js";
import { escapeHtml } from "../sidebar/utils.js";
import { getAllDescendantsAsTree, getSubTreeForSummaryAsTree } from "./nodeTraversal.js";

/**
 * Collects data from a subtree in the graph
 * @param {Object} cy - Cytoscape instance
 * @param {string} nodeId - ID of the root node
 * @returns {Object} - The collected subtree data
 */
export const collectSubtreeData = (cy, nodeId) => {
  const properties = ["label", "description"];
  // return getAllDescendantsAsTree(cy, nodeId, properties);
  return getSubTreeForSummaryAsTree(cy, nodeId, properties);
};

/**
 * Updates a node with explanation data
 * @param {Object} node - Cytoscape node to update
 * @param {Object} explanationData - Data containing the explanation
 * @returns {boolean} - Whether the update was successful
 */
export const updateNodeWithExplanation = (node, { briefSummary, detailedBehaviour, flowRepresentation } = {}) => {
  if (!node) return false;

  // Use optional chaining and nullish coalescing for cleaner property updates
  briefSummary && node.data('briefSummary', briefSummary);
  detailedBehaviour && node.data('detailedBehavior', detailedBehaviour);
  flowRepresentation && node.data('flowRepresentation', flowRepresentation);
  
  return true;
};

/**
 * Updates the UI elements with explanation data
 * @param {Object} explanationData - Data containing the explanation
 * @returns {boolean} - Whether the update was successful
 */
export const updateExplanationUI = ({ briefSummary, detailedBehaviour, flowRepresentation } = {}) => {
  // Get DOM elements directly each time
  const briefSummaryElement = document.getElementById('briefSummary-container-value');
  const detailedBehaviourElement = document.getElementById('detailedBehaviour-container-value');
  const flowRepresentationElement = document.getElementById('flowRepresentation-container-value');
  
  // Update UI elements with the explanation data
  if (briefSummary && briefSummaryElement) {
    briefSummaryElement.innerHTML = escapeHtml(briefSummary);
  }
  
  if (detailedBehaviour && detailedBehaviourElement) {
    detailedBehaviourElement.innerHTML = escapeHtml(detailedBehaviour);
  }
  
  if (flowRepresentation && flowRepresentationElement) {
    flowRepresentationElement.innerHTML = escapeHtml(flowRepresentation);
  }
  
  return true;
};

/**
 * Toggle loading indicator visibility
 * @param {boolean} isVisible - Whether to show or hide the loading indicator
 */
const toggleLoading = (isVisible) => {
  const loadingContainer = document.getElementById('explain-loading-container');
  
  if (loadingContainer) {
    loadingContainer.style.display = isVisible ? 'block' : 'none';
  }
};

/**
 * Main function to explain a subtree starting from a specific node
 * @param {Object} cy - Cytoscape instance
 * @param {string} nodeId - ID of the root node
 * @returns {Promise<Object|null>} - The explanation response or null if error
 */
export const explainSubTreeFromEnterPoint = async (cy, nodeId) => {
  if (!cy || !nodeId) {
    console.error('Missing required parameters: cy or nodeId');
    return null;
  }
  
  toggleLoading(true);
  
  try {
    // Step 1: Collect the subtree data
    const subTreeData = collectSubtreeData(cy, nodeId);
    
    // Step 2: Get the explanation from the AI service
    const response = await explainSubTree(subTreeData);
    
    if (!response) {
      throw new Error('No explanation data received from AI service');
    }
    
    // Step 3: Update the node with the explanation data
    const rootNode = cy.getElementById(nodeId);
    updateNodeWithExplanation(rootNode, response);
    
    // Step 4: Render UI
    updateExplanationUI(response);
    
    return response;
  } catch (error) {
    console.error('Error explaining subtree:', error.message);
    return null;
  } finally {
    toggleLoading(false);
  }
};