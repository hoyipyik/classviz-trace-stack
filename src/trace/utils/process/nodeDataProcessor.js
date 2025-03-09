import { nodeDataFetcher } from "../context/nodeDataFetcher.js";
import { getLayerColor, getPackageColor } from './constants.js';

/**
 * Fetches and processes node data for a specific class and method
 * @param {string} className - The class name
 * @param {string} methodName - The method name 
 * @param {boolean} isRoot - Whether this is the root node
 * @return {Object} Processed node data
 */
export const fetchNodeData = (className, methodName, isRoot) => {
  // Fetch raw data from the nodeDataFetcher service
  const nodeData = nodeDataFetcher(className, methodName);
  return processNodeData(nodeData, isRoot, className);
};

/**
 * Process node data from the fetcher
 * @param {Object} nodeData - Data from the nodeDataFetcher
 * @param {boolean} isRoot - Whether this is the root node
 * @param {string} className - The class name
 * @return {Object} Processed node data
 */
export const processNodeData = (nodeData, isRoot, className) => {
  const properties = nodeData?.properties || {};
  const layerColor = getLayerColor(properties.layer || '', isRoot);
  const packageName = className.split('.').slice(0, -1).join('.');
  const packageColor = getPackageColor(packageName, isRoot);

  return {
    packageName: packageName || '',
    layerColor,
    packageColor,
    sourceCode: properties.sourceText || '',
    visibility: properties.visibility || '',
    simpleName: properties.simpleName || '',
    qualifiedName: properties.qualifiedName || '',
    kind: properties.kind || '',
    docComment: properties.docComment || '',
    metaSrc: properties.metaSrc || '',
    description: properties.description || '',
    detailedBehaviour: '',
    flowRepresentation: '',
    briefSummary: '',
    returns: properties.returns || '',
    reason: properties.reason || '',
    howToUse: properties.howToUse || '',
    howItWorks: properties.howItWorks || '',
    assertions: properties.assertions || '',
    layer: properties.layer || '',
    color: packageColor
  };
};

/**
 * Extract node attributes safely with default values
 * @param {Element} xmlNode - XML node to extract attributes from
 * @return {Object} Node attributes
 */
export const getNodeAttributes = (xmlNode) => {
  return {
    methodName: xmlNode.getAttribute('methodName') || '',
    className: xmlNode.getAttribute('class') || 'Root',
    time: xmlNode.getAttribute('time') || '0',
    percent: xmlNode.getAttribute('percent') || '0'
  };
};

/**
 * Creates the label for a node
 * @param {boolean} isRoot - Whether this is the root node
 * @param {string} className - The class name
 * @param {string} methodName - The method name
 * @return {string} The node label
 */
export const createNodeLabel = (isRoot, className, methodName) => {
  return isRoot ? 'Root' : `${className}.${methodName}()`;
};