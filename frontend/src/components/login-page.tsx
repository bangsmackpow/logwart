"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Database, Lock } from "lucide-react";

export function LoginPage() {
  const [value, setValue] = useState("");
  const { setToken } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      setToken(value.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 antialiased">
      <Card className="w-full max-w-[400px] border shadow-xl">
        <CardHeader className="space-y-4 text-center pt-8 pb-6">
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Database className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight">Logwart</CardTitle>
            <CardDescription className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
              stalwart log viewer
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-8 pb-8">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                <Input
                  type="password"
                  placeholder="Access Token"
                  className="pl-10 h-10 text-sm focus-visible:ring-primary/20 transition-all"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <Button className="w-full h-10 text-sm font-medium shadow-lg shadow-primary/10" type="submit">
              Unlock Dashboard
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
