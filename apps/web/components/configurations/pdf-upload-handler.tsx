"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react"; // Sesuaikan icon jika perlu
import { Button } from "@workspace/ui/components/button";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { useAddKnowledgeWithMetadata } from "@/lib/convex-client";
import {
  calculateOptimalChunkSize,
  chunkDocument,
} from "@workspace/backend/convex/documentchunker";

import type { TextItem } from "pdfjs-dist/types/src/display/api";
// --- PDF.JS SETUP ---
type PdfJsModule = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJsModule> | null = null;

const getPdfJs = async (): Promise<PdfJsModule> => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      // Setup Worker via CDN agar tidak memberatkan bundle utama & UI tidak freeze
      // Pastikan versi worker sama dengan versi library yang diinstall
      mod.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
      return mod;
    });
  }

  return pdfjsPromise;
};
// --------------------

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type UploadStatus = "pending" | "reading" | "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  message?: string;
};

// ... helper formatFileSize & buildUploadItems sama ...
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function validatePdfFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are supported.";
  if (file.size > MAX_PDF_SIZE_BYTES)
    return `File exceeds ${formatFileSize(MAX_PDF_SIZE_BYTES)} limit.`;
  return null;
}

// ... ProgressBar component sama ...
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function PdfUploadHandler({
  botId,
  onCancel,
  onComplete,
}: {
  botId?: Id<"botProfiles">;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const addKnowledgeWithMetadata = useAddKnowledgeWithMetadata();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalSize = useMemo(
    () => uploads.reduce((sum, item) => sum + item.file.size, 0),
    [uploads],
  );

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const handleFilesPicked = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    picked.forEach((file) => {
      const error = validatePdfFile(file);
      if (error) errors.push(`${file.name}: ${error}`);
      else validFiles.push(file);
    });

    if (errors.length) setErrorMessage(errors.join(", "));
    else setErrorMessage(null);

    // Helper untuk build items
    const newItems = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`, // ID unik sederhana
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setUploads(newItems);
  };

  const handleProcess = async () => {
    if (!botId || uploads.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    let globalError = false;

    for (const upload of uploads) {
      try {
        // 1. Reading PDF (Extract Text)
        updateUpload(upload.id, { status: "reading", progress: 10 });
        const parseResult = await extractPdfText(upload.file);

        if (!parseResult.text.trim())
          throw new Error("PDF kosong atau discan (gambar).");

        // 2. Chunking
        updateUpload(upload.id, { status: "uploading", progress: 40 });
        const optimalChunkSize = calculateOptimalChunkSize(parseResult.text);
        const chunks = chunkDocument(parseResult.text, optimalChunkSize);

        const totalChunks = chunks.length;
        let chunksProcessed = 0;

        // 3. Uploading to Convex
        for (const chunk of chunks) {
          await addKnowledgeWithMetadata({
            botId,
            text: chunk.text,
            source_type: "pdf",
            source_metadata: {
              filename: upload.file.name,
              file_size_bytes: upload.file.size,
              total_pages: parseResult.totalPages,
              chunk_index: chunk.chunk_index,
              chunk_total: chunk.chunk_total,
              processing_timestamp: Date.now(),
            },
          });

          chunksProcessed++;
          // Update progress visual dari 40% ke 100%
          const uploadProgress = 40 + (chunksProcessed / totalChunks) * 60;
          updateUpload(upload.id, { progress: uploadProgress });
        }

        updateUpload(upload.id, {
          status: "done",
          progress: 100,
          message: "Selesai",
        });
      } catch (err: any) {
        globalError = true;
        console.error(err);
        updateUpload(upload.id, {
          status: "error",
          progress: 100,
          message: err.message || "Gagal memproses",
        });
      }
    }

    setIsSubmitting(false);
    if (!globalError && onComplete) {
      setTimeout(onComplete, 1000); // Beri jeda dikit biar user lihat 100%
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Input Area */}
      <div
        onClick={() => !isSubmitting && fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer
          ${isSubmitting ? "opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-900" : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-500"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          multiple
          onChange={(e) => handleFilesPicked(e.target.files)}
          disabled={isSubmitting}
        />
        <UploadCloud className="h-10 w-10 text-zinc-400 mb-3" />
        <p className="text-sm text-zinc-300 font-medium">
          Klik untuk upload PDF
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Maks {formatFileSize(MAX_PDF_SIZE_BYTES)}
        </p>
      </div>

      {errorMessage && (
        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[100px]">
        {uploads.map((item) => (
          <div
            key={item.id}
            className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="truncate font-medium text-zinc-200 max-w-[70%]">
                {item.file.name}
              </span>
              <span
                className={`text-xs ${item.status === "error" ? "text-red-400" : "text-zinc-500"}`}
              >
                {item.status === "done"
                  ? "Selesai"
                  : item.status === "reading"
                    ? "Membaca PDF..."
                    : item.status === "uploading"
                      ? "Menyimpan..."
                      : item.message || formatFileSize(item.file.size)}
              </span>
            </div>
            <ProgressBar value={item.progress} />
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          onClick={handleProcess}
          disabled={isSubmitting || uploads.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
            </>
          ) : (
            "Mulai Upload"
          )}
        </Button>
      </div>
    </div>
  );
}

// --- LOGIC PDF PARSING YANG DIPERBAIKI ---

type PdfParseResult = {
  text: string;
  totalPages: number;
};

async function extractPdfText(file: File): Promise<PdfParseResult> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();

  // Load document
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    // PENTING: Jangan set disableWorker: true, biarkan default (false)
    // Worker akan diambil dari GlobalWorkerOptions.workerSrc yang kita set di atas
  });

  const pdf = await loadingTask.promise;
  let fullText = "";

  // Loop setiap halaman
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Cara yang lebih type-safe mengambil string
    const pageText = textContent.items
      .filter((item): item is TextItem => "str" in item) // Filter item kosong/transform
      .map((item) => item.str)
      .join(" ");

    fullText += `Page ${i}:\n${pageText}\n\n`;
  }

  return {
    text: fullText,
    totalPages: pdf.numPages,
  };
}
