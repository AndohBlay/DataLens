const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// ---- Types ------------------------------------------------------------------

export interface BackendRecord {
  record_id?: string;
  barcode?: string | null;
  category_type?: string | null;
  segment_type?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  product_name?: string | null;
  weight?: string | null;
  unit?: string | null;
  packaging_type?: string | null;
  country_of_origin?: string | null;
  promotional_messages?: string | null;
  confidence: number;
  field_validation: Record<string, { valid: boolean; confidence?: number }>;
  flagged_for_review: boolean;
  notes?: string;
  source_filename?: string;
  error?: string;
}

export interface ExtractedData {
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

export type ConfidenceLevel = "high" | "low";

export interface ConfidenceScores {
  barcode: ConfidenceLevel;
  category_type: ConfidenceLevel;
  segment_type: ConfidenceLevel;
  manufacturer: ConfidenceLevel;
  brand: ConfidenceLevel;
  product_name: ConfidenceLevel;
  weight_and_unit: ConfidenceLevel;
  packaging_type: ConfidenceLevel;
  country_origin: ConfidenceLevel;
  marketing_messages: ConfidenceLevel;
}

export interface ExtractionResult {
  extracted_data: ExtractedData;
  confidence_scores: ConfidenceScores;
  _raw: BackendRecord;
}

export interface SessionStats {
  total: number;
  flagged: number;
  duplicates: number;
  avg_confidence: number;
}

// ---- Adapter ----------------------------------------------------------------

function fieldConfidence(
  fv: BackendRecord["field_validation"],
  key: string,
  overall: number
): ConfidenceLevel {
  const entry = fv?.[key];
  if (!entry) return overall >= 60 ? "high" : "low";
  if (typeof entry.confidence === "number") return entry.confidence >= 60 ? "high" : "low";
  return entry.valid ? "high" : "low";
}

export function adaptRecord(r: BackendRecord): ExtractionResult {
  const fv = r.field_validation ?? {};
  const oc = r.confidence ?? 0;

  const extracted_data: ExtractedData = {
    barcode: r.barcode ?? null,
    category_type: r.category_type ?? null,
    segment_type: r.segment_type ?? null,
    manufacturer: r.manufacturer ?? null,
    brand: r.brand ?? null,
    product_name: r.product_name ?? null,
    weight: r.weight ?? null,
    unit: r.unit ?? null,
    packaging_type: r.packaging_type ?? null,
    country_origin: r.country_of_origin ?? null,
    marketing_messages: r.promotional_messages ?? null,
  };

  const confidence_scores: ConfidenceScores = {
    barcode: fieldConfidence(fv, "barcode", oc),
    category_type: fieldConfidence(fv, "category_type", oc),
    segment_type: fieldConfidence(fv, "segment_type", oc),
    manufacturer: fieldConfidence(fv, "manufacturer", oc),
    brand: fieldConfidence(fv, "brand", oc),
    product_name: fieldConfidence(fv, "product_name", oc),
    weight_and_unit: fieldConfidence(fv, "weight", oc),
    packaging_type: fieldConfidence(fv, "packaging_type", oc),
    country_origin: fieldConfidence(fv, "country_of_origin", oc),
    marketing_messages: fieldConfidence(fv, "promotional_messages", oc),
  };

  return { extracted_data, confidence_scores, _raw: r };
}

// ---- API calls --------------------------------------------------------------

export async function extractImage(file: File): Promise<ExtractionResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/extract`, { method: "POST", body: form });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Extraction failed (${res.status}): ${msg}`);
  }
  return adaptRecord(await res.json());
}

export async function fetchRecords(): Promise<BackendRecord[]> {
  const res = await fetch(`${BASE}/api/records`);
  if (!res.ok) throw new Error(`Failed to fetch records (${res.status})`);
  return (await res.json()).records ?? [];
}

export async function clearRecords(): Promise<void> {
  const res = await fetch(`${BASE}/api/records`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear records (${res.status})`);
}

export async function fetchStats(): Promise<SessionStats> {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats (${res.status})`);
  return res.json();
}

export async function exportExcel(records: BackendRecord[]): Promise<void> {
  const res = await fetch(`${BASE}/api/export/excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement("a"), { href: url, download: `imdb_export_${Date.now()}.xlsx` }).click();
  URL.revokeObjectURL(url);
}

export async function exportCsv(records: BackendRecord[]): Promise<void> {
  const res = await fetch(`${BASE}/api/export/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  Object.assign(document.createElement("a"), { href: url, download: `imdb_export_${Date.now()}.csv` }).click();
  URL.revokeObjectURL(url);
}


export async function extractBatch(files: File[]): Promise<ExtractionResult[]> {
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  const res = await fetch(`${BASE}/api/extract-batch`, { method: "POST", body: form });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Batch extraction failed (${res.status}): ${msg}`);
  }
  const body = await res.json();
  return (body.records as BackendRecord[]).map(adaptRecord);
}

export async function extractProduct(files: File[]): Promise<ExtractionResult> {
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  const res = await fetch(`${BASE}/api/extract-product`, { method: "POST", body: form });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Extraction failed (${res.status}): ${msg}`);
  }
  return adaptRecord(await res.json());
}
