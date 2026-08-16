import React from "react";

interface LoaderProps {
  message: string;
  progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    // The announcement is handled by the persistent live region in App, so
    // this is presentation only and must not be a second live region.
    <div>
      <p className="app-loader__message">{message}</p>
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
          <p className="tabular app-hint">{Math.round(progress)}% complete</p>
        </>
      )}
    </div>
  );
};

export default Loader;
