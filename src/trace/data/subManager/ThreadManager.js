// ThreadManager.js - Thread management functionality
/**
 * Manages thread switching and thread-related data operations
 */
class ThreadManager {
  constructor(threadsData, eventBus) {
    this.threadsData = threadsData;
    this.eventBus = eventBus;
    
    // Current thread management
    this.currentThreadName = null;
    this.tree = null; // Current active thread tree data
    
    // Thread mapping structures
    this.originalIdToThreadMap = new Map(); // Mapping from original ID to thread name
    this.threadToNodesMap = new Map(); // Mapping from thread name to array of node IDs
    this.threadToPackageMap = new Map(); // Mapping from thread name to Set of package names in that thread
    
    // All threads' nodes mapping - Format: threadName -> Map(nodeId -> nodeData)
    this.allThreadsNodes = new Map();
  }

  /**
   * Initialize all thread node mappings
   */
  initAllThreadsNodes() {
    // Iterate through all threads
    Object.entries(this.threadsData).forEach(([threadName, threadData]) => {
      // Create node mapping for each thread
      const threadNodes = new Map();

      // Set to global mapping
      this.allThreadsNodes.set(threadName, threadNodes);

      // Build node mapping
      this.buildThreadNodesMap(threadName, threadData);
    });
  }

  /**
   * Build node mapping for a specific thread
   */
  buildThreadNodesMap(threadName, threadData) {
    const threadNodes = this.allThreadsNodes.get(threadName);

    // Recursively build node mapping
    const buildNodeMap = (node) => {
      if (!node || !node.id) return;

      // Only store node ID to node data mapping
      threadNodes.set(node.id, { data: node });

      // Recursively process child nodes
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          buildNodeMap(child);
        });
      }
    };

    // Start building mapping from the root node
    buildNodeMap(threadData);
  }

  /**
   * Initialize thread mappings
   */
  initThreadMappings() {
    // Initialize thread-to-package mappings
    Object.keys(this.threadsData).forEach(threadName => {
      this.threadToPackageMap.set(threadName, new Set());
      this.threadToNodesMap.set(threadName, []);
    });
  }

  /**
   * Add node to thread mappings
   */
  addNodeToThread(threadName, nodeId, packageName = null) {
    // Store node ID to thread mapping
    this.originalIdToThreadMap.set(nodeId, threadName);

    // Store thread to node ID mapping
    this.threadToNodesMap.get(threadName).push(nodeId);

    // Add package name to thread's package set
    if (packageName) {
      this.threadToPackageMap.get(threadName).add(packageName);
    }
  }

  /**
   * Get all thread names
   */
  getAllThreadNames() {
    return Object.keys(this.threadsData);
  }

  /**
   * Get current thread name
   */
  getCurrentThreadName() {
    return this.currentThreadName;
  }

  /**
   * Switch to specified thread
   */
  switchThread(threadName) {
    if (!this.threadsData[threadName]) {
      console.error(`Thread '${threadName}' not found!`);
      return false;
    }

    // If it's the same thread, no need to switch
    if (this.currentThreadName === threadName) {
      return true;
    }

    // Update current thread name
    this.currentThreadName = threadName;

    // Set current active thread tree data
    this.tree = this.threadsData[threadName];

    // Trigger thread change event
    if (this.eventBus) {
      this.eventBus.publish('threadChanged', {
        threadName: this.currentThreadName
      });
    }

    return true;
  }

  /**
   * Get node data by thread name and node ID
   */
  getNodeDataByThreadAndId(threadName, nodeId) {
    const threadNodes = this.allThreadsNodes.get(threadName);
    if (!threadNodes) return null;

    const node = threadNodes.get(nodeId);
    return node ? node.data : null;
  }

  /**
   * Get all node IDs for a specific thread
   */
  getAllNodeIdsForThread(threadName) {
    return this.threadToNodesMap.get(threadName) || [];
  }

  /**
   * Get the thread that a node ID belongs to
   */
  getThreadForNodeId(nodeId) {
    return this.originalIdToThreadMap.get(nodeId);
  }

  /**
   * Get all package names for a specific thread
   */
  getPackagesForThread(threadName) {
    const threadPackages = this.threadToPackageMap.get(threadName);
    return threadPackages ? Array.from(threadPackages) : [];
  }

  /**
   * Reset all thread mappings
   */
  resetMappings() {
    this.originalIdToThreadMap.clear();
    this.threadToNodesMap.clear();
    this.threadToPackageMap.clear();
    this.allThreadsNodes.clear();
  }
}

export { ThreadManager };