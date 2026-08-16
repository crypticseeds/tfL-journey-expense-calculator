import React from "react";

interface LoaderProps {
  message: string;
  progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    <div role="status" aria-live="polite">
      <p style={{ fontWeight: 700, marginTop: 0 }}>{message}</p>
      {progress !== undefined && (
        <>
          <div
            className="app-progress"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="app-progress__bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            className="tabular"
            style={{ color: "var(--colour-ink-secondary)" }}
          >
            {Math.round(progress)}% complete
          </p>
        </>
      )}
    </div>
  );
};

export default Loader;
