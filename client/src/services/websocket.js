import { useAuth } from '../contexts/AuthContext';

/**
 * WebSocket service for managing a single connection across the app
 * This prevents multiple connections for the same user and provides
 * a centralized way to handle WebSocket communication
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected'
    this.subscribers = new Map(); // Store subscribers by event type
    this.reconnectTimeout = null;
    this.lastConnectionAttempt = 0;
    this.accessToken = null;
    this.isAuthenticated = false;
    this.userRole = null;
  }

  /**
   * Initialize the WebSocket connection
   * @param {string} accessToken - JWT access token
   * @param {boolean} isAuthenticated - Authentication status
   * @param {string} userRole - User role
   */
  connect(accessToken, isAuthenticated, userRole) {
    // Don't connect if not authenticated
    if (!isAuthenticated || !accessToken) {
      console.log('WebSocket: Not connecting - authentication required');
      return;
    }

    // Store auth info
    this.accessToken = accessToken;
    this.isAuthenticated = isAuthenticated;
    this.userRole = userRole;

    // Rate limiting: prevent connections more frequent than every 5 seconds
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 5000) {
      console.log('WebSocket: Rate limiting - connection attempt too soon, skipping');
      return;
    }
    this.lastConnectionAttempt = now;

    // Don't create multiple connections
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      console.log('WebSocket: Already connected or connecting, skipping');
      return;
    }

    this.connectionState = 'connecting';

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close existing connection if any
    if (this.ws) {
      console.log('WebSocket: Closing existing connection before creating new one');
      this.ws.close();
    }

    // Create new WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const backendHost = window.location.hostname + ':8081';
    const wsUrl = `${protocol}://${backendHost}/ws/dashboard?token=${accessToken}`;
    
    console.log('WebSocket: Connecting to', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket: Connection established');
      this.connectionState = 'connected';
      this.notifySubscribers('connectionStateChange', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket: Message received:', data.type);
        
        // Notify all subscribers for this message type
        this.notifySubscribers(data.type, data);
        
        // Also notify general message subscribers
        this.notifySubscribers('message', data);
      } catch (err) {
        console.error('WebSocket: Error processing message:', err);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket: Connection closed', event.code, event.reason);
      this.connectionState = 'disconnected';
      this.ws = null;
      this.notifySubscribers('connectionStateChange', { connected: false });
      
      // Only reconnect on unexpected closure (not code 1000 = normal closure)
      // and only if still authenticated
      if (event.code !== 1000 && this.isAuthenticated) {
        console.log('WebSocket: Attempting to reconnect in 15 seconds...');
        this.reconnectTimeout = setTimeout(() => {
          // Double-check conditions before reconnecting
          if (this.isAuthenticated && this.accessToken) {
            console.log('WebSocket: Reconnecting...');
            this.connect(this.accessToken, this.isAuthenticated, this.userRole);
          } else {
            console.log('WebSocket: Not reconnecting - conditions changed');
          }
          this.reconnectTimeout = null;
        }, 15000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket: Error:', error);
      this.connectionState = 'disconnected';
      this.notifySubscribers('connectionStateChange', { connected: false });
    };
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    console.log('WebSocket: Disconnecting');
    this.isAuthenticated = false;
    this.accessToken = null;
    this.userRole = null;

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.notifySubscribers('connectionStateChange', { connected: false });
  }

  /**
   * Subscribe to WebSocket events
   * @param {string} eventType - Event type to subscribe to
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      if (this.subscribers.has(eventType)) {
        this.subscribers.get(eventType).delete(callback);
        if (this.subscribers.get(eventType).size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Notify all subscribers of an event
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   */
  notifySubscribers(eventType, data) {
    if (this.subscribers.has(eventType)) {
      this.subscribers.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`WebSocket: Error in subscriber callback for ${eventType}:`, err);
        }
      });
    }
  }

  /**
   * Send a message through the WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Cannot send message - connection not open');
    }
  }

  /**
   * Get current connection state
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connectionState === 'connected';
  }

  /**
   * Get connection state
   * @returns {string} Connection state
   */
  getConnectionState() {
    return this.connectionState;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;

/**
 * React hook for using WebSocket service
 * @returns {Object} WebSocket service instance and connection state
 */
export function useWebSocket() {
  const { accessToken, isAuthenticated, user } = useAuth();
  
  return {
    webSocketService,
    connect: () => webSocketService.connect(accessToken, isAuthenticated, user?.role),
    disconnect: () => webSocketService.disconnect(),
    subscribe: webSocketService.subscribe.bind(webSocketService),
    send: webSocketService.send.bind(webSocketService),
    isConnected: webSocketService.isConnected(),
    connectionState: webSocketService.getConnectionState()
  };
}