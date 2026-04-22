export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  event_type: string | null;
  metadata: Record<string, string>;
  raw: string;
}
