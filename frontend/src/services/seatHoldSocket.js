import { Client } from "@stomp/stompjs";

const WS_URL = (import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws");

/**
 * Connect STOMP over native WebSocket and subscribe seat events.
 * @param {string|number} showtimeId
 * @param {(event:any)=>void} onMessage
 * @returns {() => void} cleanup function
 */
export function connectSeatSocket(showtimeId, onMessage) {
    const client = new Client({
        brokerURL: WS_URL,
        reconnectDelay: 3000,
        debug: (str) => console.log("[STOMP]", str),
    });

    client.onWebSocketError = (e) => console.log("[WS ERROR]", e);
    client.onWebSocketClose = (e) => console.log("[WS CLOSE]", e);

    client.onConnect = () => {
        console.log("[STOMP] connected, subscribing...");
        client.subscribe(`/topic/showtimes/${showtimeId}/seats`, (message) => {
            onMessage?.(JSON.parse(message.body));
        });
    };

    client.onStompError = (frame) => {
        console.error("[STOMP ERROR]", frame.headers["message"], frame.body);
    };

    client.activate();

    // cleanup
    return () => client.deactivate();
}
