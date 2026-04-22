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
import { useColumnResize } from "@/hooks/use-column-resize";

interface LogTableProps {
  logs: LogEntry[];
  storageKey: string;
}

export function LogTable({ logs, storageKey }: LogTableProps) {
  const { widths, startResizing } = useColumnResize({
    timestamp: 180,
    level: 70,
    event: 140,
    message: 400,
    metadata: 300
  }, storageKey);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b bg-muted/30 shrink-0">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-0">
              <ResizableHeader 
                width={widths.timestamp} 
                onResize={(e) => startResizing('timestamp', e.clientX)}
                className="pl-4"
              >
                Timestamp
              </ResizableHeader>
              <ResizableHeader 
                width={widths.level} 
                onResize={(e) => startResizing('level', e.clientX)}
                className="text-center"
              >
                Level
              </ResizableHeader>
              <ResizableHeader 
                width={widths.event} 
                onResize={(e) => startResizing('event', e.clientX)}
              >
                Event
              </ResizableHeader>
              <ResizableHeader 
                width={widths.message} 
                onResize={(e) => startResizing('message', e.clientX)}
              >
                Message
              </ResizableHeader>
              <TableHead 
                className="h-9 text-[11px] uppercase tracking-wider font-semibold text-right pr-4"
                style={{ width: widths.metadata }}
              >
                Metadata
              </TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      <ScrollArea className="flex-1">
        <Table className="table-fixed w-full">
          <TableBody>
            {logs.map((log, i) => (
              <TableRow key={`${log.timestamp}-${i}`} className="group border-b last:border-0 hover:bg-muted/30 transition-colors">
                <TableCell 
                  className="font-mono text-[11px] py-2 text-muted-foreground whitespace-nowrap overflow-hidden pl-4"
                  style={{ width: widths.timestamp }}
                >
                  {log.timestamp}
                </TableCell>
                <TableCell 
                  className="py-2 text-center overflow-hidden"
                  style={{ width: widths.level }}
                >
                  <LevelBadge level={log.level} />
                </TableCell>
                <TableCell 
                  className="text-[11px] font-medium py-2 truncate text-primary/80 overflow-hidden"
                  style={{ width: widths.event }}
                >
                  {log.event_type || "-"}
                </TableCell>
                <TableCell 
                  className="text-[12px] py-2 overflow-hidden"
                  style={{ width: widths.message }}
                >
                  <span className="text-foreground/90 leading-tight block truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-muted/50 group-hover:relative group-hover:z-10 group-hover:p-1 group-hover:-m-1 group-hover:rounded-sm">
                    {log.message}
                  </span>
                </TableCell>
                <TableCell 
                  className="py-2 text-right pr-4 overflow-hidden"
                  style={{ width: widths.metadata }}
                >
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
                <TableCell colSpan={5} className="text-center py-20 text-muted-foreground border-0">
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

function ResizableHeader({ 
  children, 
  width, 
  onResize, 
  className = "" 
}: { 
  children: React.ReactNode; 
  width: number; 
  onResize: (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <TableHead 
      className={`h-9 text-[11px] uppercase tracking-wider font-semibold relative group/header ${className}`}
      style={{ width }}
    >
      {children}
      <div 
        onMouseDown={onResize}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-primary/50 hover:w-1.5 z-20"
      />
    </TableHead>
  );
}

function LevelBadge({ level }: { level: string }) {
  const lv = level.toUpperCase();
  const base = "text-[9px] px-1.5 py-0 h-4 min-w-[40px] font-bold inline-flex items-center justify-center rounded-[3px]";
  
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
