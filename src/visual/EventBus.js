// EventBus.js
export const eventNames = {
  refreshFlame: 'refreshFlame',
  nodeSelectionChanged: 'nodeSelectionChanged',
  searchResultsChanged: 'searchResultsChanged',
  threadChanged: 'threadChanged',
  changeCurrentFocusedNode: 'changeCurrentFocusedNode',
  viewModeChanged: 'viewModeChanged',
  nodeDataChanged: 'nodeDataChanged',
  searchResultsChanged: 'searchResultsChanged',
  scrollToFocusedNode: 'scrollToFocusedNode',
  changeLogicalStyle: 'changeLogicalStyle',
  changeTraceMode: 'changeTraceMode',
}

class EventBus {
    constructor() {
      this.events = {};
      
    }
    
    // subscribe to an event
    subscribe(eventName, callback) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }
      this.events[eventName].push(callback);
      
      // return unsubscribe function
      return () => {
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
      };
    }
    
    // publish an event
    publish(eventName, data) {
      if (!this.events[eventName]) return;
      
      this.events[eventName].forEach(callback => {
        callback(data);
      });
    }
  }
  
  export { EventBus };