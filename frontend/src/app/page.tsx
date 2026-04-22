"use client";

import { useState, useMemo } from "react";
import { useLogStream } from "@/hooks/use-log-stream";
import { LogTable } from "@/components/log-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Play, Pause, Trash2, Database, RefreshCw, LogOut, Filter, ShieldAlert, Send, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { LogEntry } from "@/types/log";
import { useAuth, AuthProvider } from "@/components/auth-provider";
import { LoginPage } from "@/components/login-page";

const PRESET_FILTERS = [
  { id: 'all', label: 'All', icon: Filter, pattern: '' },
  { id: 'security', label: 'Security', icon: ShieldAlert, pattern: 'authentication.failure|blocked|spam-filter' },
  { id: 'delivery', label: 'Delivery', icon: Send, pattern: 'queue.queue-report|smtp.delivery|smtp.out-connect' },
  { id: 'system', label: 'System', icon: Settings2, pattern: 'server.startup|acme.process-cert|housekeeper' },
];

function DashboardContent() {
  const { token, setToken } = useAuth();
  const { logs: rawLiveLogs, isLive, setIsLive, clearLogs } = useLogStream();
  const [searchLogs, setSearchLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"file" | "db">("file");
  const [isSearching, setIsSearching] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const liveLogs = useMemo(() => {
    const filter = PRESET_FILTERS.find(f => f.id === activeFilter);
    if (!filter || !filter.pattern) return rawLiveLogs;
    
    const re = new RegExp(filter.pattern, 'i');
    return rawLiveLogs.filter(log => 
      (log.event_type && re.test(log.event_type)) || 
      re.test(log.message) || 
      re.test(log.level)
    );
  }, [rawLiveLogs, activeFilter]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await fetch(`/api/logs/search?q=${encodeURIComponent(searchQuery)}&mode=${searchMode}`, {
        headers: { "Authorization": `Bearer ${token}` }
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
        headers: { "Authorization": `Bearer ${token}` }
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
    <main className="h-screen flex flex-col bg-background text-foreground antialiased overflow-hidden">
      <header className="flex justify-between items-center px-6 py-3 border-b bg-card shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
            <Database className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Logwart</h1>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-widest">stalwart intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
            {PRESET_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${activeFilter === f.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="outline" size="sm" onClick={handleIngest} disabled={isIngesting} className="h-8 text-[11px] font-semibold border-primary/20 hover:border-primary/40">
            <RefreshCw className={`w-3 h-3 mr-2 ${isIngesting ? 'animate-spin' : ''}`} />
            Ingest
          </Button>
          <Button variant={isLive ? "secondary" : "default"} size="sm" onClick={() => setIsLive(!isLive)} className="h-8 text-[11px] font-semibold min-w-[80px]">
            {isLive ? <Pause className="w-3 h-3 mr-2" /> : <Play className="w-3 h-3 mr-2" />}
            {isLive ? "Pause" : "Resume"}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => setToken(null)} className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="live" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 bg-muted/20 border-b flex justify-between items-center shrink-0">
            <TabsList className="w-fit h-8 p-0.5 bg-muted border rounded-lg">
              <TabsTrigger value="live" className="px-6 h-7 text-[11px] font-bold rounded-md data-[state=active]:shadow-sm">LIVE VIEW</TabsTrigger>
              <TabsTrigger value="search" className="px-6 h-7 text-[11px] font-bold rounded-md data-[state=active]:shadow-sm">HISTORICAL</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-5 text-[9px] font-mono border-green-500/20 text-green-500 bg-green-500/5 px-2">
                CONNECTED
              </Badge>
            </div>
          </div>

          <TabsContent value="live" className="flex-1 min-h-0 m-0 outline-none p-0">
            <LogTable logs={liveLogs} storageKey="logwart-live-columns" />
          </TabsContent>

          <TabsContent value="search" className="flex-1 min-h-0 m-0 outline-none flex flex-col">
            <div className="px-6 py-3 border-b bg-card">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search anything... (e.g. queueId, domain, error)"
                    className="pl-10 h-10 text-sm bg-muted/30 border-transparent focus:bg-background focus:border-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-muted rounded-lg p-1 border shrink-0">
                   <button 
                    type="button"
                    onClick={() => setSearchMode("file")}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${searchMode === "file" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     FILES
                   </button>
                   <button 
                    type="button"
                    onClick={() => setSearchMode("db")}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${searchMode === "db" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                   >
                     DATABASE
                   </button>
                </div>
                <Button type="submit" disabled={isSearching} size="sm" className="h-10 px-6 text-xs font-bold shadow-lg shadow-primary/10">
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "SEARCH"}
                </Button>
              </form>
            </div>
            <div className="flex-1 min-h-0">
              <LogTable logs={searchLogs} storageKey="logwart-search-columns" />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="px-6 py-2 border-t bg-card shrink-0 flex justify-between items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            BACKEND: ONLINE
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Badge variant="secondary" className="h-4 text-[8px] px-1 font-mono">V0.1.0</Badge>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {liveLogs.length} LOGS DISPLAYED
        </div>
      </footer>
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
