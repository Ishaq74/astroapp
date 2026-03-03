import React, { useState } from 'react';
import { useFsScan, useFsRead, execCmd } from '../hooks/useFs';
import { Database, Table, Play, FileJson, History, ChevronLeft, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';

export default function DataApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('schemas');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { files, loading, error } = useFsScan();

  if (loading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  const schemas = files.filter(f => f.startsWith('src/database/schemas/') && f.endsWith('.schema.ts')).map(f => f.split('/').pop()!);
  const seeds = files.filter(f => f.startsWith('src/database/data/') && f.endsWith('.data.ts')).map(f => f.split('/').pop()!);
  const migrations = files.filter(f => f.startsWith('src/database/migrations/') && f.endsWith('.sql')).map(f => f.split('/').pop()!);
  const loaders = files.filter(f => f.startsWith('src/database/loaders/') && f.endsWith('.ts')).map(f => f.split('/').pop()!);

  if (selectedFile) {
    return <FileViewer file={selectedFile} onBack={() => setSelectedFile(null)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Data</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'schemas'} onClick={() => setActiveTab('schemas')} icon={<Table size={14} />} label="Schemas" />
          <TabButton active={activeTab === 'seeds'} onClick={() => setActiveTab('seeds')} icon={<Play size={14} />} label="Seeds" />
          <TabButton active={activeTab === 'migrations'} onClick={() => setActiveTab('migrations')} icon={<History size={14} />} label="Migrations" />
          <TabButton active={activeTab === 'loaders'} onClick={() => setActiveTab('loaders')} icon={<FileJson size={14} />} label="Loaders" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'schemas' && <SchemasView schemas={schemas} onSelect={(f) => setSelectedFile(`src/database/schemas/${f}`)} />}
        {activeTab === 'seeds' && <SeedsView seeds={seeds} onSelect={(f) => setSelectedFile(`src/database/data/${f}`)} />}
        {activeTab === 'migrations' && <MigrationsView migrations={migrations} onSelect={(f) => setSelectedFile(`src/database/migrations/${f}`)} />}
        {activeTab === 'loaders' && <LoadersView loaders={loaders} onSelect={(f) => setSelectedFile(`src/database/loaders/${f}`)} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SchemasView({ schemas, onSelect }: { schemas: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {schemas.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No schemas found.</div>}
      {schemas.map(schema => (
        <div key={schema} onClick={() => onSelect(schema)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Table size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{schema}</div>
              <div className="text-xs text-slate-500">src/database/schemas/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function SeedsView({ seeds, onSelect }: { seeds: string[], onSelect: (f: string) => void }) {
  const [running, setRunning] = useState(false);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      await execCmd('npm', ['run', 'seed']);
      alert('Seeds executed successfully!');
    } catch (e: any) {
      alert('Failed to run seeds: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={handleRunAll}
        disabled={running}
        className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
        Run All Seeds
      </button>
      
      {seeds.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No seeds found.</div>}
      {seeds.map(seed => (
        <div key={seed} onClick={() => onSelect(seed)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
              <FileJson size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{seed}</div>
              <div className="text-xs text-slate-500">src/database/data/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function MigrationsView({ migrations, onSelect }: { migrations: string[], onSelect: (f: string) => void }) {
  const [running, setRunning] = useState(false);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      await execCmd('npm', ['run', 'migrate']);
      alert('Migrations executed successfully!');
    } catch (e: any) {
      alert('Failed to run migrations: ' + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <button 
        onClick={handleRunAll}
        disabled={running}
        className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
        Run Migrations
      </button>

      {migrations.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No migrations found.</div>}
      {migrations.map(migration => (
        <div key={migration} onClick={() => onSelect(migration)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
              <History size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{migration}</div>
              <div className="text-xs text-slate-500">src/database/migrations/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function LoadersView({ loaders, onSelect }: { loaders: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {loaders.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No loaders found.</div>}
      {loaders.map(loader => (
        <div key={loader} onClick={() => onSelect(loader)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
              <FileJson size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{loader}</div>
              <div className="text-xs text-slate-500">src/database/loaders/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function FileViewer({ file, onBack }: { file: string, onBack: () => void }) {
  const { data, loading, error } = useFsRead(file);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 truncate">{file.split('/').pop()}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-slate-400" /></div>}
        {error && <div className="text-red-500 text-sm p-4 bg-red-50 rounded-xl">{error}</div>}
        
        {!loading && !error && data && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 overflow-hidden">
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto">
              {data.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
