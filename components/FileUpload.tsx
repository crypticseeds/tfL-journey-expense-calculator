import React, { useCallback, useState } from "react";
import { UploadIcon, FileIcon, TrashIcon } from "./Icons";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

const MAX_CSV_FILES = 6;
const MAX_PDF_FILES = 3;

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
      const allFiles = [...selectedFiles, ...newFiles];

      // Count files by type
      const csvFiles = allFiles.filter(
        (file) => file.type === "text/csv" || /\.csv$/i.test(file.name)
      );
      const pdfFiles = allFiles.filter(
        (file) => file.type === "application/pdf"
      );

      // Validate limits
      if (csvFiles.length > MAX_CSV_FILES) {
        setFileLimitError(
          `Maximum ${MAX_CSV_FILES} CSV files allowed. Please remove some CSV files first.`
        );
        event.target.value = ""; // Reset input
        return;
      }

      if (pdfFiles.length > MAX_PDF_FILES) {
        setFileLimitError(
          `Maximum ${MAX_PDF_FILES} PDF files allowed. Please remove some PDF files first.`
        );
        event.target.value = ""; // Reset input
        return;
      }

      setFileLimitError(null);
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
        const allFiles = [...selectedFiles, ...newFiles];

        // Count files by type
        const csvFiles = allFiles.filter(
          (file) => file.type === "text/csv" || /\.csv$/i.test(file.name)
        );
        const pdfFiles = allFiles.filter(
          (file) => file.type === "application/pdf"
        );

        // Validate limits
        if (csvFiles.length > MAX_CSV_FILES) {
          setFileLimitError(
            `Maximum ${MAX_CSV_FILES} CSV files allowed. Please remove some CSV files first.`
          );
          event.dataTransfer.clearData();
          return;
        }

        if (pdfFiles.length > MAX_PDF_FILES) {
          setFileLimitError(
            `Maximum ${MAX_PDF_FILES} PDF files allowed. Please remove some PDF files first.`
          );
          event.dataTransfer.clearData();
          return;
        }

        setFileLimitError(null);
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
    <div>
      <p className="app-upload__hint">
        Accepted files: CSV (up to {MAX_CSV_FILES}), PDF (up to {MAX_PDF_FILES}
        ), PNG and JPG. Your statements are processed for this report only.
      </p>
      <div
        className={`app-upload${isDragging ? " app-upload--dragging" : ""}${
          disabled ? " app-upload--disabled" : ""
        }`}
        onDrop={!disabled ? handleDrop : undefined}
        onDragOver={!disabled ? handleDragOver : undefined}
        onDragEnter={!disabled ? handleDragEnter : undefined}
        onDragLeave={!disabled ? handleDragLeave : undefined}
      >
        <button
          type="button"
          className="app-button app-button--secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <UploadIcon className="w-5 h-5 mr-2" />
          Choose files
        </button>
        <span className="app-upload__drag-hint">or drag them here</span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleFileChange}
          accept="application/pdf,text/csv,.csv,.png,.jpg,.jpeg"
          disabled={disabled}
          aria-label="Upload your TfL statements"
        />
      </div>

      {fileLimitError && (
        <p role="alert" className="app-error-inline">
          {fileLimitError}
        </p>
      )}

      {selectedFiles.length > 0 && (
        <table className="app-table">
          <caption>
            {selectedFiles.length}{" "}
            {selectedFiles.length === 1 ? "file" : "files"} ready
          </caption>
          <tbody>
            {selectedFiles.map((file, index) => (
              <tr key={`${file.name}-${index}`}>
                <td className="app-table__icon">
                  <FileIcon className="w-4 h-4" />
                </td>
                <td>{file.name}</td>
                <td className="app-table__numeric app-table__actions">
                  <button
                    type="button"
                    className="app-link-button"
                    onClick={() => removeFile(index)}
                    disabled={disabled}
                  >
                    Remove
                    <span className="sr-only"> {file.name}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedFiles.length > 1 && (
        <button
          type="button"
          className="app-button app-button--secondary"
          onClick={clearAllFiles}
          disabled={disabled}
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Remove all files
        </button>
      )}
    </div>
  );
};

export default FileUpload;
