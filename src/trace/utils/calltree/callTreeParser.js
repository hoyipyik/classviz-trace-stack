import { nodeDataFetcher } from "../context/nodeDataFetcher.js";

export const callTreeParser = (xmlDoc) => {
    const nodes = [];  // Array for nodes
    const edges = [];  // Array for edges
    let nodeIdCounter = 1;
    const nodeSize = 40;  // Node size in pixels (Cytoscape uses larger nodes)
    const verticalSpacing = 120;  // Vertical spacing between hierarchical levels
    const horizontalSpacing = 20;  // Horizontal spacing between siblings
    
    // First pass to calculate the width needed for each subtree
    const calculateSubtreeWidth = (xmlNode) => {
        const childNodes = Array.from(xmlNode.childNodes).filter(
            node => node.nodeType === 1 && node.tagName === 'node'
        );
        
        if (childNodes.length === 0) {
            return nodeSize;  // Base width for a leaf node
        }
        
        const childWidths = childNodes.map(child => calculateSubtreeWidth(child));
        return Math.max(
            nodeSize,
            childWidths.reduce((sum, width) => sum + width, 0) + 
            (childNodes.length - 1) * horizontalSpacing
        );
    };

    // Second pass to position nodes
    const traverseNode = (xmlNode, parentId = null, depth = 0, leftBound = 0) => {
        const nodeId = nodeIdCounter.toString();
        nodeIdCounter++;

        const methodName = xmlNode.getAttribute('methodName') || '';
        const className = xmlNode.getAttribute('class') || 'Root';
        const time = xmlNode.getAttribute('time') || '0';
        const percent = xmlNode.getAttribute('percent') || '0';

        const childNodes = Array.from(xmlNode.childNodes).filter(
            node => node.nodeType === 1 && node.tagName === 'node'
        );

        // Calculate this node's horizontal position
        let xPos;
        if (childNodes.length === 0) {
            xPos = leftBound + nodeSize / 2;  // Center of the leaf node
        } else {
            const subtreeWidth = calculateSubtreeWidth(xmlNode);
            xPos = leftBound + subtreeWidth / 2;  // Center of the subtree
        }

        const nodeData = nodeDataFetcher(className, methodName);
        const layerColor = get_layer_color(nodeData ? (nodeData.properties ? nodeData.properties.layer : '') : '');
        
        // Create node label (make sure Root node is visibly labeled)
        const label = parentId ? `${className}.${methodName}()` : 'Root';
        
        // Create Cytoscape node
        nodes.push({
            data: {
                id: nodeId,
                methodName,
                className,
                time,
                percent,
                label: label,
                sourceCode: nodeData ? (nodeData.properties ? nodeData.properties.sourceText : '') : '',
                detailedDescription: "",
                visibility: nodeData ? (nodeData.properties ? nodeData.properties.visibility : '') : '',
                simpleName: nodeData ? (nodeData.properties ? nodeData.properties.simpleName : '') : '',
                qualifiedName: nodeData ? (nodeData.properties ? nodeData.properties.qualifiedName : '') : '',
                kind: nodeData ? (nodeData.properties ? nodeData.properties.kind : '') : '',
                docComment: nodeData ? (nodeData.properties ? nodeData.properties.docComment : '') : '',
                metaSrc: nodeData ? (nodeData.properties ? nodeData.properties.metaSrc : '') : '',
                description: nodeData ? (nodeData.properties ? nodeData.properties.description : '') : '',
                returns: nodeData ? (nodeData.properties ? nodeData.properties.returns : '') : '',
                reason: nodeData ? (nodeData.properties ? nodeData.properties.reason : '') : '',
                howToUse: nodeData ? (nodeData.properties ? nodeData.properties.howToUse : '') : '',
                howItWorks: nodeData ? (nodeData.properties ? nodeData.properties.howItWorks : '') : '',
                assertions: nodeData ? (nodeData.properties ? nodeData.properties.assertions : '') : '',
                layer: nodeData ? (nodeData.properties ? nodeData.properties.layer : '') : '',
                color: layerColor,
                isRoot: parentId ? false : true,  // Explicitly mark root node
                collapsed: false,
            },
            position: { 
                x: xPos,
                y: depth * verticalSpacing  // Vertical spacing between levels
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
        childNodes.forEach((childNode) => {
            const childSubtreeWidth = calculateSubtreeWidth(childNode);
            traverseNode(childNode, nodeId, depth + 1, currentX);
            currentX += childSubtreeWidth + horizontalSpacing;  // Horizontal spacing
        });
    };

    // Get the root node and start traversal
    const rootNode = xmlDoc.getElementsByTagName('tree')[0];
    if (!rootNode) {
        console.error("Root 'tree' element not found in XML document");
        return { nodes: [], edges: [] };
    }
    
    traverseNode(rootNode);

    return { 
        nodes, 
        edges,
        // Add Cytoscape style configuration to ensure proper rendering
        style: [
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
                selector: 'node[?isRoot]',  // Special style for root node
                style: {
                    'background-color': '#4299E1',  // Distinct color for root
                    'font-weight': 'bold',
                    'width': nodeSize * 1.2,  // Slightly larger
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
            }
        ]
    };
};

function get_layer_color(layer) {
    const layer_colors = {
        'UI': 'hsl(333,70%,50%)',  // Red for presentation layer
        'Logic': 'hsl(39,96%,49%)',       // Orange for service layer
        'Data': 'hsl(143,74%,49%)',         // Green for domain layer
        'Domain': '#D53F8C',     // Purple for domain layer
        'Undefined': '#4299E1',  // Blue for undefined layer
        'Presentation Layer': '#FF0000',  // Red for presentation layer

    };
    return layer_colors[layer] || '#A0AEC0';  // Default gray if layer not found
}

// Example usage with Cytoscape:
/*
import cytoscape from 'cytoscape';

// After parsing the XML:
const result = callTreeParser(xmlDocument);
const { nodes, edges, style } = result;

const cy = cytoscape({
  container: document.getElementById('cy'), // container to render in
  elements: [...nodes, ...edges],
  style: style,  // Use the style provided by the parser
  layout: {
    name: 'preset' // Use the positions we calculated
  }
});

// You can add interaction handlers:
cy.on('tap', 'node', function(evt){
  const node = evt.target;
  console.log('Tapped', node.id(), node.data());
  // Display node details in a panel, etc.
});
*/