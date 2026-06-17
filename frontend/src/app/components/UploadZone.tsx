import { Upload, X, Loader2, ScanLine, Sparkles } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface UploadZoneProps {
  onImageUpload: (files: File[]) => void;
  uploadedImages: string[];
  onReset: () => void;
  isProcessing: boolean;
}

export default function UploadZone({ onImageUpload, uploadedImages, onReset, isProcessing }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState('');

  useEffect(() => {
    if (!isProcessing) { setStage(''); return; }

    // Walk through stages to give user feedback
    setStage('Uploading images…');
    const t1 = setTimeout(() => setStage('Running OCR on all images…'), 1200);
    const t2 = setTimeout(() => setStage('Detecting barcodes…'), 3000);
    const t3 = setTimeout(() => setStage('Sending to AI for analysis…'), 5000);
    const t4 = setTimeout(() => setStage('Almost there…'), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isProcessing]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onImageUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onImageUpload(files);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Upload Product Images</h2>

      {uploadedImages.length === 0 ? (
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-slate-600 mb-2">Drag and drop up to 10 product images</p>
          <p className="text-sm text-slate-500 mb-4">All images are treated as one product</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Select Images
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {uploadedImages.map((src, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border-2 border-slate-200 aspect-square">
                <img src={src} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Progress stage indicator */}
          {isProcessing && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span className="text-blue-700 text-sm font-medium">{stage}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} · one product
            </span>
            <button
              onClick={onReset}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}