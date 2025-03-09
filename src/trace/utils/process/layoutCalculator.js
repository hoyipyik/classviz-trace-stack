import { LAYOUT } from './constants.js';

/**
 * Layout calculator for positioning nodes in the tree visualization
 */

/**
 * Calculate the width needed for each subtree
 * @param {Element} xmlNode - XML node to calculate width for
 * @param {Function} shouldIncludeNode - Function to determine if a node should be included
 * @return {number} Width of the subtree
 */
export const calculateSubtreeWidth = (xmlNode, shouldIncludeNode) => {
  const childNodes = Array.from(xmlNode.childNodes).filter(
    node => shouldIncludeNode(node)
  );

  if (childNodes.length === 0) {
    return LAYOUT.NODE_SIZE;  // Base width for a leaf node
  }

  let totalWidth = 0;
  for (const child of childNodes) {
    totalWidth += calculateSubtreeWidth(child, shouldIncludeNode);
  }

  // Add spacing between children
  if (childNodes.length > 1) {
    totalWidth += (childNodes.length - 1) * LAYOUT.HORIZONTAL_SPACING;
  }

  return Math.max(LAYOUT.NODE_SIZE, totalWidth);
};

/**
 * Calculate the horizontal position for a node
 * @param {Element} xmlNode - The XML node
 * @param {Function} shouldIncludeNode - Function to determine if a node should be included
 * @param {number} leftBound - Left boundary for positioning
 * @param {Array} childNodes - Array of child nodes
 * @return {number} The calculated x position
 */
export const calculateNodeXPosition = (xmlNode, shouldIncludeNode, leftBound, childNodes) => {
  const subtreeWidth = calculateSubtreeWidth(xmlNode, shouldIncludeNode);
  
  return childNodes.length === 0
    ? leftBound + LAYOUT.NODE_SIZE / 2  // Center of leaf node
    : leftBound + subtreeWidth / 2;     // Center of subtree
};

/**
 * Calculate the vertical position for a node
 * @param {number} depth - The depth level of the node in the tree
 * @return {number} The calculated y position
 */
export const calculateNodeYPosition = (depth) => {
  return depth * LAYOUT.VERTICAL_SPACING;
};

/**
 * Calculate node position
 * @param {Element} xmlNode - The XML node
 * @param {Function} shouldIncludeNode - Function to determine if a node should be included
 * @param {number} depth - Current depth in the tree
 * @param {number} leftBound - Left boundary for positioning
 * @param {Array} childNodes - Array of child nodes
 * @return {Object} The position coordinates {x, y}
 */
export const calculateNodePosition = (xmlNode, shouldIncludeNode, depth, leftBound, childNodes) => {
  const x = calculateNodeXPosition(xmlNode, shouldIncludeNode, leftBound, childNodes);
  const y = calculateNodeYPosition(depth);
  
  return { x, y };
};

/**
 * Calculate layout positions for all children
 * @param {Array} childNodes - Array of child nodes
 * @param {Function} shouldIncludeNode - Function to determine if a node should be included
 * @param {number} leftBound - Left boundary for positioning
 * @return {Array} Array of objects containing node and its right boundary position
 */
export const calculateChildrenLayouts = (childNodes, shouldIncludeNode, leftBound) => {
  let currentX = leftBound;
  const childLayouts = [];

  for (const childNode of childNodes) {
    const childSubtreeWidth = calculateSubtreeWidth(childNode, shouldIncludeNode);
    
    childLayouts.push({
      node: childNode,
      startX: currentX,
      width: childSubtreeWidth
    });
    
    currentX += childSubtreeWidth + LAYOUT.HORIZONTAL_SPACING;
  }

  return {
    childLayouts,
    finalX: currentX
  };
};