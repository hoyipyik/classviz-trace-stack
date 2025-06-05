// Actions.js - User interaction handlers
/**
 * Action buttons under the diagram in bottombar
 * 
 */
class Actions {
    constructor(dataStore, renderer, eventBus) {
      // data store manager
      this.data = dataStore;
      
      // renderer manager
      this.view = renderer;

      this.eventBus = eventBus;
    }
    
    // setup buttons
    setupButtons() {
      // select all children in the subtree starting from current node
        this.setupButton('selectAllChildren', () => {
            const currentNodeId = this.data.current;
            if (currentNodeId) {
              const selectedIds = this.data.selectAllChildren(currentNodeId);
              const expandedIds = this.data.expandAllDescendants(currentNodeId);
              const changedIds = [...new Set([...selectedIds, ...expandedIds])];
              expandedIds.forEach(nodeId => {
                this.view.updateNodeUIExpansion(nodeId);
              });
              this.view.batchUpdateNodes(changedIds);
              this.eventBus.publish('refreshFlame', {});
            }
          });
      
      // deselect all children in the subtree starting from current node
      this.setupButton('clearAllChildren', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.deselectAllChildren(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });
      
      // select direct children of the current node
      this.setupButton('selectDirectChildren', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.selectChildren(currentNodeId);
          this.data.expand(currentNodeId);
          this.view.updateNodeUIExpansion(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });
      
      // deselect direct children of the current node
      this.setupButton('clearDirectChildren', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.deselectChildren(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });

      this.setupButton('selectParent', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.selectParent(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });


      this.setupButton('clearParent', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.deselectParent(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      })
      
      // select all ancestors of the current node
      this.setupButton('selectAbove', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.selectAncestors(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });
      
      // deselect all ancestors of the current node
      this.setupButton('clearAbove', () => {
        const currentNodeId = this.data.current;
        if (currentNodeId) {
          const changedIds = this.data.deselectAncestors(currentNodeId);
          this.view.batchUpdateNodes(changedIds);
          this.eventBus.publish('refreshFlame', {});
        }
      });
      
      // select all nodes in the current thread
      this.setupButton('selectAllThread', () => {
        const changedIds = this.data.selectAll();
        this.view.batchUpdateNodes(changedIds);
        this.eventBus.publish('refreshFlame', {});
      });
      
      // deselect all nodes in the current thread
      this.setupButton('clearAllThread', () => {
        const changedIds = this.data.deselectAll();
        this.view.batchUpdateNodes(changedIds);
        this.eventBus.publish('refreshFlame', {});
      });
    }
    
    // setup button event listener
    setupButton(id, callback) {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', callback);
      } else {
        console.warn(`Button with id '${id}' not found`);
      }
    }
  }
  
  export { Actions };