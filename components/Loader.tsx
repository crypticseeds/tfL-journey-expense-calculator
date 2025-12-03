import React from "react";

interface LoaderProps {
  message: string;
  progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm w-full max-w-md">
      <div className="w-12 h-12 border-4 border-t-sky-500 border-slate-200 dark:border-slate-600 rounded-full animate-spin"></div>
      <div className="w-full text-center">
        <p className="text-slate-600 dark:text-slate-300 font-medium mb-4 break-words">
          {message}
        </p>
        {progress !== undefined && (
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
              className="bg-sky-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Loader;
