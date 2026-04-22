"use client";

import { LogEntry } from "@/types/log";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogTableProps {
  logs: LogEntry[];
}

export function LogTable({ logs }: LogTableProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-muted/30">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[180px] h-9 text-[11px] uppercase tracking-wider font-semibold">Timestamp</TableHead>
              <TableHead className="w-[70px] h-9 text-[11px] uppercase tracking-wider font-semibold text-center">Level</TableHead>
              <TableHead className="w-[140px] h-9 text-[11px] uppercase tracking-wider font-semibold">Event</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Message</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold text-right pr-4">Metadata</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      <ScrollArea className="flex-1">
        <Table>
          <TableBody>
            {logs.map((log, i) => (
              <TableRow key={`${log.timestamp}-${i}`} className="group border-b last:border-0 hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-[11px] w-[180px] py-2 text-muted-foreground whitespace-nowrap">
                  {log.timestamp}
                </TableCell>
                <TableCell className="w-[70px] py-2 text-center">
                  <LevelBadge level={log.level} />
                </TableCell>
                <TableCell className="text-[11px] font-medium w-[140px] py-2 truncate text-primary/80">
                  {log.event_type || "-"}
                </TableCell>
                <TableCell className="text-[12px] py-2 max-w-md">
                  <span className="text-foreground/90 leading-tight">{log.message}</span>
                </TableCell>
                <TableCell className="py-2 text-right pr-4">
                   <div className="flex flex-wrap justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {Object.entries(log.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center rounded-sm bg-muted border px-1.5 py-0.5 text-[9px] font-mono leading-none">
                        <span className="text-muted-foreground mr-1">{k}:</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium">No logs available</p>
                    <p className="text-xs text-muted-foreground">New entries will appear here as they are generated.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const lv = level.toUpperCase();
  const base = "text-[9px] px-1.5 py-0 h-4 min-w-[40px] font-bold justify-center rounded-[3px]";
  
  switch (lv) {
    case "ERROR":
      return <Badge variant="destructive" className={base}>{lv}</Badge>;
    case "WARN":
      return <Badge className={`${base} bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20`}>{lv}</Badge>;
    case "INFO":
      return <Badge variant="secondary" className={`${base} bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20`}>{lv}</Badge>;
    default:
      return <Badge variant="outline" className={`${base} opacity-50`}>{lv}</Badge>;
  }
}
