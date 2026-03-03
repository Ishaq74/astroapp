import React, { useState, useEffect } from 'react';
import { useFsScan, useFsRead } from '../hooks/useFs';
import { FileText, BookOpen, PenTool, LayoutTemplate, ChevronRight, ChevronLeft, RefreshCw, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Markdown from 'react-markdown';

export default function NotesApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('specs');
  const [selectedFile, setSelectedFile] = useState<{ path: string, type: 'md' | 'img' } | null>(null);
  const { files, loading, error } = useFsScan();

  if (loading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  const specs = files.filter(f => f.endsWith('.md') && !f.includes('/')).map(f => f.split('/').pop()!);
  const instructions = files.filter(f => f.startsWith('instructions/') && f.endsWith('.md')).map(f => f.split('/').pop()!);
  const wireframes = files.filter(f => f.startsWith('public/wireframes/') || f.includes('wireframe')).map(f => f.split('/').pop()!);

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
          <h1 className="text-xl font-semibold text-slate-900">Notes</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'specs'} onClick={() => setActiveTab('specs')} icon={<BookOpen size={14} />} label="Specs" />
          <TabButton active={activeTab === 'instructions'} onClick={() => setActiveTab('instructions')} icon={<PenTool size={14} />} label="Instructions" />
          <TabButton active={activeTab === 'wireframes'} onClick={() => setActiveTab('wireframes')} icon={<LayoutTemplate size={14} />} label="Wireframes" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'specs' && <SpecsView specs={specs} onSelect={(f) => setSelectedFile({ path: f, type: 'md' })} />}
        {activeTab === 'instructions' && <InstructionsView instructions={instructions} onSelect={(f) => setSelectedFile({ path: `instructions/${f}`, type: 'md' })} />}
        {activeTab === 'wireframes' && <WireframesView wireframes={wireframes} onSelect={(f) => setSelectedFile({ path: f.includes('/') ? f : `public/wireframes/${f}`, type: f.endsWith('.md') ? 'md' : 'img' })} />}
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

function SpecsView({ specs, onSelect }: { specs: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {specs.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No specs found.</div>}
      {specs.map(spec => (
        <div key={spec} onClick={() => onSelect(spec)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
              <FileText size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{spec}</div>
              <div className="text-xs text-slate-500">Root Directory</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function InstructionsView({ instructions, onSelect }: { instructions: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {instructions.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No instructions found.</div>}
      {instructions.map(inst => (
        <div key={inst} onClick={() => onSelect(inst)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
              <PenTool size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{inst}</div>
              <div className="text-xs text-slate-500">instructions/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function WireframesView({ wireframes, onSelect }: { wireframes: string[], onSelect: (f: string) => void }) {
  return (
    <div className="space-y-4">
      {wireframes.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No wireframes found.</div>}
      {wireframes.map(wireframe => (
        <div key={wireframe} onClick={() => onSelect(wireframe)} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
              <ImageIcon size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-slate-900">{wireframe}</div>
              <div className="text-xs text-slate-500">public/wireframes/</div>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      ))}
    </div>
  );
}

function FileViewer({ file, onBack }: { file: { path: string, type: 'md' | 'img' }, onBack: () => void }) {
  const { data, loading, error } = useFsRead(file.path);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 truncate">{file.path.split('/').pop()}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-slate-400" /></div>}
        {error && <div className="text-red-500 text-sm p-4 bg-red-50 rounded-xl">{error}</div>}
        
        {!loading && !error && data && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            {file.type === 'md' ? (
              <div className="prose prose-sm prose-slate max-w-none">
                <Markdown>{data.content}</Markdown>
              </div>
            ) : (
              <div className="flex justify-center">
                <img src={`/api/fs/raw?path=${encodeURIComponent(file.path)}`} alt={file.path} className="max-w-full rounded-lg" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
