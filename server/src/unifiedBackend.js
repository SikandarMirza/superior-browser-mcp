const EventEmitter = require('events');

class UnifiedBackend extends EventEmitter {
  constructor(extensionServer) {
    super();
    this.extensionServer = extensionServer;
    this.currentTab = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.isConnected = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.extensionServer.on('connection', (clientId, ws) => {
      this.isConnected = true;
      console.error('Browser extension connected');
    });

    this.extensionServer.on('disconnect', () => {
      this.isConnected = false;
      this.currentTab = null;
      console.error('Browser extension disconnected');
    });

    this.extensionServer.on('response', (id, payload) => {
      if (this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id);
        this.pendingRequests.delete(id);
        
        if (payload.error) {
          reject(new Error(payload.error));
        } else {
          resolve(payload.result);
        }
      }
    });

    this.extensionServer.on('event', (event, data) => {
      this.emit('event', event, data);
    });
  }

  isConnected() {
    return this.isConnected && this.extensionServer.hasClients();
  }

  getCurrentTab() {
    return this.currentTab;
  }

  async callTool(toolName, args = {}) {
    if (!this.isConnected) {
      throw new Error('No browser extension connected. Please click the extension icon and click "Connect".');
    }

    const id = ++this.requestId;
    const message = {
      type: 'request',
      id: id,
      tool: toolName,
      args: args
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${id} timed out after 30s`));
        }
      }, 30000);
      
      this.extensionServer.broadcast(message);
    });
  }

  async waitForEvent(eventName, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const handler = (data) => {
        clearTimeout(timer);
        this.removeListener(eventName, handler);
        resolve(data);
      };

      this.on(eventName, handler);
    });
  }

  async queueAction(action) {
    this.actionQueue.push(action);
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async processQueue() {
    this.isProcessing = true;
    
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();
      try {
        await this.callTool(action.tool, action.args);
      } catch (error) {
        console.error('Error processing queued action:', error);
      }
    }
    
    this.isProcessing = false;
  }
}

module.exports = { UnifiedBackend };
