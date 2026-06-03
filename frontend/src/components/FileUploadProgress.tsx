'use client';

interface FileUploadProgressProps {
  progress: number;
  statusLabel: string;
  fileName?: string;
}

export default function FileUploadProgress({
  progress,
  statusLabel,
  fileName,
}: FileUploadProgressProps) {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-5">

      {/* File name */}
      {fileName && (
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-xs font-medium text-slate-600 truncate">{fileName}</p>
        </div>
      )}

      {/* Status label */}
      <p className="text-sm font-medium text-slate-600 mb-3">{statusLabel}</p>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-teal-600 transition-all duration-700 ease-in-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage + complete state */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">
          {progress < 100 ? 'In progress' : 'Complete'}
        </p>
        <p className="text-xs font-semibold text-slate-500">{progress}%</p>
      </div>

      {/* Complete indicator */}
      {progress === 100 && (
        <div className="mt-3 flex items-center gap-2 text-teal-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs font-semibold">Upload successful</p>
        </div>
      )}

    </div>
  );
}