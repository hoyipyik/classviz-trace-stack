// EventBus.js
export const eventNames = {
  refreshFlame: 'refreshFlame',
  nodeSelectionChanged: 'nodeSelectionChanged',
  searchResultsChanged: 'searchResultsChanged',
  threadChanged: 'threadChanged',
  changeCurrentFocusedNode: 'changeCurrentFocusedNode',
  // focus for step by step
  changeCurrentFocusedNodeForStepByStep: 'changeCurrentFocusedNodeForStepByStep',

  viewModeChanged: 'viewModeChanged',
  specialNodeConfigChanged: 'specialNodeConfigChanged',
  scrollToNodeClickedInFlameChart: 'scrollToNodeClickedInFlameChart',
  changeLogicalStyle: 'changeLogicalStyle',
  changeTraceMode: 'changeTraceMode',
  // classviz relavant events
  changeSingleMethodByIdToClassviz: 'changeSingleMethodByIdToClassviz',
  changeMultiMethodByIdsToClassviz: 'changeMultiMethodByIdsToClassviz',
  changeClassvizFocus: 'changeClassvizFocus',

  // trace mode 
  switchTraceMode: 'switchTraceMode',
  // recursive compression
  nodeCompressionTriggered: 'nodeCompressionTriggered',

  // explanation
  explanationCompleted: 'explanationCompleted',
  changeLLMServiceProvider: 'changeLLMServiceProvider',

  // search for detailed behaviour summary
  fuzzySearchFromDetailedBehaviour: 'fuzzySearchFromDetailedBehaviour',

  switchStepByStepMode: 'switchStepByStepMode',
  stopRegionFocusMode: 'stopRegionFocusMode',
  refreshRegionFocus: 'refreshRegionFocus',

  refreshLiftEdges: 'refreshLiftEdges',

  stopRegionFocusModeAndRender: 'stopRegionFocusModeAndRender',

  controlTraceDiagram: 'controlTraceDiagram'
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