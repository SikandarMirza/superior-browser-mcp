const WebSocket = require('ws');
const EventEmitter = require('events');

class ExtensionServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 5555;
    this.wss = null;
    this.clients = new Map();
    this.isRunning = false;
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({ port: this.port });
        
        this.wss.on('connection', (ws, req) => {
          const clientId = this.generateClientId();
          this.clients.set(clientId, ws);
          
          console.error(`Extension connected: ${clientId}`);
          
          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              this.handleMessage(clientId, message, ws);
            } catch (error) {
              console.error('Error parsing message:', error);
            }
          });
          
          ws.on('close', () => {
            this.clients.delete(clientId);
            console.error(`Extension disconnected: ${clientId}`);
            this.emit('disconnect', clientId);
          });
          
          ws.on('error', (error) => {
            console.error('WebSocket error:', error);
          });
          
          this.emit('connection', clientId, ws);
        });
        
        this.wss.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`Port ${this.port} is already in use. Try: npx superior-browser-mcp --port 8080`);
            reject(new Error(`Port ${this.port} is already in use`));
          } else {
            reject(error);
          }
        });
        
        this.wss.on('listening', () => {
          console.error(`WebSocket server listening on port ${this.port}`);
          this.isRunning = true;
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    if (this.wss) {
      this.clients.forEach((ws, clientId) => {
        ws.close();
      });
      this.clients.clear();
      this.wss.close();
      this.isRunning = false;
      console.error('WebSocket server stopped');
    }
  }

  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  handleMessage(clientId, message, ws) {
    const { type, id, payload } = message;
    
    switch (type) {
      case 'ready':
        this.emit('ready', clientId);
        break;
      case 'response':
        this.emit('response', id, payload);
        break;
      case 'event':
        this.emit('event', payload.event, payload.data);
        break;
      default:
        console.error('Unknown message type:', type);
    }
  }

  sendToClient(clientId, message) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  broadcast(message) {
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }

  hasClients() {
    return this.clients.size > 0;
  }
}

module.exports = { ExtensionServer };
