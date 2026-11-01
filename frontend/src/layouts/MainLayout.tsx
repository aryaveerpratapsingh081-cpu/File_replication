import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';
import { api } from '../services/api';
import { useClusterWebSocket } from '../services/websocket';
import { ClusterOverviewData, NodeData, FileData, SystemEvent } from '../types';

export const MainLayout: React.FC = () => {
  const [overview, setOverview] = useState<ClusterOverviewData | null>(null);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Refresh all core cluster data
  const refreshData = useCallback(async () => {
    try {
      const [ov, nds, fls, logData] = await Promise.all([
        api.getClusterOverview(),
        api.getNodes(),
        api.getFiles(),
        api.getLogs({ limit: 20 })
      ]);
      setOverview(ov);
      setNodes(nds);
      setFiles(fls);
      setEvents(logData.events || []);
    } catch (e) {
      console.error("Failed to load cluster state", e);
    }
  }, []);

  // Handle WebSocket live push events
  const handleWsMessage = useCallback((event: { type: string; data: any }) => {
    if (event.type === 'CLUSTER_UPDATE') {
      if (event.data.overview) setOverview(event.data.overview);
      if (event.data.nodes) setNodes(event.data.nodes);
    }
  }, []);

  const { isConnected } = useClusterWebSocket(handleWsMessage);

  // Polling fallback every 3 seconds to keep files/logs fresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleSimulateFailure = async (nodeId: string) => {
    try {
      await api.simulateFailure(nodeId);
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRestoreNode = async (nodeId: string) => {
    try {
      await api.restoreNode(nodeId);
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-950 text-slate-100">
      {/* Persistent Left Sidebar (6 items, collapsible) */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          overview={overview}
          isConnected={isConnected}
          onRefresh={refreshData}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{
            overview,
            nodes,
            files,
            events,
            onRefresh: refreshData,
            onSimulateFailure: handleSimulateFailure,
            onRestoreNode: handleRestoreNode
          }} />
        </main>
      </div>
    </div>
  );
};
