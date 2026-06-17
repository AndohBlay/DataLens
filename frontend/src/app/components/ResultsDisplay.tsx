import { Package } from 'lucide-react';
import * as XLSX from 'xlsx';
import AttributeCard from './AttributeCard';

interface ExtractedData {
  barcode: string | null;
  category_type: string | null;
  segment_type: string | null;
  manufacturer: string | null;
  brand: string | null;
  product_name: string | null;
  weight: string | null;
  unit: string | null;
  packaging_type: string | null;
  country_origin: string | null;
  marketing_messages: string | null;
}

interface ConfidenceScores {
  barcode: 'high' | 'low';
  category_type: 'high' | 'low';
  segment_type: 'high' | 'low';
  manufacturer: 'high' | 'low';
  brand: 'high' | 'low';
  product_name: 'high' | 'low';
  weight_and_unit: 'high' | 'low';
  packaging_type: 'high' | 'low';
  country_origin: 'high' | 'low';
  marketing_messages: 'high' | 'low';
}

interface ExtractionResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
}

interface ResultsDisplayProps {
  extractionResult: ExtractionResult | null;
  isProcessing: boolean;
}

export default function ResultsDisplay({ extractionResult, isProcessing }: ResultsDisplayProps) {

  if (!extractionResult && !isProcessing) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center h-full flex flex-col items-center justify-center min-h-64">
        <Package className="w-16 h-16 sm:w-24 sm:h-24 text-slate-300 mb-6" />
        <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">No Results Yet</h3>
        <p className="text-slate-600 text-sm sm:text-base">Upload a product image to see extracted IMDB attributes</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center h-full flex flex-col items-center justify-center min-h-64">
        <div className="animate-pulse">
          <Package className="w-16 h-16 sm:w-24 sm:h-24 text-blue-400 mb-6" />
          <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">Processing...</h3>
          <p className="text-slate-600 text-sm sm:text-base">Extracting product attributes with AI</p>
        </div>
      </div>
    );
  }

  if (!extractionResult) return null;

  const { extracted_data, confidence_scores } = extractionResult;

  const attributes = [
    { label: 'Barcode', key: 'barcode', value: extracted_data.barcode, confidence: confidence_scores.barcode },
    { label: 'Category Type', key: 'category_type', value: extracted_data.category_type, confidence: confidence_scores.category_type },
    { label: 'Segment Type', key: 'segment_type', value: extracted_data.segment_type, confidence: confidence_scores.segment_type },
    { label: 'Manufacturer', key: 'manufacturer', value: extracted_data.manufacturer, confidence: confidence_scores.manufacturer },
    { label: 'Brand', key: 'brand', value: extracted_data.brand, confidence: confidence_scores.brand },
    { label: 'Product Name', key: 'product_name', value: extracted_data.product_name, confidence: confidence_scores.product_name },
    {
      label: 'Weight & Unit',
      key: 'weight_and_unit',
      value: extracted_data.weight && extracted_data.unit ? `${extracted_data.weight} ${extracted_data.unit}` : null,
      confidence: confidence_scores.weight_and_unit,
    },
    { label: 'Packaging Type', key: 'packaging_type', value: extracted_data.packaging_type, confidence: confidence_scores.packaging_type },
    { label: 'Country of Origin', key: 'country_origin', value: extracted_data.country_origin, confidence: confidence_scores.country_origin },
    { label: 'Marketing Messages', key: 'marketing_messages', value: extracted_data.marketing_messages, confidence: confidence_scores.marketing_messages },
  ];

  const highConfidenceCount = Object.values(confidence_scores).filter((s) => s === 'high').length;
  const percentageScore = (highConfidenceCount / 10) * 100;

  let status: 'passed' | 'failed' | 'warning';
  let statusColor: string;
  let statusBgColor: string;
  let statusBorderColor: string;
  let statusText: string;

  if (percentageScore >= 85) {
    status = 'passed';
    statusColor = 'text-green-700';
    statusBgColor = 'bg-green-100';
    statusBorderColor = 'border-green-300';
    statusText = 'PASSED';
  } else if (percentageScore < 50) {
    status = 'failed';
    statusColor = 'text-red-700';
    statusBgColor = 'bg-red-100';
    statusBorderColor = 'border-red-300';
    statusText = 'FAILED';
  } else {
    status = 'warning';
    statusColor = 'text-amber-700';
    statusBgColor = 'bg-amber-100';
    statusBorderColor = 'border-amber-300';
    statusText = 'NEEDS REVIEW';
  }

  const buildRows = () =>
    attributes.map((attr) => ({
      Attribute: attr.label,
      Value: attr.value ?? '',
      Confidence: attr.confidence === 'high' ? 'High' : 'Low',
    }));

  const handleExportExcel = () => {
    const rows = buildRows();
    const ws = XLSX.utils.json_to_sheet([...rows, {}, { Attribute: 'Overall Score', Value: `${percentageScore}%`, Confidence: statusText }]);
    ws['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extraction Results');
    XLSX.writeFile(wb, 'product-extraction.xlsx');
  };

return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        {/* Status Header */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">Extracted Attributes</h2>

          {/* Score Card */}
          <div className={`${statusBgColor} rounded-lg p-3 sm:p-4 border-2 ${statusBorderColor}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className={`text-3xl sm:text-5xl font-bold mb-1 ${statusColor}`}>{percentageScore}%</div>
                <div className="text-xs sm:text-sm text-slate-600">{highConfidenceCount}/10 High Confidence Attributes</div>
              </div>
              <div className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-lg ${statusBgColor} ${statusColor} border-2 ${
                status === 'passed' ? 'border-green-400' : status === 'failed' ? 'border-red-400' : 'border-amber-400'
              }`}>
                {statusText}
              </div>
            </div>
          </div>

          {/* Threshold Info */}
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>≥85% Pass</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span>50–84% Review</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>&lt;50% Fail</span></div>
          </div>
        </div>

        {/* Attribute Cards */}
        <div className="space-y-2 sm:space-y-3">
          {attributes.map((attr, index) => (
            <AttributeCard key={index} label={attr.label} value={attr.value} confidence={attr.confidence} />
          ))}
        </div>

      </div>
    </>
  );
}
