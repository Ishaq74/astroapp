import React, { useState, useEffect, useMemo } from 'react';
import { useFsScan, execCmd, fsWrite } from '../hooks/useFs';
import { Globe, Languages, AlertCircle, CheckCircle2, ChevronLeft, RefreshCw, Search, ChevronRight, FileText, Save, ArrowLeft, AlertTriangle, Folder, Type, FileCode2 } from 'lucide-react';

function flattenObject(ob: any): Record<string, string> {
  const toReturn: Record<string, string> = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if ((typeof ob[i]) === 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = String(ob[i]);
    }
  }
  return toReturn;
}

function unflattenObject(data: Record<string, string>): any {
  const result: any = {};
  for (const key in data) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = data[key];
  }
  return result;
}

export default function I18nApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('translations');
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const { files, loading, error } = useFsScan();

  const langs = useMemo(() => files.filter(f => f.startsWith('src/i18n/') && f.endsWith('.json')).map(f => f.split('/').pop()!), [files]);

  if (loading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  if (selectedLang) {
    return <TranslationEditor lang={selectedLang} langs={langs} onBack={() => setSelectedLang(null)} />;
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
          <h1 className="text-xl font-semibold text-slate-900">i18n</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'translations'} onClick={() => setActiveTab('translations')} icon={<Languages size={14} />} label="Translations" />
          <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} icon={<Search size={14} />} label="Usage" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'translations' && <TranslationsView langs={langs} onSelect={setSelectedLang} />}
        {activeTab === 'usage' && <UsageView />}
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

function TranslationsView({ langs, onSelect }: { langs: string[], onSelect: (lang: string) => void }) {
  return (
    <div className="space-y-4">
      {langs.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No translations found.</div>}
      {langs.map(lang => (
        <div 
          key={lang} 
          onClick={() => onSelect(lang)}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold uppercase">
              {lang.split('.')[0]}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{lang}</div>
              <div className="text-xs text-slate-500">src/i18n/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function TranslationEditor({ lang, langs, onBack }: { lang: string, langs: string[], onBack: () => void }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [masterKeys, setMasterKeys] = useState<Set<string>>(new Set());
  const [sharedKeys, setSharedKeys] = useState<Set<string>>(new Set());
  const [referenceValues, setReferenceValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missing' | 'unshared'>('all');
  const [newKey, setNewKey] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/fs/read?path=src/i18n/${lang}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to read file');
        const parsed = JSON.parse(json.content || '{}');
        const flatData = flattenObject(parsed);
        setData(flatData);

        const allK = new Set<string>(Object.keys(flatData));
        const shared = new Set<string>();
        const refs: Record<string, string> = {};

        for (const l of langs) {
          if (l === lang) continue;
          const r = await fetch(`/api/fs/read?path=src/i18n/${l}`);
          if (r.ok) {
            const j = await r.json();
            const p = JSON.parse(j.content || '{}');
            const f = flattenObject(p);
            Object.keys(f).forEach(k => {
              allK.add(k);
              shared.add(k);
              if (!refs[k] && f[k]) {
                refs[k] = f[k];
              }
            });
          }
        }
        setMasterKeys(allK);
        setSharedKeys(shared);
        setReferenceValues(refs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lang, langs]);

  useEffect(() => {
    const errors: string[] = [];
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const k1 = keys[i];
        const k2 = keys[j];
        if (k1.startsWith(k2 + '.') || k2.startsWith(k1 + '.')) {
          errors.push(`Conflict: "${k1}" and "${k2}" cannot coexist.`);
        }
      }
    }
    setConflicts([...new Set(errors)]);
  }, [data]);

  const handleSave = async () => {
    if (conflicts.length > 0) {
      alert('Cannot save while there are conflicts. Please resolve them first.');
      return;
    }
    try {
      setSaving(true);
      const unflattened = unflattenObject(data);
      await fsWrite(`src/i18n/${lang}`, JSON.stringify(unflattened, null, 2), true);
      alert('Saved successfully!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateKey = (key: string, value: string) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddKey = () => {
    if (!newKey.trim() || data[newKey.trim()]) return;
    setData(prev => ({ [newKey.trim()]: '', ...prev }));
    setMasterKeys(prev => new Set(prev).add(newKey.trim()));
    setNewKey('');
    setShowNewKey(false);
  };

  const handleDeleteKey = (keyToDelete: string) => {
    if (confirm(`Are you sure you want to delete "${keyToDelete}"?`)) {
      setData(prev => {
        const newData = { ...prev };
        delete newData[keyToDelete];
        return newData;
      });
      setMasterKeys(prev => {
        const next = new Set(prev);
        next.delete(keyToDelete);
        return next;
      });
    }
  };

  const filteredKeys = Array.from(masterKeys).filter(k => {
    const matchesSearch = k.toLowerCase().includes(search.toLowerCase()) || 
                          (data[k] && data[k].toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (filter === 'missing') {
      return !data[k] || data[k].trim() === '';
    }
    if (filter === 'unshared') {
      return data[k] && data[k].trim() !== '' && !sharedKeys.has(k) && langs.length > 1;
    }
    return true;
  });

  const currentPrefix = currentPath.length > 0 ? currentPath.join('.') + '.' : '';
  const itemsInCurrentPath = filteredKeys.filter(k => k.startsWith(currentPrefix));

  const folders = new Set<string>();
  const files: string[] = [];

  itemsInCurrentPath.forEach(k => {
    const remainingPath = k.slice(currentPrefix.length);
    if (remainingPath.includes('.')) {
      folders.add(remainingPath.split('.')[0]);
    } else {
      files.push(k);
    }
  });

  const sortedFolders = Array.from(folders).sort();
  const sortedFiles = files.sort();

  const allRootFolders = new Set<string>();
  Array.from(masterKeys).forEach(k => {
    const parts = k.split('.');
    if (parts.length > 1) {
      allRootFolders.add(parts[0]);
    }
  });
  const sortedRootFolders = Array.from(allRootFolders).sort();

  const getMissingCount = (prefix: string) => {
    let count = 0;
    Array.from(masterKeys).forEach(k => {
      if (k.startsWith(prefix) && (!data[k] || data[k].trim() === '')) {
        count++;
      }
    });
    return count;
  };

  const getExtraneousCount = (prefix: string) => {
    if (langs.length <= 1) return 0;
    let count = 0;
    Array.from(masterKeys).forEach(k => {
      if (k.startsWith(prefix) && data[k] && data[k].trim() !== '' && !sharedKeys.has(k)) {
        count++;
      }
    });
    return count;
  };

  const autoFillMissing = (prefix: string) => {
    setData(prev => {
      const newData = { ...prev };
      Array.from(masterKeys).forEach(k => {
        if (k.startsWith(prefix) && (!newData[k] || newData[k].trim() === '')) {
          newData[k] = referenceValues[k] || k.split('.').pop() || '';
        }
      });
      return newData;
    });
  };

  if (loading) return <div className="h-full flex items-center justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold uppercase text-[10px]">
              {lang.split('.')[0]}
            </div>
            <h1 className="text-lg font-semibold text-slate-900">{lang}</h1>
          </div>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || conflicts.length > 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>

      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        {conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} />
              Conflicts Detected
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {conflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search keys..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <button 
              onClick={() => setShowNewKey(!showNewKey)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              + Add
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Keys
            </button>
            <button 
              onClick={() => setFilter('missing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === 'missing' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
            >
              <AlertCircle size={12} />
              Missing
            </button>
            {langs.length > 1 && (
              <button 
                onClick={() => setFilter('unshared')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === 'unshared' ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
              >
                <AlertCircle size={12} />
                Unshared
              </button>
            )}
          </div>
        </div>
        
        {showNewKey && (
          <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              placeholder="New key name (e.g. auth.login.title)" 
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddKey();
                  if (newKey.trim() && !data[newKey.trim()]) {
                    const parts = newKey.trim().split('.');
                    if (parts.length > 1) {
                      setCurrentPath(parts.slice(0, -1));
                    }
                  }
                }
              }}
              className="flex-1 px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
            <button 
              onClick={() => {
                handleAddKey();
                if (newKey.trim() && !data[newKey.trim()]) {
                  const parts = newKey.trim().split('.');
                  if (parts.length > 1) {
                    setCurrentPath(parts.slice(0, -1));
                  }
                }
              }}
              disabled={!newKey.trim() || !!data[newKey.trim()]}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Add Key
            </button>
          </div>
        )}

        {!search && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setCurrentPath([])}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                currentPath.length === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Folder size={14} />
              Root
            </button>
            {sortedRootFolders.map(folder => {
              const missingCount = getMissingCount(folder + '.');
              const extraneousCount = getExtraneousCount(folder + '.');
              const hasIssues = missingCount > 0 || extraneousCount > 0;
              return (
                <button 
                  key={folder}
                  onClick={() => setCurrentPath([folder])}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    currentPath[0] === folder ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Folder size={14} className={hasIssues ? (missingCount > 0 ? 'text-orange-500' : 'text-purple-500') : ''} />
                  {folder}
                  {hasIssues && (
                    <span className={`w-2 h-2 rounded-full ${missingCount > 0 ? 'bg-orange-500' : 'bg-purple-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        {!search && currentPath.length > 1 && (
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2 overflow-x-auto scrollbar-hide sticky top-0 z-10">
            <button onClick={() => setCurrentPath([currentPath[0]])} className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
              {currentPath[0]}
            </button>
            {currentPath.slice(1).map((folder, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                <button 
                  onClick={() => setCurrentPath(currentPath.slice(0, idx + 2))}
                  className={`text-sm hover:text-indigo-600 transition-colors whitespace-nowrap ${idx === currentPath.length - 2 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}
                >
                  {folder}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="p-4 space-y-3">
          {search ? (
            <>
              {filteredKeys.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-8">No translations found matching "{search}"</div>
              )}
              {filteredKeys.sort().map(key => {
                const isMissing = !data[key] || data[key].trim() === '';
                const isExtraneous = data[key] && data[key].trim() !== '' && !sharedKeys.has(key) && langs.length > 1;
                return (
                <div key={key} className={`bg-white p-3 rounded-xl border shadow-sm relative group ${isMissing ? 'border-orange-300 ring-1 ring-orange-100' : isExtraneous ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono text-slate-500">{key}</div>
                      {isMissing && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle size={10} />
                          Missing
                        </span>
                      )}
                      {isExtraneous && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" title="This key is not present in any other language">
                          <AlertCircle size={10} />
                          Unshared
                        </span>
                      )}
                      {isMissing && (
                        <button 
                          onClick={() => updateKey(key, referenceValues[key] || key.split('.').pop() || '')}
                          className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        >
                          Auto-fill
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteKey(key)}
                      className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <textarea 
                    value={data[key] || ''}
                    onChange={e => updateKey(key, e.target.value)}
                    placeholder={isMissing ? "Translation missing..." : ""}
                    className={`w-full p-2 bg-slate-50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y min-h-[60px] ${isMissing ? 'border-orange-200 placeholder:text-orange-300' : 'border-slate-200'}`}
                  />
                </div>
              )})}
            </>
          ) : (
            <>
              {sortedFolders.length === 0 && sortedFiles.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-8">Empty namespace.</div>
              )}
              
              <div className="grid gap-2">
                {currentPath.length > 0 && sortedFolders.map(folder => {
                  const folderPrefix = currentPrefix + folder + '.';
                  const missingCount = getMissingCount(folderPrefix);
                  const extraneousCount = getExtraneousCount(folderPrefix);
                  return (
                  <button 
                    key={folder} 
                    onClick={() => setCurrentPath([...currentPath, folder])} 
                    className="w-full p-3 px-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${missingCount > 0 ? 'bg-orange-50 text-orange-500 group-hover:bg-orange-100 group-hover:text-orange-600' : extraneousCount > 0 ? 'bg-purple-50 text-purple-500 group-hover:bg-purple-100 group-hover:text-purple-600' : 'bg-indigo-50 text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                        <Folder size={16} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{folder}</span>
                      {missingCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center gap-1">
                          <AlertCircle size={10} />
                          {missingCount} missing
                        </span>
                      )}
                      {extraneousCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center gap-1" title="Keys not present in other languages">
                          <AlertCircle size={10} />
                          {extraneousCount} unshared
                        </span>
                      )}
                      {missingCount === 0 && extraneousCount === 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          OK
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                  </button>
                )})}
              </div>

              {sortedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Translations</div>
                    {getMissingCount(currentPrefix) > 0 && (
                      <button 
                        onClick={() => autoFillMissing(currentPrefix)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        <RefreshCw size={12} />
                        Auto-fill missing
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    {sortedFiles.map(key => {
                      const isMissing = !data[key] || data[key].trim() === '';
                      const isExtraneous = data[key] && data[key].trim() !== '' && !sharedKeys.has(key) && langs.length > 1;
                      return (
                      <div key={key} className={`bg-white p-3 rounded-xl border shadow-sm relative group ${isMissing ? 'border-orange-300 ring-1 ring-orange-100' : isExtraneous ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <Type size={14} className={isMissing ? 'text-orange-400' : isExtraneous ? 'text-purple-400' : 'text-slate-400'} />
                            <div className="text-xs font-mono text-slate-600 font-medium">{key.slice(currentPrefix.length)}</div>
                            {isMissing && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <AlertCircle size={10} />
                                Missing
                              </span>
                            )}
                            {isExtraneous && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" title="This key is not present in any other language">
                                <AlertCircle size={10} />
                                Unshared
                              </span>
                            )}
                            {isMissing && (
                              <button 
                                onClick={() => updateKey(key, referenceValues[key] || key.split('.').pop() || '')}
                                className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                              >
                                Auto-fill
                              </button>
                            )}
                          </div>
                          <button 
                            onClick={() => handleDeleteKey(key)}
                            className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                        <textarea 
                          value={data[key] || ''}
                          onChange={e => updateKey(key, e.target.value)}
                          placeholder={isMissing ? "Translation missing..." : ""}
                          className={`w-full p-2 bg-slate-50 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y min-h-[60px] ${isMissing ? 'border-orange-200 placeholder:text-orange-300' : 'border-slate-200'}`}
                        />
                      </div>
                    )})}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageView() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{file: string, line: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  useEffect(() => {
    async function searchUsage() {
      setLoading(true);
      setError(null);
      try {
        const query = search ? search : 't(';
        const res = await execCmd('grep', ['-rI', query, 'src/'], '.');
        const lines = res.stdout.split('\n').filter(Boolean);
        const parsed = lines.map((line: string) => {
          const idx = line.indexOf(':');
          if (idx === -1) return null;
          return {
            file: line.substring(0, idx),
            line: line.substring(idx + 1).trim()
          };
        }).filter(Boolean) as {file: string, line: string}[];
        setResults(parsed);
      } catch (err: any) {
        if (err.message.includes('exit code 1')) {
          setResults([]); // No matches
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    
    const timeout = setTimeout(searchUsage, 500);
    return () => clearTimeout(timeout);
  }, [search]);

  const currentPrefix = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
  const itemsInCurrentPath = results.filter(r => r.file.startsWith(currentPrefix));

  const folders = new Set<string>();
  const files: { name: string, file: string, line: string }[] = [];

  itemsInCurrentPath.forEach(r => {
    const remainingPath = r.file.slice(currentPrefix.length);
    if (remainingPath.includes('/')) {
      folders.add(remainingPath.split('/')[0]);
    } else {
      files.push({ name: remainingPath, file: r.file, line: r.line });
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
          placeholder="Search translation key usage (e.g. 't(' or 'welcome')..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-100 font-medium text-sm text-slate-900 flex items-center gap-2 bg-slate-50 overflow-x-auto scrollbar-hide">
          <button onClick={() => setCurrentPath([])} className={`hover:text-indigo-600 transition-colors ${currentPath.length === 0 ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
            src
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
          {loading ? (
            <div className="p-8 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>
          ) : error ? (
            <div className="p-4 text-sm text-red-500 text-center">{error}</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center">No usages found.</div>
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

              {sortedFiles.map((file, i) => (
                <div key={i} className="p-3 px-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <FileCode2 size={14} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{file.name}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 bg-slate-100 p-2 rounded truncate ml-11">
                    {file.line}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
