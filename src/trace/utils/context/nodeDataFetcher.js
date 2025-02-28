export const nodeDataFetcher = (className, methodName) => {
    // console.log(window.context);
    const context = window.context;
    const { nodes: node, edges: edge } = context;
    let queryFactor = `${className}.${methodName}(`; // Query factor
    if(methodName === "<init>") {
       queryFactor = `${className}(`;
    }
    const nodeKey = findSpecificKey(node, queryFactor); // Find the node key
    if (!nodeKey) {
        return null;
    }
    const nodeData = node[nodeKey]; // Get the node data
    // if(methodName === "<init>") {
    //     console.log(nodeData);
    // }
    // console.log(nodeData);
    return nodeData;

};


function findSpecificKey(object, prefix) {
    return Object.keys(object).find(key =>
        key.startsWith(prefix) &&
        key.endsWith(")")
    );
}

// nodeDataFetcher("nl.tudelft.jpacman.game.Game", "start");