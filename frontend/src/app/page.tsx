"use client";

import { useState } from "react";
import { useLogStream } from "@/hooks/use-log-stream";
import { LogTable } from "@/components/log-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Play, Pause, Trash2, Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { LogEntry } from "@/types/log";

export default function Dashboard() {
  const { logs: liveLogs, isLive, setIsLive, clearLogs } = useLogStream();
  const [searchLogs, setSearchLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"file" | "db">("file");
  const [isSearching, setIsSearching] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await fetch(`/api/logs/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`);
      const data = await res.json();
      setSearchLogs(data);
    } catch (error) {
      toast.error("Failed to search logs");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleIngest = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      if (res.ok) {
        toast.success("Ingestion started in background");
      } else {
        toast.error("Failed to start ingestion");
      }
    } catch (error) {
      toast.error("Error starting ingestion");
      console.error(error);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <main className="container mx-auto p-4 h-screen flex flex-col gap-4">
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Logwart</h1>
          <Badge variant="outline" className="ml-2 font-mono">stalwart</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleIngest} disabled={isIngesting}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isIngesting ? 'animate-spin' : ''}`} />
            Ingest Logs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsLive(!isLive)}>
            {isLive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isLive ? "Pause" : "Resume"}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="live" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="live">Live View</TabsTrigger>
          <TabsTrigger value="search">Historical Search</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col border-none shadow-none">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle>Real-time Logs</CardTitle>
                <CardDescription>Tailing the latest stalwart.log file.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <LogTable logs={liveLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="flex-1 min-h-0 mt-4">
          <Card className="h-full flex flex-col border-none shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="flex justify-between items-end gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages, raw content..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "file" | "db")} className="shrink-0">
                    <TabsList>
                      <TabsTrigger value="file">Files</TabsTrigger>
                      <TabsTrigger value="db">Database</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button type="submit" disabled={isSearching}>
                    {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <LogTable logs={searchLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
