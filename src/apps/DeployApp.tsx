import React, { useState, useEffect } from 'react';
import { Rocket, Play, Terminal, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, Settings, Package } from 'lucide-react';
import { execCmd } from '../hooks/useFs';

export default function DeployApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('setup');
  const [packageManager, setPackageManager] = useState(localStorage.getItem('packageManager') || 'npm');

  useEffect(() => {
    localStorage.setItem('packageManager', packageManager);
  }, [packageManager]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Deploy</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'setup'} onClick={() => setActiveTab('setup')} icon={<Settings size={14} />} label="Setup" />
          <TabButton active={activeTab === 'install'} onClick={() => setActiveTab('install')} icon={<Package size={14} />} label="Install" />
          <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} icon={<Play size={14} />} label="Preview" />
          <TabButton active={activeTab === 'test'} onClick={() => setActiveTab('test')} icon={<CheckCircle2 size={14} />} label="Test" />
          <TabButton active={activeTab === 'deploy'} onClick={() => setActiveTab('deploy')} icon={<Rocket size={14} />} label="Deploy" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                <Settings size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1 text-center">Configuration</h3>
              <p className="text-sm text-slate-500 mb-6 text-center">Choose your preferred package manager for running commands.</p>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${packageManager === 'npm' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${packageManager === 'npm' ? 'border-indigo-500' : 'border-slate-300'}`}>
                      {packageManager === 'npm' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    </div>
                    <span className="font-medium text-slate-700">npm</span>
                  </div>
                  <input type="radio" name="pm" value="npm" checked={packageManager === 'npm'} onChange={() => setPackageManager('npm')} className="hidden" />
                </label>
                
                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${packageManager === 'pnpm' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${packageManager === 'pnpm' ? 'border-indigo-500' : 'border-slate-300'}`}>
                      {packageManager === 'pnpm' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                    </div>
                    <span className="font-medium text-slate-700">pnpm</span>
                  </div>
                  <input type="radio" name="pm" value="pnpm" checked={packageManager === 'pnpm'} onChange={() => setPackageManager('pnpm')} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'install' && <ActionView action={`${packageManager === 'pnpm' ? 'npx pnpm' : 'npm'} install`} description="Install project dependencies" />}
        {activeTab === 'preview' && <PreviewView packageManager={packageManager} />}
        {activeTab === 'test' && <ActionView action={`${packageManager === 'pnpm' ? 'npx pnpm' : 'npm'} run test`} description="Run test suite" />}
        {activeTab === 'deploy' && <ActionView action={`${packageManager === 'pnpm' ? 'npx pnpm' : 'npm'} run build`} description="Build site for production" />}
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

function PreviewView({ packageManager }: { packageManager: string }) {
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check initial status
    fetch('/api/dev-server', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.running) setStatus('running');
      })
      .catch(() => {});
      
    return () => {
      // Stop server when unmounting
      fetch('/api/dev-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      }).catch(() => {});
    };
  }, []);

  const handleStart = async () => {
    setStatus('starting');
    setError(null);
    try {
      const res = await fetch('/api/dev-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', packageManager })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start server');
      setStatus('running');
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleStop = async () => {
    try {
      await fetch('/api/dev-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      setStatus('stopped');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-slate-900">Live Preview</h3>
            <p className="text-sm text-slate-500">Run the development server to preview your site.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500' : status === 'starting' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-sm font-medium text-slate-600 capitalize">{status}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          {status !== 'running' && status !== 'starting' && (
            <button
              onClick={handleStart}
              className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Start Dev Server
            </button>
          )}
          
          {status === 'starting' && (
            <button
              disabled
              className="flex-1 bg-slate-100 text-slate-400 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <RefreshCw size={16} className="animate-spin" />
              Starting...
            </button>
          )}

          {status === 'running' && (
            <button
              onClick={handleStop}
              className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              Stop Server
            </button>
          )}
        </div>
      </div>

      {status === 'running' && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
          <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-2">
            <div className="flex gap-1.5 ml-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="bg-white rounded-md px-3 py-1 text-xs text-slate-500 flex-1 text-center mx-4 select-all">
              localhost:4321
            </div>
            <button onClick={() => {
              const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <RefreshCw size={14} />
            </button>
          </div>
          <iframe
            id="preview-iframe"
            src="/preview-site"
            className="w-full h-full border-0 bg-white"
            title="Live Preview"
          />
        </div>
      )}
    </div>
  );
}

function ActionView({ action, description }: { action: string, description: string }) {
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const parts = action.split(' ');
      const res = await execCmd(parts[0], parts.slice(1), '.');
      setOutput(res.stdout || res.stderr || 'Command executed successfully.');
    } catch (err: any) {
      setError(err.message);
      setOutput(err.stdout || err.stderr || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
          <Terminal size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-1 font-mono text-sm">{action}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        
        <button 
          onClick={handleExecute}
          disabled={loading}
          className="w-full bg-slate-900 text-white rounded-xl py-3 font-medium text-sm shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? 'Executing...' : 'Run Command'}
        </button>
      </div>

      {(output || error) && (
        <div className="bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-800 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-mono text-slate-400">Terminal Output</span>
          </div>
          <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
            {error && <div className="text-red-400 mb-2">{error}</div>}
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
