"use client";

import React from "react";

interface Filters {
  sortBy: string;
  avgMin: string;
  avgMax: string;
  promptsMin: string;
  promptsMax: string;
}

export default function FiltersPanel({
  open,
  onClose,
  filters,
  setFilters,
  onApply,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <>
 {/* backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      )}

      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-50 
                    transform transition-transform duration-300 
                    ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-6 h-full overflow-y-auto flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Filters</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold mb-2">Sort By</h3>

            <div className="flex gap-2">
              {["createdAt", "updatedAt"].map((field) => {
                const active = filters.sortBy.startsWith(field);
                const direction = filters.sortBy.split("-")[1];

                return (
                  <button
                    key={field}
                    onClick={() => {
                      setFilters((prev) => {
                        if (prev.sortBy === `${field}-asc`)
                          return { ...prev, sortBy: `${field}-desc` };
                        if (prev.sortBy === `${field}-desc`)
                          return { ...prev, sortBy: "" };
                        return { ...prev, sortBy: `${field}-asc` };
                      });
                    }}
                    className={`px-3 py-2 rounded-lg border flex-1 text-sm
                      ${active ? "bg-gray-700 text-white" : "bg-white"}`}
                  >
                    {field === "createdAt" ? "Created At" : "Updated At"}
                    {active && (direction === "asc" ? " ↑" : " ↓")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RANGE FILTERS */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Average Score</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  className="border p-2 rounded-lg"
                  value={filters.avgMin}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, avgMin: e.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="border p-2 rounded-lg"
                  value={filters.avgMax}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, avgMax: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Total Prompts Count</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  className="border p-2 rounded-lg"
                  value={filters.promptsMin}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, promptsMin: e.target.value }))
                  }
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="border p-2 rounded-lg"
                  value={filters.promptsMax}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, promptsMax: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex gap-3 mt-6">
            <button
              onClick={onReset}
              className="flex-1 h-12 border rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>

            <button
              onClick={onApply}
              className="flex-1 h-12 bg-gray-800 text-white rounded-lg"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
