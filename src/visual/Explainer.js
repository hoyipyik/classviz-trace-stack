class Explainer {
    constructor(dataStore, eventBus) {
        this.data = dataStore;
        this.eventBus = eventBus;

        this.selectedTrees = new Map(); // entry method original Id -> { tree: tree data, AST: ast contains special nodes only }
        this.regions = new Map(); // entry special method original Id -> { data: subtree of a region, highlevelSummary: "", detailedBehaviour: "", flowRepresentation: "", briefSummary: "" }
    }

    buildSelectedTrees() {
        // Clear existing data
        this.selectedTrees.clear();
        this.regions.clear();

        // Get thread data from the dataStore
        const threadsData = this.data.threadsData;

        // Iterate through all threads
        Object.entries(threadsData).forEach(([threadName, threadData]) => {
            // Find all selected nodes in this thread that have no selected ancestors
            const selectedRoots = this.findSelectedRoots(threadData);
            
            console.log(`Found ${selectedRoots.length} root trace trees in thread ${threadName}`);

            // For each selected root, build a subtree
            selectedRoots.forEach(rootNode => {
                // Create a clean copy of the subtree with only selected nodes
                const tree = this.buildSelectedSubtree(rootNode);
                
                // Skip empty trees (should not happen, but just in case)
                if (!tree) return;
                
                // Build AST with only special nodes
                const ast = this.buildAST(tree);

                // Store the tree and AST
                this.selectedTrees.set(rootNode.id, {
                    tree: tree,
                    AST: ast
                });

                // Identify and store regions
                this.identifyRegions(tree);
            });
        });

        console.log(`Built ${this.selectedTrees.size} selected trees and ${this.regions.size} regions`);
        
        // Trigger an event to notify that trees have been built
        if (this.eventBus) {
            this.eventBus.publish('selectedTreesBuilt', {
                treeCount: this.selectedTrees.size,
                regionCount: this.regions.size
            });
        }

        return {
            trees: this.selectedTrees,
            regions: this.regions
        };
    }

    // Find all selected root nodes in a thread
    findSelectedRoots(threadData) {
        const selectedRoots = [];
        const selectedNodeIds = new Set();
        
        // First pass: collect all selected node IDs
        const collectSelectedIds = (node) => {
            if (!node) return;
            
            if (node.selected === true) {
                selectedNodeIds.add(node.id);
            }
            
            // Recursively check children
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    collectSelectedIds(child);
                });
            }
        };
        
        // Start first pass from the thread's root node
        collectSelectedIds(threadData);
        
        // Second pass: identify true roots (selected nodes with no selected ancestors)
        const findRoots = (node, ancestorSelected = false) => {
            if (!node) return;
            
            const isSelected = node.selected === true;
            
            // If this node is selected and no ancestor is selected, it's a root
            if (isSelected && !ancestorSelected) {
                selectedRoots.push(node);
            }
            
            // Update ancestorSelected flag for children
            const newAncestorSelected = ancestorSelected || isSelected;
            
            // Recursively check children
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    findRoots(child, newAncestorSelected);
                });
            }
        };
        
        // Start second pass from the thread's root node
        findRoots(threadData, false);
        
        return selectedRoots;
    }

    // Build a subtree containing only selected descendants
    buildSelectedSubtree(rootNode) {
        if (!rootNode) return null;
        
        // Create a deep copy of the root node, excluding children
        const newRoot = { ...rootNode };
        delete newRoot.children;
        newRoot.children = [];
        
        // Helper function to recursively build the subtree
        const buildSubtree = (node) => {
            // Create a new node object with all properties except children
            const newNode = { ...node };
            delete newNode.children;
            newNode.children = [];
            
            // Process each child
            if (node.children && node.children.length > 0) {
                for (const child of node.children) {
                    // Only include selected children
                    if (child.selected === true) {
                        // Recursively build the child's subtree
                        const childSubtree = buildSubtree(child);
                        if (childSubtree) {
                            newNode.children.push(childSubtree);
                        }
                    }
                }
            }
            
            return newNode;
        };
        
        // Build the new subtree
        return buildSubtree(rootNode);
    }

    // Check if a node is a special node
    isSpecialNode(node, isTreeRoot = false) {
        // Tree root nodes are always considered special
        if (isTreeRoot) {
            return true;
        }
        
        // Check standard special node criteria
        return node.status && (
            node.status.fanOut === true ||
            node.status.implementationEntryPoint === true ||
            node.status.recursiveEntryPoint === true
        );
    }

    // Build AST with only special nodes
    buildAST(tree) {
        if (!tree) return null;
        
        // Create a complete AST node for the root (copying all properties)
        const astRoot = this.createASTNode(tree);
        
        // Helper function to recursively build the AST
        const findSpecialNodesInSubtree = (node, astParent) => {
            if (!node || !node.children) return;
            
            // Check each child
            for (const child of node.children) {
                if (!child) continue;
                
                if (this.isSpecialNode(child)) {
                    // This is a special node, add it to the AST
                    const specialNode = this.createASTNode(child);
                    astParent.children.push(specialNode);
                    
                    // Continue with this special node's children
                    findSpecialNodesInSubtree(child, specialNode);
                } else {
                    // This is not a special node, skip it but check its children
                    findSpecialNodesInSubtree(child, astParent);
                }
            }
        };
        
        // Start building AST from the root
        findSpecialNodesInSubtree(tree, astRoot);
        
        return astRoot;
    }
    
    // Helper function to create a complete AST node with all properties
    createASTNode(node) {
        if (!node) return null;
        
        // Create a deep copy of the node without its children
        const astNode = { ...node };
        
        // Initialize the children array
        astNode.children = [];
        
        // Make sure the node has required properties
        if (!astNode.status) astNode.status = {};
        
        // Additional metadata that might be useful for explaining
        astNode.isSpecialNode = true;
        
        return astNode;
    }

    // Identify regions in the tree
    identifyRegions(tree) {
        if (!tree) return;
        
        // Helper function to recursively find all regions in the tree
        const findRegions = (node, isRoot = false) => {
            if (!node) return;
            
            // Check if this node is a special node (or the root)
            const isSpecial = isRoot || this.isSpecialNode(node);
            
            if (isSpecial) {
                // If the node has children, create a region
                if (node.children && node.children.length > 0) {
                    // Extract the region subtree
                    const regionData = this.extractRegion(node);
                    
                    // Store the region with empty analysis fields
                    this.regions.set(node.id, {
                        data: regionData,
                        highlevelSummary: "",
                        detailedBehaviour: "",
                        flowRepresentation: "",
                        briefSummary: ""
                    });
                }
            }
            
            // Process children recursively
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    findRegions(child);
                });
            }
        };
        
        // Start finding regions from the root
        findRegions(tree, true);
        
        console.log(`Identified ${this.regions.size} regions in the tree`);
    }

    // Extract a region subtree (stops at leaves or other special nodes)
    extractRegion(rootNode) {
        if (!rootNode) return null;
        
        // Create a deep copy of the root node without children
        const regionRoot = { ...rootNode };
        delete regionRoot.children;
        regionRoot.children = [];
        
        // Helper function to recursively extract the region
        const extractSubRegion = (node, regionParent) => {
            if (!node || !node.children) return;
            
            // Process each child of the node
            for (const child of node.children) {
                // Skip null children (should not happen, but just in case)
                if (!child) continue;
                
                // Check if this child is a special node (region boundary)
                // Skip the check for the root node (we're already processing its children)
                const isSpecialBoundary = node !== rootNode && this.isSpecialNode(child);
                
                // Create a deep copy of the child without its children
                const childCopy = { ...child };
                delete childCopy.children;
                childCopy.children = [];
                
                // Add the copied child to the parent in our region tree
                regionParent.children.push(childCopy);
                
                // If this child is a special node (and not the root), it forms a boundary
                // Don't include its children in this region
                if (!isSpecialBoundary && child.children && child.children.length > 0) {
                    // Recursively process this child's children
                    extractSubRegion(child, childCopy);
                }
                // If it's a special boundary, we include the node but stop processing its children
            }
        };
        
        // Start extracting from the root node
        extractSubRegion(rootNode, regionRoot);
        
        return regionRoot;
    }

    // explainSelectedTraces() {
    //     // Implementation for explaining selected traces
    // }

    // explainCurrentRegion(id) {
    //     // Implementation for explaining a specific region
    // }

    // _compressRecurisiveCall() {
    //     // Implementation for compressing recursive calls
    // }
}

export { Explainer };