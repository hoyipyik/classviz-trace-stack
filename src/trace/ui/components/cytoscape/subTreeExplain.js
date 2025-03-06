import { explainSubTree } from "../../../utils/ai/aiService.js";
import { escapeHtml } from "../sidebar/utils.js";
import { getAllDescendantsAsTree } from "./nodeTraversal.js";

// DOM elements cache
const UI_ELEMENTS = {
  briefSummary: null,
  detailedBehaviour: null, 
  flowRepresentation: null,
  loadingContainer: null
};

/**
 * Initialize UI element cache
 * Should be called once at component mount
 */
export const initializeUIElements = () => {
  UI_ELEMENTS.briefSummary = document.getElementById('briefSummary-container-value');
  UI_ELEMENTS.detailedBehaviour = document.getElementById('detailedBehaviour-container-value');
  UI_ELEMENTS.flowRepresentation = document.getElementById('flowRepresentation-container-value');
  UI_ELEMENTS.loadingContainer = document.getElementById('explain-loading-container');
};

/**
 * Collects data from a subtree in the graph
 * @param {Object} cy - Cytoscape instance
 * @param {string} nodeId - ID of the root node
 * @returns {Object} - The collected subtree data
 */
export const collectSubtreeData = (cy, nodeId) => {
  const properties = ["label", "description"];
  return getAllDescendantsAsTree(cy, nodeId, properties);
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
  // Initialize UI elements if not already done
  if (!UI_ELEMENTS.briefSummary) {
    initializeUIElements();
  }
  
  // Update UI elements with the explanation data
  if (briefSummary && UI_ELEMENTS.briefSummary) {
    UI_ELEMENTS.briefSummary.innerHTML = escapeHtml(briefSummary);
  }
  
  if (detailedBehaviour && UI_ELEMENTS.detailedBehaviour) {
    UI_ELEMENTS.detailedBehaviour.innerHTML = escapeHtml(detailedBehaviour);
  }
  
  if (flowRepresentation && UI_ELEMENTS.flowRepresentation) {
    UI_ELEMENTS.flowRepresentation.innerHTML = escapeHtml(flowRepresentation);
  }
  
  return true;
};

/**
 * Toggle loading indicator visibility
 * @param {boolean} isVisible - Whether to show or hide the loading indicator
 */
const toggleLoading = (isVisible) => {
  if (!UI_ELEMENTS.loadingContainer) {
    UI_ELEMENTS.loadingContainer = document.getElementById('explain-loading-container');
  }
  
  if (UI_ELEMENTS.loadingContainer) {
    UI_ELEMENTS.loadingContainer.style.display = isVisible ? 'block' : 'none';
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
    // Uncomment when ready to use the real service
    // const response = await explainSubTree(subTreeData);
    
    // MOCK DATA FOR DEVELOPMENT - artificial delay to simulate API call
    console.log("Starting mock explanation request...");
    
    // Create a promise with timeout to simulate API latency
    const mockResponse = await new Promise(resolve => {
      setTimeout(() => {
        console.log("Mock explanation request completed");
        resolve({
          detailedBehaviour: "The call trace starts with a method initiating collision handling when a player collides with another unit. This leads to two possible paths: one where the player consumes a pellet (adding points to their score) and another where the player collides with a ghost, resulting in the player being marked as killed and taking damage. The flow of these operations is structured step-by-step, ensuring each collision scenario is handled appropriately.",
          flowRepresentation: "Collision Handling → Pellet Consumption/Ghost Collision → Points Update/Damage Application",
          briefSummary: "The trace manages player collisions with pellets or ghosts, updating scores or applying damage as needed."
        });
      }, 2000); // 2 second delay to simulate network latency
    });
    
    const response = mockResponse;

    
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