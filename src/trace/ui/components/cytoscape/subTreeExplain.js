import { explainSubTree } from "../../../utils/ai/aiService.js";
import { addEssentialMethods } from "../../../utils/traceNodeOnClassviz/addEssentialMethods.js";
import { escapeHtml } from "../sidebar/utils.js";
import { getAllDescendantsAsTree, getSubTreeForSummaryAsTree } from "./nodeTraversal.js";
import { extractWholeSpecialNodesTree } from "./specialNodeManager.js";

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
 * Updates the Call Tree UI elements with explanation data
 * @param {Object} explanationData - Data containing the explanation
 * @returns {boolean} - Whether the update was successful
 */
export const updateExplanationCallTreeUI = ({ briefSummary, detailedBehaviour, flowRepresentation } = {}) => {
  try {
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
  } catch (error) {
    console.error('Error updating Call Tree UI:', error.message);
    return false;
  }
};

/**
 * Updates the Classviz UI elements with explanation data
 * @param {Object} explanationData - Data containing the explanation
 * @returns {boolean} - Whether the update was successful
 */
export const updateExplanationClassvizUI = ({ briefSummary, detailedBehaviour, flowRepresentation } = {}) => {
  // Get DOM elements directly each time
  try {
    const briefSummaryElement = document.getElementById('briefSummary-classvizContainer-value');
    const detailedBehaviourElement = document.getElementById('detailedBehavior-classvizContainer-value');
    const flowRepresentationElement = document.getElementById('flowRepresentation-classvizContainer-value');

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
  } catch (error) {
    console.error('Error updating Classviz UI:', error.message);
    return false;
  };
};

/**
 * Toggle loading indicator visibility
 * @param {boolean} isVisible - Whether to show or hide the loading indicator
 */
const toggleLoading = (isVisible, onClassviz = false) => {
  const containId = onClassviz ? 'classviz-loading-container' : 'explain-loading-container';
  const loadingContainer = document.getElementById(containId);

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
export const explainSubTreeFromEnterPoint = async (cytrace, nodeId, onClassviz = false, cy = window.cy) => {
  if (!cytrace || !nodeId) {
    console.error('Missing required parameters: cy or nodeId');
    return null;
  }
  toggleLoading(true, onClassviz);

  try {
    // Step 1: Collect the subtree data
    const subTreeData = collectSubtreeData(cytrace, nodeId);

    // Step 2: Get the explanation from the AI service
    const response = await explainSubTree(subTreeData);

    if (!response) {
      throw new Error('No explanation data received from AI service');
    }

    // Step 3: Update the node with the explanation data
    const rootNode = cytrace.getElementById(nodeId);
    updateNodeWithExplanation(rootNode, response);
    const classvizNode = cy.getElementById(rootNode.data('label'));
    console.log("classvizNode", classvizNode);
    updateNodeWithExplanation(classvizNode, response);

    // Step 4: Render UI
    // if (!onClassviz) {
    updateExplanationCallTreeUI(response);
    // } else {
    updateExplanationClassvizUI(response);
    // }

    return response;
  } catch (error) {
    console.error('Error explaining subtree:', error.message);
    return null;
  } finally {
      toggleLoading(false, onClassviz);
  }
};

export const explainWholeTreeFromEnterPoint = async (cy, nodeId) => {
  const specialGraph = extractWholeSpecialNodesTree(cy, nodeId);
  console.log(specialGraph);
  window.specialGraph = specialGraph;

  addEssentialMethods(window.cy);


  // toggleLoading(true);

  // try {
  //   // Step 1: Collect the subtree data
  //   const subTreeData = collectSubtreeData(cy, nodeId);

  //   // Step 2: Get the explanation from the AI service
  //   const response = await explainSubTree(subTreeData);

  //   if (!response) {
  //     throw new Error('No explanation data received from AI service');
  //   }

  //   // Step 3: Update the node with the explanation data
  //   const rootNode = cy.getElementById(nodeId);
  //   updateNodeWithExplanation(rootNode, response);

  //   // Step 4: Render UI
  //   updateExplanationUI(response);

  //   return response;
  // } catch (error) {
  //   console.error('Error explaining subtree:', error.message);
  //   return null;
  // } finally {
  //   toggleLoading(false);
  // }
};