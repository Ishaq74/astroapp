import React, { useState } from 'react';
import { useFsScan } from '../hooks/useFs';
import { Image as ImageIcon, Upload, Folder, Grid, List, ChevronLeft, RefreshCw } from 'lucide-react';

export default function ImagesApp({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState('library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { files, loading, error } = useFsScan();

  if (loading) return <div className="p-4 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>;
  if (error) return <div className="p-4 text-red-500 text-sm">{error}</div>;

  const images = files.filter(f => f.startsWith('public/images/') && /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f)).map(f => f.replace('public/images/', ''));

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1 -ml-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-semibold text-slate-900">Images</h1>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Folder size={14} />} label="Library" />
          <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} icon={<Upload size={14} />} label="Upload" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'library' && <LibraryView images={images} viewMode={viewMode} setViewMode={setViewMode} />}
        {activeTab === 'upload' && <UploadView />}
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

function LibraryView({ images, viewMode, setViewMode }: { images: string[], viewMode: 'grid' | 'list', setViewMode: (mode: 'grid' | 'list') => void }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">public/images/</span>
        <div className="flex gap-2 text-slate-400">
          <Grid size={16} className={`cursor-pointer hover:text-slate-900 ${viewMode === 'grid' ? 'text-slate-900' : ''}`} onClick={() => setViewMode('grid')} />
          <List size={16} className={`cursor-pointer hover:text-slate-900 ${viewMode === 'list' ? 'text-slate-900' : ''}`} onClick={() => setViewMode('list')} />
        </div>
      </div>

      {images.length === 0 && <div className="text-sm text-slate-500 text-center mt-8">No images found.</div>}
      <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
        {images.map(img => (
          <div key={img} className={`bg-white rounded-2xl p-3 shadow-sm border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer group ${viewMode === 'grid' ? 'flex flex-col gap-2' : 'flex items-center gap-3'}`}>
            <div className={`${viewMode === 'grid' ? 'aspect-square' : 'w-12 h-12 shrink-0'} bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-slate-200 transition-colors overflow-hidden relative`}>
              <img 
                src={`/api/fs/raw?path=${encodeURIComponent('public/images/' + img)}`} 
                alt={img} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden absolute inset-0 flex items-center justify-center">
                <ImageIcon size={viewMode === 'grid' ? 32 : 20} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-900 truncate" title={img}>{img.split('/').pop()}</div>
              <div className="text-[10px] text-slate-500 truncate">{img.includes('/') ? img.split('/').slice(0, -1).join('/') : 'Image'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadView() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Upload failed');
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 border-dashed transition-colors ${success ? 'bg-green-50 text-green-500 border-green-200' : error ? 'bg-red-50 text-red-500 border-red-200' : 'bg-purple-50 text-purple-500 border-purple-200'}`}>
        {uploading ? <RefreshCw size={32} className="animate-spin" /> : success ? <ImageIcon size={32} /> : <Upload size={32} />}
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">{success ? 'Upload Complete' : error ? 'Upload Failed' : 'Upload Images'}</h3>
      <p className="text-sm text-slate-500 mb-8">{success ? 'Files have been uploaded successfully.' : error ? error : 'Select files to upload to public/images/ directory.'}</p>
      
      <label className={`w-full text-white rounded-xl py-3 font-medium text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center ${uploading ? 'bg-slate-400' : 'bg-slate-900 hover:bg-slate-800'}`}>
        {uploading ? 'Uploading...' : 'Select Files'}
        <input type="file" className="hidden" multiple accept="image/*" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}
