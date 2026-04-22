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
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Database className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Logwart Login</CardTitle>
          <CardDescription>
            Enter your LOGWART_TOKEN to access the dashboard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter Token"
                className="pl-10"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit">
              Unlock Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
