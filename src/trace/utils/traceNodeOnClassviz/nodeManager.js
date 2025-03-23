import { extractWholeSpecialNodesTree } from "../../ui/components/cytoscape/specialNodeManager.js";
import { addEssentialMethods } from "./addEssentialMethods.js";
import { removeEssentialMethods } from "./removeEssentialMethod.js";

export function updateTraceNodesOnClassviz() {
    removeEssentialMethods(window.cy);
    const specialGraph = extractWholeSpecialNodesTree();
    console.log(specialGraph);
    window.specialGraph = specialGraph;
    addEssentialMethods(window.cy);
}