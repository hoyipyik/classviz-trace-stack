
export const contextDataLoader = (rawContext) => {
    const context = {
        nodes: {},
        edges: {}
    };
    const nodeList = rawContext.elements.nodes; 
    const edgeList = rawContext.elements.edges;
    nodeList.forEach(element => {
        const data = element.data;
        const id = data.id;
        context.nodes[id] = data;
    });
    edgeList.forEach(element => {
        const data = element.data;
        const id = data.id;
        context.edges[id] = data;
    });
    window.context = context;
}