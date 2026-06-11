import { Upload, X, Loader2 } from 'lucide-react';
import { useRef } from 'react';

interface UploadZoneProps {
  onImageUpload: (file: File) => void;
  uploadedImage: string | null;
  onReset: () => void;
  isProcessing: boolean;
}

export default function UploadZone({
  onImageUpload,
  uploadedImage,
  onReset,
  isProcessing,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-slate-900 mb-4">Upload Product Image</h2>

      {!uploadedImage ? (
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-lg text-slate-600 mb-2">
            Drag and drop your product image here
          </p>
          <p className="text-sm text-slate-500 mb-4">or click to browse</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Select Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border-2 border-slate-200">
            <img
              src={uploadedImage}
              alt="Uploaded product"
              className="w-full h-auto object-contain max-h-96"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                  <p className="text-lg font-semibold">Analyzing image...</p>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onReset}
            className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
