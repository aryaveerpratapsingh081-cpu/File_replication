import React from 'react';
import { BrowserRouter, Routes, Route, useOutletContext, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MyFilesPage } from './pages/MyFilesPage';
import { StorageServersPage } from './pages/StorageServersPage';
import { SelfHealingPage } from './pages/SelfHealingPage';
import { ExperimentsPage } from './pages/ExperimentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ClusterOverviewData, NodeData, FileData, SystemEvent } from './types';

interface ContextType {
  overview: ClusterOverviewData | null;
  nodes: NodeData[];
  files: FileData[];
  events: SystemEvent[];
  onRefresh: () => void;
  onSimulateFailure: (nodeId: string) => void;
  onRestoreNode: (nodeId: string) => void;
}

const DashboardRoute = () => {
  const ctx = useOutletContext<ContextType>();
  return (
    <DashboardPage
      overview={ctx.overview}
      nodes={ctx.nodes}
      files={ctx.files}
      events={ctx.events}
      onRefresh={ctx.onRefresh}
      onSimulateFailure={ctx.onSimulateFailure}
      onRestoreNode={ctx.onRestoreNode}
    />
  );
};

const FilesRoute = () => {
  const ctx = useOutletContext<ContextType>();
  return <MyFilesPage files={ctx.files} onRefresh={ctx.onRefresh} />;
};

const ServersRoute = () => {
  const ctx = useOutletContext<ContextType>();
  return (
    <StorageServersPage
      nodes={ctx.nodes}
      files={ctx.files}
      onRefresh={ctx.onRefresh}
      onSimulateFailure={ctx.onSimulateFailure}
      onRestoreNode={ctx.onRestoreNode}
    />
  );
};

const SelfHealingRoute = () => {
  const ctx = useOutletContext<ContextType>();
  return (
    <SelfHealingPage
      nodes={ctx.nodes}
      files={ctx.files}
      onRefresh={ctx.onRefresh}
      onSimulateFailure={ctx.onSimulateFailure}
      onRestoreNode={ctx.onRestoreNode}
    />
  );
};

const SettingsRoute = () => {
  const ctx = useOutletContext<ContextType>();
  return <SettingsPage onRefresh={ctx.onRefresh} />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Main 6 Core Routes */}
          <Route index element={<DashboardRoute />} />
          <Route path="files" element={<FilesRoute />} />
          <Route path="servers" element={<ServersRoute />} />
          <Route path="self-healing" element={<SelfHealingRoute />} />
          <Route path="experiments" element={<ExperimentsPage />} />
          <Route path="settings" element={<SettingsRoute />} />

          {/* Legacy & Synonym Route Redirects to Preserve Accessibility */}
          <Route path="overview" element={<Navigate to="/" replace />} />
          <Route path="nodes" element={<Navigate to="/servers" replace />} />
          <Route path="replication" element={<Navigate to="/self-healing" replace />} />
          <Route path="health" element={<Navigate to="/self-healing" replace />} />
          <Route path="recovery" element={<Navigate to="/self-healing" replace />} />
          <Route path="integrity" element={<Navigate to="/self-healing" replace />} />
          <Route path="simulation" element={<Navigate to="/self-healing" replace />} />
          <Route path="logs" element={<Navigate to="/settings" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
