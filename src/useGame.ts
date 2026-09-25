import { useCallback, useEffect, useRef, useState } from "react";
import { getHostAccess, socketUrl } from "./network";
import type { Command, Snapshot } from "../shared/game";

export function useGame() {
  const [state, setState] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socket = useRef<WebSocket | null>(null);
  useEffect(() => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    let retry = 400;
    const connect = async () => {
      if (done) return;
      let token: string;
      try {
        token = (await getHostAccess()).token;
      } catch {
        if (!done) {
          setError("Open solo rehearsal on the host laptop.");
          timer = setTimeout(connect, 4000);
        }
        return;
      }
      if (done) return;
      const ws = new WebSocket(socketUrl("solo", token));
      socket.current = ws;
      ws.onopen = () => {
        setConnected(true);
        setError("");
        retry = 400;
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "state") setState(message.state);
          else if (message.type === "error") setError(message.message);
        } catch {
          setError("An unreadable update arrived. Reconnecting…");
          ws.close();
        }
      };
      ws.onclose = () => {
        if (done) return;
        setConnected(false);
        timer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 4000);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      done = true;
      clearTimeout(timer);
      socket.current?.close();
    };
  }, []);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);
  const send = useCallback((command: Command) => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(command));
    else
      setError(
        "The game server is disconnected. Controls will return when it reconnects.",
      );
  }, []);
  return { state, connected, error, send };
}
