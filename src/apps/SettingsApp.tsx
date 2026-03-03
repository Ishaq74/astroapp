import React, { useState, useEffect } from 'react';
import { useFsRead } from '../hooks/useFs';
import { Settings, ChevronRight, RefreshCw, Server, Code, Globe, ChevronLeft, GitBranch, Clock, Hash, Package, ArrowLeft } from 'lucide-react';
import { execCmd } from '../hooks/useFs';

export default function SettingsApp({ onClose }: { onClose?: () => void }) {
  const { data: pkgData, loading: pkgLoading, error: pkgError } = useFsRead('package.json');
  const { data: astroData, loading: astroLoading, error: astroError } = useFsRead('astro.config.mjs');
  const [activeTab, setActiveTab] = useState('general');
  const [view, setView] = useState<'main' | 'dependencies' | 'scripts'>('main');
  const [gitInfo, setGitInfo] = useState<{ branch: string, hash: string, date: string } | null>(null);
  const [gitLoading, setGitLoading] = useState(false);

  const fetchGitInfo = async () => {
    setGitLoading(true);
    try {
      const branchRes = await execCmd('git', ['branch', '--show-current']);
      const logRes = await execCmd('git', ['log', '-1', '--format=%h|%cd', '--date=short']);
      
      const branch = branchRes.stdout.trim();
      const [hash, date] = logRes.stdout.trim().split('|');
      setGitInfo({ branch, hash, date });
    } catch (e) {
      console.error(e);
    } finally {
      setGitLoading(false);
    }
  };

  useEffect(() => {
    fetchGitInfo();
  }, []);

  if (pkgLoading || astroLoading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (pkgError) return <div className="p-4 text-red-500 text-sm">{pkgError}</div>;

  let pkg: any = {};
  try {
    pkg = JSON.parse(pkgData?.content || '{}');
  } catch (e) {}

  const scripts = Object.keys(pkg.scripts || {});
  const dependencies = Object.entries(pkg.dependencies || {});
  const devDependencies = Object.entries(pkg.devDependencies || {});
  
  // Try to extract locales from astro.config.mjs
  let locales = ['fr', 'en', 'es', 'ar']; // fallback
  try {
    const astroContent = astroData?.content || '';
    const localesMatch = astroContent.match(/locales:\s*\[(.*?)\]/);
    if (localesMatch && localesMatch[1]) {
      locales = localesMatch[1].split(',').map((l: string) => l.replace(/['"]/g, '').trim()).filter(Boolean);
    }
  } catch (e) {}

  if (view === 'dependencies') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setView('main')} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-slate-500" />
            Dependencies
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dependencies ({dependencies.length})
            </div>
            <div className="divide-y divide-slate-100">
              {dependencies.map(([name, version]) => (
                <div key={name} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{String(version)}</span>
                </div>
              ))}
              {dependencies.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No dependencies found</div>}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dev Dependencies ({devDependencies.length})
            </div>
            <div className="divide-y divide-slate-100">
              {devDependencies.map(([name, version]) => (
                <div key={name} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{String(version)}</span>
                </div>
              ))}
              {devDependencies.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No dev dependencies found</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'scripts') {
    return (
      <div className="h-full flex flex-col bg-slate-50">
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setView('main')} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Code size={18} className="text-orange-500" />
            NPM Scripts
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {scripts.map(script => (
                <div key={script} className="p-4 flex flex-col gap-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">{script}</span>
                    <button 
                      onClick={() => execCmd('npm', ['run', script])}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
                    >
                      Run
                    </button>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 break-all">
                    {pkg.scripts[script]}
                  </div>
                </div>
              ))}
              {scripts.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">No scripts found</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        </div>
        <button onClick={fetchGitInfo} disabled={gitLoading} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-50">
          <RefreshCw size={16} className={gitLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile / Repo Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {pkg.name ? pkg.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div className="flex-1">
            <h2 className="font-medium text-slate-900">{pkg.name || 'Concordia OS'}</h2>
            <p className="text-xs text-slate-500">github.com/ishaq74/concordia</p>
          </div>
        </div>

        {/* Git Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
              <GitBranch size={16} className="text-slate-500" />
              Repository Status
            </h3>
            {gitLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <GitBranch size={12} /> Branch
              </div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {gitInfo?.branch || '...'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Hash size={12} /> Commit
              </div>
              <div className="text-sm font-mono text-slate-900 truncate">
                {gitInfo?.hash || '...'}
              </div>
            </div>
            <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={12} /> Last Updated
              </div>
              <div className="text-sm font-medium text-slate-900">
                {gitInfo?.date || '...'}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <SettingRow icon={<Server size={18} className="text-blue-500" />} title="Astro Config" subtitle="site, output, adapter" />
          <SettingRow icon={<Globe size={18} className="text-green-500" />} title="Languages (i18n)" subtitle={locales.join(', ')} />
          <SettingRow 
            icon={<Package size={18} className="text-slate-500" />} 
            title="Dependencies" 
            subtitle={`${dependencies.length} deps, ${devDependencies.length} devDeps`} 
            onClick={() => setView('dependencies')}
            border={false} 
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-medium text-sm text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code size={18} className="text-orange-500" />
              NPM Scripts ({scripts.length})
            </div>
            <button onClick={() => setView('scripts')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {scripts.slice(0, 3).map(script => (
              <div key={script} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => setView('scripts')}>
                <span className="text-sm font-medium text-slate-700">{script}</span>
                <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">{pkg.scripts[script]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ icon, title, subtitle, border = true, onClick }: { icon: React.ReactNode, title: string, subtitle: string, border?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-400" />
    </button>
  );
}
