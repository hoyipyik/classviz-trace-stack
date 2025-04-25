// simplified-index.js - Application entry point
import { TraceStackApp } from './TraceStackApp.js';
import { traceData } from './data.js';

// Make traceData globally available for the application
window.traceData = traceData;

// Initialize the application
console.log('Starting trace stack application...');
window.traceStackApp = new TraceStackApp();