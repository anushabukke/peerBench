"use client";

import { useState, useMemo } from "react";
import { SystemPromptWithVersion } from "@/services/system-prompt.service";
import Link from "next/link";
import * as Diff from "diff";

interface PromptDetailViewProps {
  promptName: string;
  versions: SystemPromptWithVersion[];
  tags: string[];
  createdAt: Date;
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const diff = useMemo(() => {
    return Diff.diffLines(oldText, newText);
  }, [oldText, newText]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded font-mono text-sm overflow-x-auto">
      {diff.map((part, index) => {
        const lines = part.value.split('\n');
        // Remove last empty line if exists
        if (lines[lines.length - 1] === '') {
          lines.pop();
        }

        return lines.map((line, lineIndex) => {
          const key = `${index}-${lineIndex}`;

          if (part.added) {
            return (
              <div
                key={key}
                className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-4 py-0.5"
              >
                <span className="text-green-600 dark:text-green-400 mr-2">+</span>
                {line}
              </div>
            );
          }

          if (part.removed) {
            return (
              <div
                key={key}
                className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 px-4 py-0.5"
              >
                <span className="text-red-600 dark:text-red-400 mr-2">-</span>
                {line}
              </div>
            );
          }

          return (
            <div key={key} className="text-gray-700 dark:text-gray-300 px-4 py-0.5">
              <span className="text-gray-400 mr-2"> </span>
              {line}
            </div>
          );
        });
      })}
    </div>
  );
}

export function PromptDetailView({
  promptName,
  versions,
  tags,
  createdAt,
}: PromptDetailViewProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(
    versions[0]?.version.id
  );
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState("");
  const [newVersionType, setNewVersionType] = useState<"text" | "chat">("text");
  const [isEditingLabels, setIsEditingLabels] = useState<number | null>(null);
  const [editingLabelsValue, setEditingLabelsValue] = useState("");

  const selectedVersion = versions.find((v) => v.version.id === selectedVersionId);
  const compareVersion = compareVersionId
    ? versions.find((v) => v.version.id === compareVersionId)
    : null;

  const handleStartNewVersion = () => {
    if (selectedVersion) {
      const content =
        selectedVersion.version.type === "text"
          ? typeof selectedVersion.version.prompt === "string"
            ? selectedVersion.version.prompt
            : JSON.stringify(selectedVersion.version.prompt, null, 2)
          : JSON.stringify(selectedVersion.version.prompt, null, 2);
      setNewVersionContent(content);
      setNewVersionType(selectedVersion.version.type);
      setIsCreatingNewVersion(true);
    }
  };

  const handleCreateNewVersion = async () => {
    try {
      let promptContent: string | any;
      if (newVersionType === "chat") {
        try {
          promptContent = JSON.parse(newVersionContent);
        } catch {
          alert("Invalid JSON for chat type");
          return;
        }
      } else {
        promptContent = newVersionContent;
      }

      const response = await fetch("/api/v2/system-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: promptName,
          type: newVersionType,
          prompt: promptContent,
          createNewVersion: true,
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to create version"}`);
      }
    } catch (error) {
      console.error("Error creating new version:", error);
      alert("Failed to create new version");
    }
  };

  const handleUpdateLabels = async (versionNumber: number, labels: string[]) => {
    try {
      const response = await fetch(
        `/api/v2/system-prompts/${encodeURIComponent(promptName)}/labels`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: versionNumber,
            labels,
          }),
        }
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to update labels"}`);
      }
    } catch (error) {
      console.error("Error updating labels:", error);
      alert("Failed to update labels");
    }
  };

  const startEditingLabels = (versionId: number, currentLabels: string[]) => {
    setIsEditingLabels(versionId);
    setEditingLabelsValue(currentLabels.join(", "));
  };

  const saveLabels = (versionNumber: number) => {
    const labels = editingLabelsValue
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    handleUpdateLabels(versionNumber, labels);
    setIsEditingLabels(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin_routes/system-prompts"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to System Prompts
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
          {promptName}
        </h1>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Created: {new Date(createdAt).toLocaleDateString()}
          {" • "}
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex gap-6 flex-1">
        {/* Left sidebar - Version list */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                Versions
              </h2>
              <button
                onClick={handleStartNewVersion}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + New Version
              </button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {versions.map((item) => (
                <div
                  key={item.version.id}
                  className={`p-3 border rounded-lg transition-colors relative ${
                    selectedVersionId === item.version.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : compareVersionId === item.version.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => setSelectedVersionId(item.version.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-black dark:text-white">
                        v{item.version.version}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.version.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.labels?.map((label) => (
                        <span
                          key={label.id}
                          className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded"
                        >
                          {label.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {item.version.type}
                    </div>
                  </div>

                  {/* Compare button - only show if not the currently selected version */}
                  {selectedVersionId !== item.version.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (compareVersionId === item.version.id) {
                          setCompareVersionId(null);
                        } else {
                          setCompareVersionId(item.version.id);
                        }
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded transition-colors group ${
                        compareVersionId === item.version.id
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-600 dark:hover:text-purple-300"
                      }`}
                      title="Compare with selected version"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Version details */}
        <div className="flex-1 overflow-y-auto">
          {isCreatingNewVersion ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-black dark:text-white">
                  Create New Version
                </h2>
                <button
                  onClick={() => setIsCreatingNewVersion(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕ Cancel
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  value={newVersionType}
                  onChange={(e) =>
                    setNewVersionType(e.target.value as "text" | "chat")
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="chat">Chat</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt Content
                  {newVersionType === "chat" && (
                    <span className="text-xs text-gray-500 ml-2">
                      (JSON format: array of messages with role and content)
                    </span>
                  )}
                </label>
                <textarea
                  value={newVersionContent}
                  onChange={(e) => setNewVersionContent(e.target.value)}
                  className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm bg-white dark:bg-gray-900 text-black dark:text-white"
                  placeholder={
                    newVersionType === "chat"
                      ? '[{"role": "system", "content": "..."}]'
                      : "Enter your prompt text here..."
                  }
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateNewVersion}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Version
                </button>
                <button
                  onClick={() => setIsCreatingNewVersion(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {selectedVersion && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-black dark:text-white">
                        Version {selectedVersion.version.version}
                      </h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Created:{" "}
                        {new Date(
                          selectedVersion.version.createdAt
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          selectedVersion.version.createdAt
                        ).toLocaleTimeString()}
                      </div>
                    </div>

                    {compareVersionId && (
                      <button
                        onClick={() => setCompareVersionId(null)}
                        className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        ✕ Stop Comparing
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Labels
                      {isEditingLabels !== selectedVersion.version.id && (
                        <button
                          onClick={() =>
                            startEditingLabels(
                              selectedVersion.version.id,
                              selectedVersion.labels?.map((l) => l.label) || []
                            )
                          }
                          className="ml-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {isEditingLabels === selectedVersion.version.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingLabelsValue}
                          onChange={(e) => setEditingLabelsValue(e.target.value)}
                          placeholder="latest, production, staging (comma-separated)"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-black dark:text-white"
                        />
                        <button
                          onClick={() =>
                            saveLabels(selectedVersion.version.version)
                          }
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingLabels(null)}
                          className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-black dark:text-white rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedVersion.labels?.map((label) => (
                          <span
                            key={label.id}
                            className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded uppercase"
                          >
                            {label.label}
                          </span>
                        ))}
                        {(!selectedVersion.labels ||
                          selectedVersion.labels.length === 0) && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No labels
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type:{" "}
                      <span className="uppercase font-mono">
                        {selectedVersion.version.type}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SHA256 Hash:
                    </div>
                    <div className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded break-all">
                      {selectedVersion.version.sha256Hash}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prompt Content:
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm overflow-x-auto">
                      {selectedVersion.version.type === "text" ? (
                        <pre className="whitespace-pre-wrap">
                          {typeof selectedVersion.version.prompt === "string"
                            ? selectedVersion.version.prompt
                            : JSON.stringify(
                                selectedVersion.version.prompt,
                                null,
                                2
                              )}
                        </pre>
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(
                            selectedVersion.version.prompt,
                            null,
                            2
                          )}
                        </pre>
                      )}
                    </div>
                  </div>

                  {selectedVersion.version.config &&
                    Object.keys(selectedVersion.version.config).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Configuration:
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(
                              selectedVersion.version.config,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {compareVersionId && compareVersion && selectedVersion && (
                <>
                    <div className="bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-semibold text-black dark:text-white">
                          Comparing: Version {compareVersion.version.version} → Version {selectedVersion.version.version}
                        </h3>
                      </div>

                      <div className="mb-4 flex gap-4 text-sm">
                        <div className="flex-1">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Version {compareVersion.version.version}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(compareVersion.version.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {compareVersion.labels?.map((label) => (
                              <span
                                key={label.id}
                                className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded"
                              >
                                {label.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center text-2xl text-gray-400">→</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Version {selectedVersion.version.version}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(selectedVersion.version.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedVersion.labels?.map((label) => (
                              <span
                                key={label.id}
                                className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded"
                              >
                                {label.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mb-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          Diff View
                          <span className="text-xs font-normal text-gray-500">
                            <span className="text-red-600 dark:text-red-400">- Removed</span>
                            {" / "}
                            <span className="text-green-600 dark:text-green-400">+ Added</span>
                          </span>
                        </div>
                        <DiffView
                          oldText={
                            compareVersion.version.type === "text"
                              ? typeof compareVersion.version.prompt === "string"
                                ? compareVersion.version.prompt
                                : JSON.stringify(compareVersion.version.prompt, null, 2)
                              : JSON.stringify(compareVersion.version.prompt, null, 2)
                          }
                          newText={
                            selectedVersion.version.type === "text"
                              ? typeof selectedVersion.version.prompt === "string"
                                ? selectedVersion.version.prompt
                                : JSON.stringify(selectedVersion.version.prompt, null, 2)
                              : JSON.stringify(selectedVersion.version.prompt, null, 2)
                          }
                        />
                      </div>
                    </div>
                </>
              )}
            </>
          )}

          {/* API Usage Guide */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-semibold text-black dark:text-white mb-2">
              How to retrieve this prompt
            </h3>
            <div className="space-y-2 text-sm font-mono text-gray-600 dark:text-gray-300">
              <div>By name (latest): GET /api/v2/system-prompts?name={promptName}</div>
              <div>By label: GET /api/v2/system-prompts?name={promptName}&label=production</div>
              <div>By version: GET /api/v2/system-prompts?name={promptName}&version=1</div>
              {selectedVersion?.version?.sha256Hash && (
                <div>By hash: GET /api/v2/system-prompts?sha256={selectedVersion.version.sha256Hash}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
