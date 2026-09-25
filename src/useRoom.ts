import { useCallback, useEffect, useRef, useState } from "react";
import type { Role, RoomCommand, RoomState } from "../shared/room";
import { socketUrl } from "./network";
export function useRoom(role: Role, token: string | null) {
  const [state, setState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [ack, setAck] = useState<{ id: string; command: string } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  useEffect(() => {
    setExpired(false);
    setState(null);
    setConnected(false);
    setError("");
    if (!token) return;
    let done = false,
      denied = false,
      retry = 400,
      lastMessage = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (done || denied) return;
      const ws = new WebSocket(socketUrl(role, token));
      socket.current = ws;
      ws.onopen = () => {
        retry = 400;
      };
      ws.onmessage = (e) => {
        lastMessage = Date.now();
        const message = JSON.parse(e.data);
        if (message.type === "state") {
          setState(message.state);
          setConnected(true);
        }
        if (message.type === "error") setError(message.message);
        if (message.type === "ack") {
          setAck({ id: message.requestId, command: message.command });
          setError("");
        }
        if (message.type === "auth-error") {
          denied = true;
          setExpired(true);
          setError(message.message);
          setConnected(false);
        }
      };
      ws.onclose = () => {
        if (done) return;
        setConnected(false);
        if (!denied) {
          timer = setTimeout(connect, retry);
          retry = Math.min(4000, retry * 2);
        }
      };
      ws.onerror = () => ws.close();
    };
    connect();
    const heartbeat = setInterval(() => {
      if (
        Date.now() - lastMessage > 7000 &&
        socket.current?.readyState === WebSocket.OPEN
      ) {
        setConnected(false);
        socket.current.close();
      }
    }, 3000);
    return () => {
      done = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      socket.current?.close();
    };
  }, [role, token]);
  const send = useCallback((command: RoomCommand) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setError(
        "Connection lost. Your controls will return when the room reconnects.",
      );
      return null;
    }
    const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    socket.current.send(JSON.stringify({ ...command, requestId }));
    return requestId;
  }, []);
  return {
    state,
    connected,
    error,
    expired,
    ack,
    send,
    clearError: () => setError(""),
  };
}
