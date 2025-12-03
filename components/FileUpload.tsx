import React, { useCallback, useState } from "react";
import { UploadIcon, FileIcon, TrashIcon } from "./Icons";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

const MAX_FILES = 3;

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  disabled,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileLimitError, setFileLimitError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const totalFiles = selectedFiles.length + newFiles.length;

      if (totalFiles > MAX_FILES) {
        setFileLimitError(
          `Maximum ${MAX_FILES} files allowed. Please remove some files first.`
        );
        event.target.value = ""; // Reset input
        return;
      }

      setFileLimitError(null);
      const allFiles = [...selectedFiles, ...newFiles];
      setSelectedFiles(allFiles);
      onFilesSelected(allFiles);
    }
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const newFiles = Array.from(event.dataTransfer.files);
        const totalFiles = selectedFiles.length + newFiles.length;

        if (totalFiles > MAX_FILES) {
          setFileLimitError(
            `Maximum ${MAX_FILES} files allowed. Please remove some files first.`
          );
          event.dataTransfer.clearData();
          return;
        }

        setFileLimitError(null);
        const allFiles = [...selectedFiles, ...newFiles];
        setSelectedFiles(allFiles);
        onFilesSelected(allFiles);
        event.dataTransfer.clearData();
      }
    },
    [onFilesSelected, selectedFiles]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-full">
      <div
        className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${
          isDragging
            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
            : "border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDrop={!disabled ? handleDrop : undefined}
        onDragOver={!disabled ? handleDragOver : undefined}
        onDragEnter={!disabled ? handleDragEnter : undefined}
        onDragLeave={!disabled ? handleDragLeave : undefined}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-sky-100 dark:bg-sky-900/30">
            <UploadIcon className="w-8 h-8 text-sky-500 dark:text-sky-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              Click to upload
            </span>{" "}
            or drag and drop
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Supports CSV, PDF, PNG, and JPG (Maximum {MAX_FILES} files)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="application/pdf,text/csv,.csv,.png,.jpg,.jpeg"
          disabled={disabled}
        />
      </div>

      {fileLimitError && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            {fileLimitError}
          </p>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              Uploaded Files
            </h3>
            {selectedFiles.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) clearAllFiles();
                }}
                className="flex items-center text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 disabled:opacity-50 transition-colors"
                disabled={disabled}
                aria-label="Clear all uploaded files"
              >
                <TrashIcon className="w-4 h-4 mr-1.5" />
                Clear All
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 pl-3 pr-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 max-w-xs"
              >
                <div className="flex items-center min-w-0">
                  <FileIcon className="w-4 h-4 mr-2 text-slate-500 flex-shrink-0" />
                  <span className="truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) removeFile(index);
                  }}
                  className="ml-2 p-0.5 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
