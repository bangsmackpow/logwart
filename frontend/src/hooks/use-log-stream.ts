import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/types/log';

export function useLogStream() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const eventSource = new EventSource('/api/logs/stream');

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
