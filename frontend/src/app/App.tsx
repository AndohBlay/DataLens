import { useState } from 'react';
import { Eye, Trash2, BarChart2, Download, X } from 'lucide-react';
import UploadZone from './components/UploadZone';
import ResultsDisplay from './components/ResultsDisplay';
import {
  extractProduct,
  fetchRecords,
  fetchStats,
  clearRecords,
  exportExcel,
  exportCsv,
  type ExtractionResult,
  type BackendRecord,
  type SessionStats,
} from './api';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<null | 'records' | 'stats' | 'export'>(null);
  const [records, setRecords] = useState<BackendRecord[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const handleImageUpload = async (files: File[]) => {
    const capped = files.slice(0, 10);
    setUploadedImages(capped.map(f => URL.createObjectURL(f)));
    setResult(null);
    setError(null);
    setIsProcessing(true);
    try {
      setResult(await extractProduct(capped));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    uploadedImages.forEach(url => URL.revokeObjectURL(url));
    setUploadedImages([]);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const openRecords = async () => {
    setModal('records'); setModalLoading(true); setModalError(null);
    try { setRecords(await fetchRecords()); }
    catch (err) { setModalError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setModalLoading(false); }
  };

  const openStats = async () => {
    setModal('stats'); setModalLoading(true); setModalError(null);
    try { setStats(await fetchStats()); }
    catch (err) { setModalError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setModalLoading(false); }
  };

  // Clears both the frontend state AND the backend database
  const handleClear = async () => {
    if (!confirm('Delete all records from the database? This cannot be undone.')) return;
    try {
      await clearRecords();
      handleReset();
      alert('All records deleted.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete records');
    }
  };

  const openExport = async () => {
    setModal('export'); setModalLoading(true); setModalError(null);
    try { setRecords(await fetchRecords()); }
    catch (err) { setModalError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setModalLoading(false); }
  };

  const handleExport = async (fmt: 'excel' | 'csv') => {
    try {
      if (fmt === 'excel') await exportExcel(records);
      else await exportCsv(records);
      setModal(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2 sm:mb-4">
            Product Image to IMDB Extractor
          </h1>
          <p className="text-sm sm:text-lg lg:text-xl text-slate-600 px-2">
            Upload multiple images of the same product — AI combines them into one record
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:hidden">
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImages={uploadedImages}
              onReset={handleReset}
              isProcessing={isProcessing}
            />
          </div>
          <div>
            <ResultsDisplay extractionResult={result} isProcessing={isProcessing} />
          </div>
          <div className="hidden lg:block">
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImages={uploadedImages}
              onReset={handleReset}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={openRecords} className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold text-sm">
            <Eye className="w-4 h-4" /> View Records
          </button>
          <button onClick={handleClear} className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm">
            <Trash2 className="w-4 h-4" /> Delete All
          </button>
          <button onClick={openStats} className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-semibold text-sm">
            <BarChart2 className="w-4 h-4" /> View Stats
          </button>
          <button onClick={openExport} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold text-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {modal === 'records' && (
        <Modal title={`Session Records (${records.length})`} onClose={() => setModal(null)}>
          {modalLoading && <p className="text-slate-500 text-sm">Loading…</p>}
          {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
          {!modalLoading && !modalError && records.length === 0 && (
            <p className="text-slate-500 text-sm">No records yet.</p>
          )}
          {records.map((r, i) => (
            <div key={r.record_id ?? i} className="mb-3 border border-slate-200 rounded-lg p-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-800">{r.product_name ?? 'Unknown product'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.flagged_for_review ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {r.confidence}% · {r.flagged_for_review ? 'Review' : 'OK'}
                </span>
              </div>
              <div className="text-slate-500 space-y-0.5">
                {r.brand && <div>Brand: {r.brand}</div>}
                {r.barcode && <div>Barcode: {r.barcode}</div>}
                {'image_count' in r && <div className="text-xs">{(r as any).image_count} image(s) used</div>}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {modal === 'stats' && (
        <Modal title="Session Stats" onClose={() => setModal(null)}>
          {modalLoading && <p className="text-slate-500 text-sm">Loading…</p>}
          {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
          {stats && !modalLoading && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Records', value: stats.total },
                { label: 'Flagged for Review', value: stats.flagged },
                { label: 'Duplicates', value: stats.duplicates },
                { label: 'Avg Confidence', value: `${Math.round(stats.avg_confidence ?? 0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
                  <div className="text-sm text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'export' && (
        <Modal title="Export Records" onClose={() => setModal(null)}>
          {modalLoading && <p className="text-slate-500 text-sm">Loading…</p>}
          {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
          {!modalLoading && !modalError && (
            <>
              <p className="text-slate-600 text-sm mb-6">{records.length} record{records.length !== 1 ? 's' : ''} ready to export.</p>
              <div className="flex gap-3">
                <button onClick={() => handleExport('excel')} className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold text-sm transition-colors">
                  Download Excel (.xlsx)
                </button>
                <button onClick={() => handleExport('csv')} className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-semibold text-sm transition-colors">
                  Download CSV
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}