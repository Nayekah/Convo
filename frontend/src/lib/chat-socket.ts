import type { IncomingWsEvent, OutgoingSendEvent } from '../types/chat';

export type ChatSocketHandlers = {
  onReady?: () => void;
  onStored: (event: Extract<IncomingWsEvent, { type: 'message:stored' }>) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
};

const buildWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
};

export class ChatSocket {
  private ws: WebSocket | null = null;
  private handlers: ChatSocketHandlers;
  private isClosed = false;

  constructor(handlers: ChatSocketHandlers) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.ws || this.isClosed) return;

    const ws = new WebSocket(buildWebSocketUrl());
    this.ws = ws;

    ws.addEventListener('message', (event) => {
      let parsed: IncomingWsEvent;
      try {
        parsed = JSON.parse(event.data) as IncomingWsEvent;
      } catch {
        this.handlers.onError?.('Invalid socket payload');
        return;
      }

      if (parsed.type === 'connection:ready') {
        this.handlers.onReady?.();
        return;
      }
      if (parsed.type === 'message:stored') {
        this.handlers.onStored(parsed);
        return;
      }
      if (parsed.type === 'error') {
        this.handlers.onError?.(parsed.error);
        return;
      }
    });

    ws.addEventListener('error', () => {
      this.handlers.onError?.('Socket error');
    });

    ws.addEventListener('close', () => {
      this.ws = null;
      this.handlers.onClose?.();
    });
  }

  send(event: OutgoingSendEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('SocketNotOpen');
    }
    this.ws.send(JSON.stringify(event));
  }

  close(): void {
    this.isClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
