"use client";

import { cn } from "@/utils/cn";
import { LucideCopy } from "lucide-react";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

export type LogAreaEntry = {
  message: string;
  type: "info" | "error" | "prompt";
};

export interface LogsAreaHandler {
  addLog: (message: string, type: LogAreaEntry["type"]) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  prompt: (message: string) => void;
  clearLogs: () => void;
  getLogs: () => LogAreaEntry[];
}

export interface LogsAreaProps {
  className?: string;
}

const LogsArea = forwardRef<LogsAreaHandler, LogsAreaProps>(
  ({ className }, ref) => {
    const logContainerRef = useRef<HTMLDivElement | null>(null);
    const [logs, setLogs] = useState<LogAreaEntry[]>([]);

    useImperativeHandle(ref, () => ({
      addLog: (message: string, type: LogAreaEntry["type"]) => {
        setLogs((prevLogs) => [...prevLogs, { message, type }]);
      },
      error: (message: string) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "error" }]);
      },
      info: (message: string) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "info" }]);
      },
      prompt: (message: string) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "prompt" }]);
      },
      clearLogs: () => {
        setLogs([]);
      },
      getLogs: () => logs,
    }));

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop =
          logContainerRef.current.scrollHeight;
      }
    }, [logs]);

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
    };

    return (
      <div
        ref={logContainerRef}
        className={cn(
          "h-[500px] overflow-y-auto border border-gray-300 rounded-md p-4 bg-gray-50 font-mono text-sm",
          className
        )}
      >
        {logs.map((entry, index) => (
          <div
            key={index}
            className={`text-black border text-md p-2 rounded-md mb-2 shadow-md transition-transform transform ${
              entry.type === "error"
                ? "border-red-500 bg-red-300"
                : entry.type === "prompt"
                  ? "border-green-500 bg-green-300"
                  : "border-blue-500 bg-blue-300"
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{entry.message}</span>
              <button
                onClick={() => handleCopy(entry.message)}
                className={twMerge(
                  "ml-2 px-2 py-1 text-xs font-medium rounded hover:cursor-pointer",
                  entry.type === "error"
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : entry.type === "prompt"
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                )}
              >
                <LucideCopy size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
);

LogsArea.displayName = "LogsArea";

export default LogsArea;
