import { CheckCircle2, AlertCircle } from 'lucide-react';

interface AttributeCardProps {
  label: string;
  value: string | null;
  confidence: 'high' | 'low';
}

export default function AttributeCard({ label, value, confidence }: AttributeCardProps) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            {confidence === 'high' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className="text-base text-slate-900 font-medium">
            {value || (
              <span className="text-slate-400 italic">Not detected</span>
            )}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            confidence === 'high'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {confidence === 'high' ? 'High' : 'Low'}
        </div>
      </div>
    </div>
  );
}
