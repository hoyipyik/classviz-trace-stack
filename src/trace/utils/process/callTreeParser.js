import { nodeDataFetcher } from "../context/nodeDataFetcher.js";

// Constants for styling and layout
const LAYOUT = {
  NODE_SIZE: 55, // 40
  VERTICAL_SPACING: 170, //120
  HORIZONTAL_SPACING: 20
};

// Color map for different layers - using a Map for faster lookups
const LAYER_COLORS = new Map([
  ['UI', 'hsl(333,70%,50%)'],
  ['Logic', 'hsl(39,96%,49%)'],
  ['Data', 'hsl(143,74%,49%)'],
  ['Domain', 'hsl(261, 41.80%, 78.40%)'],
  ['Presentation Layer', '#FF0000'],
  ['Undefined', '#4299E1'],
  ['ROOT', '#6B46C1']  // Dark purple for root
]);

const PACKAGE_COLORS = new Map([
  ['nl.tudelft.jpacman', '#2C7A7B'],           // Teal
  ['nl.tudelft.jpacman.board', '#3182CE'],     // Blue
  ['nl.tudelft.jpacman.game', '#DD6B20'],      // Orange
  ['nl.tudelft.jpacman.level', '#38A169'],     // Green
  ['nl.tudelft.jpacman.npc', '#D53F8C'],       // Pink
  ['nl.tudelft.jpacman.npc.ghost', '#718096'], // Gray
  ['nl.tudelft.jpacman.points', '#ECC94B'],    // Yellow
  ['nl.tudelft.jpacman.sprite', '#805AD5'],    // Purple
  ['nl.tudelft.jpacman.ui', '#E53E3E'],        // Red
  ['ROOT', '#6B46C1']                          // Dark purple for root
]);

/**
 * Gets the color for a specific layer
 * @param {string} layer - The layer name
 * @param {boolean} isRoot - Whether this is the root node
 * @return {string} The color code
 */
function getLayerColor(layer, isRoot = false) {
  if (isRoot) return LAYER_COLORS.get('ROOT');
  return LAYER_COLORS.get(layer) || '#A0AEC0';
}

function getPackageColour(packageName, isRoot){
  if (isRoot) return PACKAGE_COLORS.get('ROOT');
  return PACKAGE_COLORS.get(packageName) || '#A0AEC0';
}

/**
 * Parse XML document into a Cytoscape-compatible graph
 * @param {Document} xmlDoc - XML document to parse
 * @return {Object} Nodes, edges and style for Cytoscape
 */
export const callTreeParser = (xmlDoc) => {
  const nodes = [];
  const edges = [];
  let nodeIdCounter = 1;
  
  // First pass: calculate the width needed for each subtree
  const calculateSubtreeWidth = (xmlNode) => {
    const childNodes = Array.from(xmlNode.childNodes).filter(
      node => node.nodeType === 1 && node.tagName === 'node'
    );
    
    if (childNodes.length === 0) {
      return LAYOUT.NODE_SIZE;  // Base width for a leaf node
    }
    
    let totalWidth = 0;
    for (const child of childNodes) {
      totalWidth += calculateSubtreeWidth(child);
    }
    
    // Add spacing between children
    if (childNodes.length > 1) {
      totalWidth += (childNodes.length - 1) * LAYOUT.HORIZONTAL_SPACING;
    }
    
    return Math.max(LAYOUT.NODE_SIZE, totalWidth);
  };

  // Extract node attributes safely with default values
  const getNodeAttributes = (xmlNode) => {
    return {
      methodName: xmlNode.getAttribute('methodName') || '',
      className: xmlNode.getAttribute('class') || 'Root',
      time: xmlNode.getAttribute('time') || '0',
      percent: xmlNode.getAttribute('percent') || '0'
    };
  };

  // Process node data from the fetcher
  const processNodeData = (nodeData, isRoot, className) => {
    const properties = nodeData?.properties || {};
    const layerColor = getLayerColor(properties.layer || '', isRoot);
    // nl.tudelft.jpacman.sprite.ImageSprite get from className except the last 
    const packageName = className.split('.').slice(0, -1).join('.');
    // console.log(packageName, nodeData)
    const packageColour = getPackageColour(packageName, isRoot);
    
    return {
      packageName: packageName || '',
      layerColor,
      packageColour,
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
      color: packageColour
    };
  };

  // Second pass: position nodes and create the graph
  const traverseNode = (xmlNode, parentId = null, depth = 0, leftBound = 0) => {
    const nodeId = (nodeIdCounter++).toString();
    const attributes = getNodeAttributes(xmlNode);
    const isRoot = !parentId;
    
    const childNodes = Array.from(xmlNode.childNodes).filter(
      node => node.nodeType === 1 && node.tagName === 'node'
    );

    // Calculate node's horizontal position
    const subtreeWidth = calculateSubtreeWidth(xmlNode);
    const xPos = childNodes.length === 0
      ? leftBound + LAYOUT.NODE_SIZE / 2  // Center of leaf node
      : leftBound + subtreeWidth / 2;     // Center of subtree

    // Create node label
    const label = isRoot ? 'Root' : `${attributes.className}.${attributes.methodName}()`;
    
    // Fetch and process node data
    const nodeData = nodeDataFetcher(attributes.className, attributes.methodName);
    const processedData = processNodeData(nodeData, isRoot, attributes.className);
    
    // Create Cytoscape node
    nodes.push({
      data: {
        id: nodeId,
        ...attributes,
        ...processedData,
        label,
        isRoot,
        collapsed: false,
      },
      position: { 
        x: xPos,
        y: depth * LAYOUT.VERTICAL_SPACING
      }
    });

    // Create edge if there's a parent
    if (parentId) {
      edges.push({
        data: {
          id: `e${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId
        }
      });
    }

    // Process children
    let currentX = leftBound;
    for (const childNode of childNodes) {
      const childSubtreeWidth = calculateSubtreeWidth(childNode);
      traverseNode(childNode, nodeId, depth + 1, currentX);
      currentX += childSubtreeWidth + LAYOUT.HORIZONTAL_SPACING;
    }
  };

  // Get the root node and start traversal
  const rootNode = xmlDoc.getElementsByTagName('tree')[0];
  if (!rootNode) {
    console.error("Root 'tree' element not found in XML document");
    return { nodes: [], edges: [] };
  }
  
  traverseNode(rootNode);

  // Return the complete graph with styling
  return { 
    nodes, 
    edges,
    style: getCytoscapeStyles(LAYOUT.NODE_SIZE)
  };
};

/**
 * Get Cytoscape styles for the graph
 * @param {number} nodeSize - Base size for nodes
 * @return {Array} Array of style objects
 */
function getCytoscapeStyles(nodeSize) {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': '',
        'text-valign': 'center',
        'text-halign': 'center',
        'width': nodeSize,
        'height': nodeSize,
        'shape': 'ellipse',
        'border-width': 1,
        'border-color': '#333'
      }
    },
    {
      selector: 'node[?isRoot]',
      style: {
        'background-color': LAYER_COLORS.get('ROOT'),
        'font-weight': 'bold',
        'width': nodeSize * 1.2,
        'height': nodeSize * 1.2
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#888',
        'target-arrow-color': '#888',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier'
      }
    },
    {
      selector: '.selected',
      style: {
        'border-width': 4,
        'border-color': '#FFC107',
        'border-opacity': 1
      }
    }
  ];
}