"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Connection,
  Edge as FlowEdge,
  Node as FlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from './auth-provider';
import { toast } from 'sonner';
import { RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from './ui/button';

interface GraphNode {
  id: string;
  label: string;
  node_type: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  status: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface NetworkMapProps {
  filterQuery: string;
}

export function NetworkMap({ filterQuery }: NetworkMapProps) {
  const { token } = useAuth();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [loading, setLoading] = useState(false);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/network/graph?q=${encodeURIComponent(filterQuery)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch graph");
      
      const data: GraphData = await res.json();
      
      // Layout logic: Simple circular layout
      const flowNodes: FlowNode[] = data.nodes.map((node, i) => {
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        const radius = node.id === 'stalwart' ? 0 : 300;
        return {
          id: node.id,
          data: { label: node.label },
          position: { 
            x: Math.cos(angle) * radius + 500, 
            y: Math.sin(angle) * radius + 400 
          },
          style: {
            background: node.id === 'stalwart' ? '#3b82f6' : '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '8px',
            width: 120,
            textAlign: 'center',
          },
        };
      });

      const flowEdges: FlowEdge[] = data.edges.map((edge) => {
        let color = '#94a3b8';
        if (edge.status === 'success') color = '#22c55e';
        if (edge.status === 'error') color = '#ef4444';

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          labelStyle: { fontSize: '8px', fill: '#94a3b8', fontWeight: 'bold' },
          animated: edge.status === 'neutral',
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: color,
          },
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load network map");
    } finally {
      setLoading(false);
    }
  }, [token, filterQuery, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-md overflow-hidden border shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        colorMode="dark"
      >
        <Background color="#1e293b" gap={20} />
        <Controls />
      </ReactFlow>
      
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={fetchGraph} 
          disabled={loading}
          className="h-8 text-[11px] font-bold shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          REFRESH MAP
        </Button>
      </div>

      <div className="absolute bottom-4 left-6 z-50 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Stalwart Server</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Success / Delivered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Error / Blocked</span>
        </div>
      </div>
    </div>
  );
}
