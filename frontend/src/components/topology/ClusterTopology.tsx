import React, { useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Edge,
  Node,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NodeData, FileData } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Server, Cpu, HardDrive, Wifi, Power, AlertTriangle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface TopologyProps {
  nodes: NodeData[];
  files: FileData[];
  selectedFileId?: string | null;
  onSelectNode: (node: NodeData) => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

// Custom Node component for React Flow
const StorageNodeComponent = ({ data }: { data: any }) => {
  const node: NodeData = data.node;
  const isSelectedFileHolder: boolean = data.isHighlighted;
  const onSelect: () => void = data.onSelect;
  const onFail: () => void = data.onFail;
  const onRestore: () => void = data.onRestore;

  const isNormal = node.status === 'NORMAL';
  const isAtRisk = node.status === 'AT-RISK';
  const isFailed = node.status === 'FAIL-STOP';

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'w-64 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md',
        isNormal && 'bg-navy-900/95 border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20',
        isAtRisk && 'bg-navy-900/95 border-amber-500/50 hover:border-amber-500/80 shadow-amber-950/30 ring-1 ring-amber-500/30',
        isFailed && 'bg-rose-950/80 border-rose-500/60 shadow-rose-950/40 ring-1 ring-rose-500/40',
        isSelectedFileHolder && 'ring-2 ring-brand-cyan shadow-cyan-500/30 scale-105'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-brand-cyan !w-2.5 !h-2.5" />

      <div className="flex items-center justify-between pb-2 border-b border-navy-800">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'p-1.5 rounded-lg border',
            isNormal && 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            isAtRisk && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
            isFailed && 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          )}>
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-mono">{node.name}</h4>
            <span className="text-[10px] text-slate-400 font-mono">{node.rack_id} • {node.switch_id}</span>
          </div>
        </div>
        <StatusBadge status={node.status} size="sm" showPulse={isNormal || isAtRisk} />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-1.5 py-2.5 text-[11px] text-slate-300 font-mono border-b border-navy-800/80">
        <div className="bg-navy-950/70 p-1.5 rounded border border-navy-800 text-center">
          <span className="text-slate-500 block text-[9px]">CPU</span>
          <span className="font-semibold">{node.cpu_utilization.toFixed(0)}%</span>
        </div>
        <div className="bg-navy-950/70 p-1.5 rounded border border-navy-800 text-center">
          <span className="text-slate-500 block text-[9px]">LATENCY</span>
          <span className={clsx(
            'font-semibold',
            node.current_response_time_ms > 40 ? 'text-amber-400' : 'text-slate-200'
          )}>
            {node.current_response_time_ms.toFixed(0)}ms
          </span>
        </div>
        <div className="bg-navy-950/70 p-1.5 rounded border border-navy-800 text-center">
          <span className="text-slate-500 block text-[9px]">REPLICAS</span>
          <span className="font-semibold text-brand-cyan">{node.replica_count}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[10px] text-slate-400">
          Risk: <span className="text-slate-200 font-mono">{node.risk_score.toFixed(2)}</span>
        </span>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {isFailed ? (
            <button
              onClick={onRestore}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900 transition-colors"
            >
              Restore
            </button>
          ) : (
            <button
              onClick={onFail}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/80 text-rose-300 border border-rose-600/40 hover:bg-rose-900 transition-colors"
            >
              Simulate Fail
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-brand-cyan !w-2.5 !h-2.5" />
    </div>
  );
};

// Switch / Router Node
const SwitchNodeComponent = ({ data }: { data: any }) => (
  <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-950 via-navy-900 to-blue-950 border border-blue-500/40 shadow-lg text-center backdrop-blur-md">
    <Handle type="target" position={Position.Top} className="!bg-blue-400" />
    <div className="flex items-center justify-center gap-2">
      <Wifi className="w-4 h-4 text-blue-400" />
      <span className="text-xs font-bold text-white font-mono tracking-wider">{data.label}</span>
    </div>
    <span className="text-[10px] text-blue-300/80 font-mono block">{data.subtitle}</span>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
  </div>
);

// Client App Node
const ClientNodeComponent = ({ data }: { data: any }) => (
  <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-cyan/20 via-navy-900 to-brand-cyan/20 border-2 border-brand-cyan shadow-xl shadow-cyan-950/40 text-center backdrop-blur-md">
    <div className="flex items-center justify-center gap-2">
      <Cpu className="w-5 h-5 text-brand-cyan animate-pulse" />
      <span className="text-sm font-bold text-white font-mono tracking-wide">{data.label}</span>
    </div>
    <span className="text-[11px] text-brand-cyan font-mono block mt-0.5">Distributed Storage Client • Quorum Router</span>
    <Handle type="source" position={Position.Bottom} className="!bg-brand-cyan !w-3 !h-3" />
  </div>
);

const nodeTypes = {
  storageNode: StorageNodeComponent,
  switchNode: SwitchNodeComponent,
  clientNode: ClientNodeComponent
};

export const ClusterTopology: React.FC<TopologyProps> = ({
  nodes,
  files,
  selectedFileId,
  onSelectNode,
  onSimulateFailure,
  onRestoreNode
}) => {
  const [filterRack, setFilterRack] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Find which nodes hold the selected file's replicas
  const highlightedNodeIds = useMemo(() => {
    if (!selectedFileId) return new Set<string>();
    const f = files.find((item) => item.file_id === selectedFileId);
    return new Set(f?.replica_locations || []);
  }, [selectedFileId, files]);

  // Construct React Flow Nodes and Edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const fnodes: Node[] = [
      {
        id: 'client_app',
        type: 'clientNode',
        position: { x: 420, y: 20 },
        data: { label: 'SelfHeal Client Application' }
      },
      {
        id: 'switch_rack_a',
        type: 'switchNode',
        position: { x: 180, y: 130 },
        data: { label: 'Rack Switch 1 (Rack-A)', subtitle: 'Subnet 10.0.1.0/24' }
      },
      {
        id: 'switch_rack_b',
        type: 'switchNode',
        position: { x: 660, y: 130 },
        data: { label: 'Rack Switch 2 (Rack-B)', subtitle: 'Subnet 10.0.2.0/24' }
      }
    ];

    const fedges: Edge[] = [
      {
        id: 'e_client_switch_a',
        source: 'client_app',
        target: 'switch_rack_a',
        animated: true,
        style: { stroke: '#06B6D4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06B6D4' }
      },
      {
        id: 'e_client_switch_b',
        source: 'client_app',
        target: 'switch_rack_b',
        animated: true,
        style: { stroke: '#06B6D4', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#06B6D4' }
      }
    ];

    // Filter nodes according to filters
    const filteredNodes = nodes.filter((n) => {
      if (filterRack !== 'ALL' && n.rack_id !== filterRack) return false;
      if (filterStatus !== 'ALL' && n.status !== filterStatus) return false;
      return true;
    });

    // Lay out Rack-A nodes on left, Rack-B on right
    const rackANodes = filteredNodes.filter((n) => n.rack_id === 'Rack-A');
    const rackBNodes = filteredNodes.filter((n) => n.rack_id === 'Rack-B');

    rackANodes.forEach((n, idx) => {
      const x = 50 + idx * 190;
      const y = 240 + (idx % 2 === 1 ? 140 : 0);
      fnodes.push({
        id: n.node_id,
        type: 'storageNode',
        position: { x, y },
        data: {
          node: n,
          isHighlighted: highlightedNodeIds.has(n.node_id),
          onSelect: () => onSelectNode(n),
          onFail: () => onSimulateFailure(n.node_id),
          onRestore: () => onRestoreNode(n.node_id)
        }
      });

      fedges.push({
        id: `e_sw_a_${n.node_id}`,
        source: 'switch_rack_a',
        target: n.node_id,
        animated: n.status === 'NORMAL',
        style: {
          stroke: n.status === 'FAIL-STOP' ? '#EF4444' : n.status === 'AT-RISK' ? '#F59E0B' : '#10B981',
          strokeWidth: highlightedNodeIds.has(n.node_id) ? 3 : 1.5,
          strokeDasharray: n.status === 'FAIL-STOP' ? '5,5' : undefined
        }
      });
    });

    rackBNodes.forEach((n, idx) => {
      const x = 540 + idx * 190;
      const y = 240 + (idx % 2 === 1 ? 140 : 0);
      fnodes.push({
        id: n.node_id,
        type: 'storageNode',
        position: { x, y },
        data: {
          node: n,
          isHighlighted: highlightedNodeIds.has(n.node_id),
          onSelect: () => onSelectNode(n),
          onFail: () => onSimulateFailure(n.node_id),
          onRestore: () => onRestoreNode(n.node_id)
        }
      });

      fedges.push({
        id: `e_sw_b_${n.node_id}`,
        source: 'switch_rack_b',
        target: n.node_id,
        animated: n.status === 'NORMAL',
        style: {
          stroke: n.status === 'FAIL-STOP' ? '#EF4444' : n.status === 'AT-RISK' ? '#F59E0B' : '#10B981',
          strokeWidth: highlightedNodeIds.has(n.node_id) ? 3 : 1.5,
          strokeDasharray: n.status === 'FAIL-STOP' ? '5,5' : undefined
        }
      });
    });

    return { flowNodes: fnodes, flowEdges: fedges };
  }, [nodes, highlightedNodeIds, filterRack, filterStatus, onSelectNode, onSimulateFailure, onRestoreNode]);

  return (
    <div className="bg-navy-900 rounded-xl border border-navy-800 overflow-hidden shadow-lg flex flex-col h-[520px]">
      {/* Topology Header & Filters */}
      <div className="px-4 py-3 bg-navy-850/90 border-b border-navy-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-cyan" />
            Cluster Network Topology (2 Racks • 6 Simulated Nodes)
          </h3>
          <p className="text-xs text-slate-400">
            Interactive fault-domain graph with live status, latency links, and replica highlights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Rack Filter */}
          <select
            value={filterRack}
            onChange={(e) => setFilterRack(e.target.value)}
            className="text-xs bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-brand-cyan"
          >
            <option value="ALL">All Racks</option>
            <option value="Rack-A">Rack-A Only</option>
            <option value="Rack-B">Rack-B Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-navy-950 border border-navy-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-brand-cyan"
          >
            <option value="ALL">All States</option>
            <option value="NORMAL">Normal Only</option>
            <option value="AT-RISK">At-Risk Only</option>
            <option value="FAIL-STOP">Fail-Stop Only</option>
          </select>
        </div>
      </div>

      {/* React Flow Container */}
      <div className="flex-1 w-full h-full bg-[#080d19]">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-navy-900 !border-navy-700 !text-slate-300" />
        </ReactFlow>
      </div>
    </div>
  );
};

