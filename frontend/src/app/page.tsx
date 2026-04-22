"use client";

import { useState } from "react";
import { useLogStream } from "@/hooks/use-log-stream";
import { LogTable } from "@/components/log-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Play, Pause, Trash2, Database, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import { LogEntry } from "@/types/log";
import { useAuth, AuthProvider } from "@/components/auth-provider";
import { LoginPage } from "@/components/login-page";

function DashboardContent() {
  const { token, setToken } = useAuth();
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
      const res = await fetch(`/api/logs/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        setToken(null);
        return;
      }
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
      const res = await fetch("/api/ingest", { 
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        setToken(null);
        return;
      }
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
    <main className="container mx-auto px-4 py-6 h-screen flex flex-col gap-6 max-w-7xl">
      <header className="flex justify-between items-center shrink-0 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight leading-none">Logwart</h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">stalwart log viewer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleIngest} disabled={isIngesting} className="h-8 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isIngesting ? 'animate-spin' : ''}`} />
            Ingest
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsLive(!isLive)} className="h-8 text-xs">
            {isLive ? <Pause className="w-3.5 h-3.5 mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
            {isLive ? "Pause" : "Resume"}
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" onClick={() => setToken(null)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="live" className="flex-1 flex flex-col min-h-0 gap-4">
        <TabsList className="w-fit h-9 p-1 bg-muted/50 border">
          <TabsTrigger value="live" className="px-4 py-1.5 text-xs font-medium">Live View</TabsTrigger>
          <TabsTrigger value="search" className="px-4 py-1.5 text-xs font-medium">Historical Search</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="flex-1 min-h-0 m-0 outline-none focus-visible:ring-0">
          <Card className="h-full flex flex-col overflow-hidden border">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b space-y-0">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-medium">Real-time Stream</CardTitle>
                <CardDescription className="text-xs">Tailing latest log file</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={clearLogs} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Clear
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <LogTable logs={liveLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="flex-1 min-h-0 m-0 outline-none focus-visible:ring-0">
          <Card className="h-full flex flex-col overflow-hidden border">
            <CardHeader className="py-3 px-4 border-b space-y-0">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search messages, raw content..."
                    className="pl-8 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-muted/50 rounded-md border p-0.5 shrink-0">
                   <button 
                    type="button"
                    onClick={() => setSearchMode("file")}
                    className={`px-3 py-1 text-[11px] font-medium rounded-[4px] transition-colors ${searchMode === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     Files
                   </button>
                   <button 
                    type="button"
                    onClick={() => setSearchMode("db")}
                    className={`px-3 py-1 text-[11px] font-medium rounded-[4px] transition-colors ${searchMode === "db" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     Database
                   </button>
                </div>
                <Button type="submit" disabled={isSearching} size="sm" className="h-9 px-4 text-xs">
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                </Button>
              </form>
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

function AuthWrapper() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  return <DashboardContent />;
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}
