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
    <div className="rounded-md border h-full overflow-hidden flex flex-col">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[200px]">Timestamp</TableHead>
            <TableHead className="w-[80px]">Level</TableHead>
            <TableHead className="w-[150px]">Event</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="text-right">Metadata</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <ScrollArea className="flex-1">
        <Table>
          <TableBody>
            {logs.map((log, i) => (
              <TableRow key={`${log.timestamp}-${i}`}>
                <TableCell className="font-mono text-xs w-[200px]">
                  {log.timestamp}
                </TableCell>
                <TableCell className="w-[80px]">
                  <LevelBadge level={log.level} />
                </TableCell>
                <TableCell className="text-xs font-semibold w-[150px]">
                  {log.event_type || "-"}
                </TableCell>
                <TableCell className="text-sm max-w-md truncate">
                  {log.message}
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex flex-wrap justify-end gap-1">
                    {Object.entries(log.metadata).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-[10px] px-1 py-0">
                        {k}: {v}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No logs found.
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
  switch (level.toUpperCase()) {
    case "ERROR":
      return <Badge variant="destructive">{level}</Badge>;
    case "WARN":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{level}</Badge>;
    case "INFO":
      return <Badge variant="secondary">{level}</Badge>;
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
}
