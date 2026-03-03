import React, { useState } from 'react';
import { useFsRead, useFsScan } from '../hooks/useFs';
import { Palette, Layers, Box, Type, Search, ChevronRight, ChevronLeft, RefreshCw, Component, Folder, FileCode2 } from 'lucide-react';

export default function DesignApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('tokens');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { files, loading, error } = useFsScan();

  if (loading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  const themes = files.filter(f => f.startsWith('src/styles/components/') && f.endsWith('.css')).map(f => f.split('/').pop()!);
  const components = files.filter(f => f.startsWith('src/components/') && (f.endsWith('.astro') || f.endsWith('.tsx') || f.endsWith('.ts')));

  if (selectedFile) {
    return <ComponentDetailView componentPath={selectedFile} onBack={() => setSelectedFile(null)} />;
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
          <h1 className="text-xl font-semibold text-slate-900">Design</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'tokens'} onClick={() => setActiveTab('tokens')} icon={<Palette size={14} />} label="Tokens" />
          <TabButton active={activeTab === 'themes'} onClick={() => setActiveTab('themes')} icon={<Layers size={14} />} label="Themes" />
          <TabButton active={activeTab === 'components'} onClick={() => setActiveTab('components')} icon={<Box size={14} />} label="Components" />
          <TabButton active={activeTab === 'fonts'} onClick={() => setActiveTab('fonts')} icon={<Type size={14} />} label="Fonts" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tokens' && <TokensView />}
        {activeTab === 'themes' && <ThemesView themes={themes} onSelect={(f) => setSelectedFile(`src/styles/components/${f}`)} />}
        {activeTab === 'components' && <ComponentsView components={components} onSelect={setSelectedFile} />}
        {activeTab === 'fonts' && <FontsView />}
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

function TokensView() {
  const { data, loading, error } = useFsRead('src/styles/tokens/colors.css');

  if (loading) return <div className="text-sm text-slate-500 text-center mt-8">Loading tokens...</div>;
  if (error) return <div className="text-sm text-red-500 text-center mt-8">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search tokens..." 
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-medium text-sm text-slate-900">Colors (244 vars)</div>
        <div className="p-4 text-xs font-mono text-slate-600 bg-slate-50 whitespace-pre-wrap overflow-x-auto">
          {data?.content || 'No tokens found.'}
        </div>
      </div>
    </div>
  );
}

function ThemesView({ themes, onSelect }: { themes: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {themes.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No themes found.</div>}
      {themes.map(theme => (
        <button key={theme} onClick={() => onSelect(theme)} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${theme === 'modern.css' ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <Palette size={20} className={theme === 'modern.css' ? 'text-white' : 'text-slate-500'} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{theme}</div>
              <div className="text-xs text-slate-500">src/styles/components/{theme}</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      ))}
    </div>
  );
}

function ComponentsView({ components, onSelect }: { components: string[], onSelect: (f: string) => void }) {
  const [search, setSearch] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const normalizedComponents = components.map(c => ({
    fullPath: c,
    relPath: c.replace(/^src\/components\//, '')
  }));

  const filtered = normalizedComponents.filter(c => c.relPath.toLowerCase().includes(search.toLowerCase()));

  const currentPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
  const itemsInCurrentPath = normalizedComponents.filter(c => c.relPath.startsWith(currentPrefix));
  
  const folders = new Set<string>();
  const files: { name: string, fullPath: string }[] = [];

  itemsInCurrentPath.forEach(c => {
    const remainingPath = c.relPath.slice(currentPrefix.length);
    if (remainingPath.includes('/')) {
      folders.add(remainingPath.split('/')[0]);
    } else {
      files.push({ name: remainingPath, fullPath: c.fullPath });
    }
  });

  const sortedFolders = Array.from(folders).sort();
  const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search components..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-100 font-medium text-sm text-slate-900 flex items-center gap-2 bg-slate-50 overflow-x-auto scrollbar-hide">
          <button onClick={() => setCurrentPath([])} className={`hover:text-indigo-600 transition-colors ${currentPath.length === 0 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
            components
          </button>
          {currentPath.map((folder, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
              <button 
                onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                className={`hover:text-indigo-600 transition-colors whitespace-nowrap ${idx === currentPath.length - 1 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}
              >
                {folder}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {search ? (
            filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">No components found.</div>
            ) : (
              filtered.map(comp => (
                <button 
                  key={comp.fullPath} 
                  onClick={() => onSelect(comp.fullPath)} 
                  className="w-full p-3 px-4 flex items-center justify-between hover:bg-indigo-50/50 text-left group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                      <Component size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{comp.relPath.split('/').pop()}</span>
                      <span className="text-[10px] text-slate-400">{comp.relPath}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))
            )
          ) : (
            <>
              {sortedFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="p-4 text-sm text-slate-500 text-center">Empty directory.</div>
              )}
              
              {sortedFolders.map(folder => (
                <button 
                  key={folder} 
                  onClick={() => setCurrentPath([...currentPath, folder])} 
                  className="w-full p-3 px-4 flex items-center justify-between hover:bg-slate-50 text-left group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Folder size={14} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{folder}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}

              {sortedFiles.map(file => (
                <button 
                  key={file.fullPath} 
                  onClick={() => onSelect(file.fullPath)} 
                  className="w-full p-3 px-4 flex items-center justify-between hover:bg-slate-50 text-left group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 transition-colors">
                      <FileCode2 size={14} />
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{file.name}</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ComponentDetailView({ componentPath, onBack }: { componentPath: string, onBack: () => void }) {
  const { data, loading, error } = useFsRead(componentPath);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <ChevronLeft size={20} />
        </button>
        <div className="text-sm font-medium text-slate-900 truncate">{componentPath.split('/').pop()}</div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
        <div className="p-3 border-b border-slate-100 bg-slate-50 text-xs text-slate-500 font-mono truncate">
          {componentPath}
        </div>
        <div className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap">
          {loading ? (
            <div className="flex justify-center mt-8"><RefreshCw className="animate-spin text-slate-400" /></div>
          ) : error ? (
            <div className="text-red-500 text-center mt-8">{error}</div>
          ) : (
            data?.content || 'Empty file'
          )}
        </div>
      </div>
    </div>
  );
}

function FontsView() {
  const { data, loading, error } = useFsRead('src/styles/tokens/typography.css');

  if (loading) return <div className="text-sm text-slate-500 text-center mt-8">Loading typography...</div>;
  if (error) return <div className="text-sm text-red-500 text-center mt-8">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-medium text-sm text-slate-900 flex items-center gap-2">
          <Type size={16} className="text-pink-500" />
          Typography Tokens
        </div>
        <div className="p-4 text-xs font-mono text-slate-600 bg-slate-50 whitespace-pre-wrap overflow-x-auto">
          {data?.content || 'No typography tokens found.'}
        </div>
      </div>
    </div>
  );
}
