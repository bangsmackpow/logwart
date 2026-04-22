import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/types/log';
import { useAuth } from '@/components/auth-provider';

export function useLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!isLive || !token) return;

    const eventSource = new EventSource(`/api/logs/stream?token=${encodeURIComponent(token)}`);

    eventSource.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs((prev) => {
        const next = [entry, ...prev];
        return next.slice(0, 500); // Keep last 500 logs
      });
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isLive]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return { logs, isLive, setIsLive, clearLogs };
}
