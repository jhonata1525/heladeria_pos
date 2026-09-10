type EventCallback = (data: unknown) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class EventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return {
      unsubscribe: () => this.off(event, callback),
    };
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }
}

export const eventEmitter = new EventEmitter();

export const SSE_EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_CANCELLED: "order:cancelled",
  STOCK_UPDATED: "stock:updated",
  REGISTER_OPENED: "register:opened",
  REGISTER_CLOSED: "register:closed",
} as const;