import { useState } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import AttributeCard from './components/AttributeCard';
import UploadZone from './components/UploadZone';
import ResultsDisplay from './components/ResultsDisplay';

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
  country_of_origin: string | null;
  promotional_messages: string | null;
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
  country_of_origin: 'high' | 'low';
  promotional_messages: 'high' | 'low';
}

interface ExtractionResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
}

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setExtractionResult(null);
      // Simulate processing
      setIsProcessing(true);
      setTimeout(() => {
        // Mock extraction result - in production, this would call Claude API
        // this codebase is for demonstration purpose
        const mockResult: ExtractionResult = {
          extracted_data: {
            barcode: '5060411840029',
            category_type: 'Beverage',
            segment_type: 'Plant-based Milk',
            manufacturer: 'Oatly AB',
            brand: 'Oatly',
            product_name: 'Barista Edition Oat Milk',
            weight: '1g',
            unit: 'L',
            packaging_type: 'TetraPak',
            country_of_origin: 'SE',
            promotional_messages: 'Barista Edition, Dairy-Free, Vegan',
          },
          confidence_scores: {
            barcode: 'high',
            category_type: 'high',
            segment_type: 'high',
            manufacturer: 'high',
            brand: 'high',
            product_name: 'high',
            weight_and_unit: 'high',
            packaging_type: 'high',
            country_of_origin: 'low',
            promotional_messages: 'high',
          },
        };
        setExtractionResult(mockResult);
        setIsProcessing(false);
      }, 2000);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setExtractionResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2 sm:mb-4">
             IMDB Image Extractor
          </h1>
          <p className="text-sm sm:text-lg lg:text-xl text-slate-600 px-2">
            Upload a product image to extract retail attributes with AI-powered analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* On mobile: upload first, results below. On desktop: results left, upload right */}
          <div className="lg:hidden">
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
              onReset={handleReset}
              isProcessing={isProcessing}
            />
          </div>

          {/* Left Column - Results */}
          <div>
            <ResultsDisplay
              extractionResult={extractionResult}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Column - Upload (desktop only) */}
          <div className="hidden lg:block">
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImage={uploadedImage}
              onReset={handleReset}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
