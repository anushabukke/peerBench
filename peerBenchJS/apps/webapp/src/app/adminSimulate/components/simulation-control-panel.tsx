"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Alert from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import PromptSetSelect, {
  type PromptSetSelectOption,
} from "@/components/prompt-set-select";
import type {
  SimpleSimulationConfig,
  RealisticSimulationConfig,
  SimulatedData,
} from "@/sim/types";
import {
  DEFAULT_SIMPLE_SIMULATION_CONFIG,
  DEFAULT_REALISTIC_SIMULATION_CONFIG,
} from "@/sim/types";

// Common countries with universities in our database
const AVAILABLE_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "China",
  "India",
  "Brazil",
  "South Korea",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Italy",
  "Spain",
  "Singapore",
  "Israel",
  "Mexico",
  "South Africa",
].sort();

export function SimulationControlPanel() {
  const [mode, setMode] = useState<"simple" | "realistic">("simple");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulatedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simple simulation config
  const [simpleConfig, setSimpleConfig] = useState<SimpleSimulationConfig>(
    DEFAULT_SIMPLE_SIMULATION_CONFIG
  );

  // Realistic simulation config
  const [realisticConfig, setRealisticConfig] =
    useState<RealisticSimulationConfig>(DEFAULT_REALISTIC_SIMULATION_CONFIG);

  // Selected prompt set for submitToExisting
  const [selectedPromptSet, setSelectedPromptSet] =
    useState<PromptSetSelectOption | null>(null);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const config = mode === "simple" ? simpleConfig : {
        ...realisticConfig,
        targetPromptSetId: selectedPromptSet?.id,
      };

      const response = await fetch("/api/v2/admin/simulate/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run simulation");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as "simple" | "realistic")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Simple Simulation</TabsTrigger>
          <TabsTrigger value="realistic">
            Realistic Simulation (LLM)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simple Simulation Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="simple-num-users">Number of Users</Label>
                  <Input
                    id="simple-num-users"
                    type="number"
                    value={simpleConfig.numUsers}
                    onChange={(e) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        numUsers: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={500}
                  />
                </div>

                <div>
                  <Label htmlFor="simple-good-prompts">Good Prompts (%)</Label>
                  <Input
                    id="simple-good-prompts"
                    type="number"
                    value={simpleConfig.percentageGoodPrompts}
                    onChange={(e) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        percentageGoodPrompts: parseInt(e.target.value),
                      })
                    }
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Persona Distribution (%)</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(
                    [
                      "altruistic",
                      "greedy",
                      "cabal",
                      "random",
                      "malicious",
                    ] as const
                  ).map((persona) => (
                    <div key={persona}>
                      <Label className="text-xs capitalize">{persona}</Label>
                      <Input
                        type="number"
                        value={simpleConfig.personas[persona]}
                        onChange={(e) =>
                          setSimpleConfig({
                            ...simpleConfig,
                            personas: {
                              ...simpleConfig.personas,
                              [persona]: parseInt(e.target.value),
                            },
                          })
                        }
                        min={0}
                        max={100}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="simple-in-memory"
                    checked={simpleConfig.in_memory_only}
                    onCheckedChange={(checked) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        in_memory_only: !!checked,
                        write_to_db: checked ? false : simpleConfig.write_to_db,
                      })
                    }
                  />
                  <Label htmlFor="simple-in-memory">In-Memory Only</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="simple-write-db"
                    checked={simpleConfig.write_to_db}
                    disabled={simpleConfig.in_memory_only}
                    onCheckedChange={(checked) =>
                      setSimpleConfig({
                        ...simpleConfig,
                        write_to_db: !!checked,
                      })
                    }
                  />
                  <Label htmlFor="simple-write-db">Write to Database</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realistic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Realistic Simulation Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="realistic-num-users">Number of Users</Label>
                  <Input
                    id="realistic-num-users"
                    type="number"
                    value={realisticConfig.numUsers}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        numUsers: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fewer users recommended due to LLM API costs
                  </p>
                </div>

                <div>
                  <Label htmlFor="realistic-model">LLM Model</Label>
                  <Input
                    id="realistic-model"
                    value={
                      realisticConfig.llmModel ||
                      DEFAULT_REALISTIC_SIMULATION_CONFIG.llmModel
                    }
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        llmModel: e.target.value,
                      })
                    }
                    placeholder="google/gemini-2.0-flash-001"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="realistic-countries">
                  Filter by Countries (Optional)
                </Label>
                <div className="space-y-2">
                  <select
                    id="realistic-countries"
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    value=""
                    onChange={(e) => {
                      const country = e.target.value;
                      if (
                        country &&
                        !realisticConfig.countries?.includes(country)
                      ) {
                        setRealisticConfig({
                          ...realisticConfig,
                          countries: [
                            ...(realisticConfig.countries || []),
                            country,
                          ],
                        });
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">Select a country to add...</option>
                    {AVAILABLE_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  {realisticConfig.countries &&
                    realisticConfig.countries.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {realisticConfig.countries.map((country) => (
                          <div
                            key={country}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                          >
                            {country}
                            <button
                              onClick={() =>
                                setRealisticConfig({
                                  ...realisticConfig,
                                  countries: realisticConfig.countries?.filter(
                                    (c) => c !== country
                                  ),
                                })
                              }
                              className="hover:text-blue-600 dark:hover:text-blue-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  <p className="text-xs text-gray-500">
                    Leave empty to use all countries. Add countries to generate
                    users only from those locations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="realistic-prompts-min">
                    Min Prompts per User
                  </Label>
                  <Input
                    id="realistic-prompts-min"
                    type="number"
                    value={realisticConfig.promptsPerUser.min}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        promptsPerUser: {
                          ...realisticConfig.promptsPerUser,
                          min: parseInt(e.target.value),
                        },
                      })
                    }
                    min={1}
                    max={10}
                  />
                </div>

                <div>
                  <Label htmlFor="realistic-prompts-max">
                    Max Prompts per User
                  </Label>
                  <Input
                    id="realistic-prompts-max"
                    type="number"
                    value={realisticConfig.promptsPerUser.max}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        promptsPerUser: {
                          ...realisticConfig.promptsPerUser,
                          max: parseInt(e.target.value),
                        },
                      })
                    }
                    min={realisticConfig.promptsPerUser.min}
                    max={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="realistic-feedbacks-min">
                    Min Feedbacks per User
                  </Label>
                  <Input
                    id="realistic-feedbacks-min"
                    type="number"
                    value={realisticConfig.feedbacksPerUser?.min ?? 0}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        feedbacksPerUser: {
                          min: parseInt(e.target.value),
                          max:
                            realisticConfig.feedbacksPerUser?.max ??
                            parseInt(e.target.value),
                        },
                      })
                    }
                    min={0}
                    max={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of feedbacks each user will try to provide
                  </p>
                </div>

                <div>
                  <Label htmlFor="realistic-feedbacks-max">
                    Max Feedbacks per User
                  </Label>
                  <Input
                    id="realistic-feedbacks-max"
                    type="number"
                    value={
                      realisticConfig.feedbacksPerUser?.max ??
                      realisticConfig.feedbacksPerUser?.min ??
                      0
                    }
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        feedbacksPerUser: {
                          ...realisticConfig.feedbacksPerUser,
                          min: realisticConfig.feedbacksPerUser?.min ?? 0,
                          max: parseInt(e.target.value),
                        },
                      })
                    }
                    min={realisticConfig.feedbacksPerUser?.min ?? 0}
                    max={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Will stop early if all available prompts are reviewed
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="realistic-in-memory"
                      checked={realisticConfig.in_memory_only}
                      onCheckedChange={(checked) =>
                        setRealisticConfig({
                          ...realisticConfig,
                          in_memory_only: !!checked,
                          write_to_db: checked
                            ? false
                            : realisticConfig.write_to_db,
                        })
                      }
                    />
                    <Label htmlFor="realistic-in-memory">In-Memory Only</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="realistic-write-db"
                      checked={realisticConfig.write_to_db}
                      disabled={realisticConfig.in_memory_only}
                      onCheckedChange={(checked) =>
                        setRealisticConfig({
                          ...realisticConfig,
                          write_to_db: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="realistic-write-db">
                      Write to Database
                    </Label>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="realistic-create-promptsets"
                      checked={realisticConfig.createPromptSets ?? true}
                      disabled={
                        realisticConfig.in_memory_only ||
                        !realisticConfig.write_to_db ||
                        realisticConfig.submitToExisting
                      }
                      onCheckedChange={(checked) =>
                        setRealisticConfig({
                          ...realisticConfig,
                          createPromptSets: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="realistic-create-promptsets">
                      Create Prompt Sets
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="realistic-promptsets-public"
                      checked={realisticConfig.promptSetsPublic ?? true}
                      disabled={
                        realisticConfig.in_memory_only ||
                        !realisticConfig.write_to_db ||
                        !realisticConfig.createPromptSets
                      }
                      onCheckedChange={(checked) =>
                        setRealisticConfig({
                          ...realisticConfig,
                          promptSetsPublic: !!checked,
                        })
                      }
                    />
                    <Label htmlFor="realistic-promptsets-public">
                      Make Prompt Sets Public
                    </Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="realistic-submit-existing"
                      checked={realisticConfig.submitToExisting ?? false}
                      disabled={
                        realisticConfig.in_memory_only ||
                        !realisticConfig.write_to_db
                      }
                      onCheckedChange={(checked) => {
                        setRealisticConfig({
                          ...realisticConfig,
                          submitToExisting: !!checked,
                          createPromptSets: checked
                            ? false
                            : realisticConfig.createPromptSets,
                        });
                        if (!checked) {
                          setSelectedPromptSet(null);
                        }
                      }}
                    />
                    <Label htmlFor="realistic-submit-existing">
                      Submit to Existing Prompt Sets
                    </Label>
                    <span className="text-xs text-gray-500">
                      (uses LLM to match style)
                    </span>
                  </div>

                  {realisticConfig.submitToExisting && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="target-prompt-set">
                        Select Target Prompt Set (Optional)
                      </Label>
                      <PromptSetSelect
                        id="target-prompt-set"
                        value={selectedPromptSet}
                        onChange={setSelectedPromptSet}
                        placeholder="Select a prompt set or leave empty for random"
                        disabled={
                          realisticConfig.in_memory_only ||
                          !realisticConfig.write_to_db
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Leave empty to randomly select a prompt set for each user
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Label htmlFor="realistic-prompt-type">Prompt Type:</Label>
                  <select
                    id="realistic-prompt-type"
                    value={realisticConfig.promptType || "random"}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        promptType: e.target.value as
                          | "multiple_choice"
                          | "open_ended"
                          | "random",
                      })
                    }
                    className="px-3 py-1 border rounded text-sm"
                  >
                    <option value="random">Random (50/50)</option>
                    <option value="multiple_choice">
                      Multiple Choice Only
                    </option>
                    <option value="open_ended">Open Ended Only</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Realistic simulation uses LLM to generate:</strong>
                </p>
                <ul className="list-disc list-inside mt-2 text-sm text-blue-900 dark:text-blue-100 space-y-1">
                  <li>Unique user personalities and backgrounds</li>
                  <li>Benchmark themes based on user interests</li>
                  <li>Custom prompts for each benchmark</li>
                </ul>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-3">
                  Suggested model: google/gemini-2.0-flash-001
                </p>
              </div>

              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-sm">
                  Custom LLM System Prompts (Optional)
                </h4>
                <div>
                  <Label htmlFor="realistic-personality-prompt">
                    Personality Generation System Prompt
                  </Label>
                  <textarea
                    id="realistic-personality-prompt"
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="You are a creative persona generator for academic/research simulation..."
                    value={
                      realisticConfig.customPrompts?.personalitySystem || ""
                    }
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        customPrompts: {
                          ...realisticConfig.customPrompts,
                          personalitySystem: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Controls how user personalities and names are generated
                  </p>
                </div>

                <div>
                  <Label htmlFor="realistic-benchmark-prompt">
                    Benchmark Idea Generation System Prompt
                  </Label>
                  <textarea
                    id="realistic-benchmark-prompt"
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="You are a benchmark design assistant. Create creative, realistic benchmark ideas..."
                    value={realisticConfig.customPrompts?.benchmarkSystem || ""}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        customPrompts: {
                          ...realisticConfig.customPrompts,
                          benchmarkSystem: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Controls how benchmark themes and descriptions are created
                  </p>
                </div>

                <div>
                  <Label htmlFor="realistic-prompt-prompt">
                    Test Prompt Generation System Prompt
                  </Label>
                  <textarea
                    id="realistic-prompt-prompt"
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="You are a benchmark question designer. Create high-quality test questions..."
                    value={realisticConfig.customPrompts?.promptSystem || ""}
                    onChange={(e) =>
                      setRealisticConfig({
                        ...realisticConfig,
                        customPrompts: {
                          ...realisticConfig.customPrompts,
                          promptSystem: e.target.value,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Controls how individual test prompts are generated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleRunSimulation} disabled={isRunning} size="lg">
          {isRunning ? "Running Simulation..." : "Run Simulation"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="p-4">
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Simulation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {result.users.length}
                </div>
                <div className="text-sm text-gray-600">Users Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {result.prompts.length}
                </div>
                <div className="text-sm text-gray-600">Prompts Generated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {result.feedbacks.length}
                </div>
                <div className="text-sm text-gray-600">Feedbacks Created</div>
              </div>
            </div>

            {result.dbWritten && (
              <Alert variant="success" className="mt-4 p-4">
                Data has been written to the database successfully.
              </Alert>
            )}

            {!result.dbWritten && (
              <Alert variant="info" className="mt-4 p-4">
                Data generated in-memory only (not persisted to database).
              </Alert>
            )}

            {/* Top 5 Benchmarks/Prompt Sets - only show if new ones were created */}
            {result.users.length > 0 &&
             !("submitToExisting" in result.config && result.config.submitToExisting) && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">
                  Top 5 Benchmarks/Prompt Sets Created
                </h3>
                <div className="space-y-3">
                  {result.users.slice(-5).map((user: any, idx: number) => {
                    // Find prompts for this user to get the prompt type
                    const userPrompts = result.prompts.filter(
                      (p: any) => p.creatorId === user.id
                    );
                    const promptType = userPrompts[0]?.type;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <div className="font-medium text-sm">
                              {user.displayName || user.id}
                            </div>
                            {user.orgCountry && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {user.orgName} ({user.orgCountry})
                              </div>
                            )}
                          </div>
                          {user.id && (
                            <Link
                              href={`/profile/${user.id}`}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              View Profile
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                        {!result.dbWritten &&
                          user.id &&
                          user.id.startsWith("sim-") && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                              ⚠️ In-memory only - link won&apos;t work until
                              data is written to DB
                            </div>
                          )}
                        {user.benchmarkIdea && (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-blue-600 dark:text-blue-400">
                                {user.benchmarkIdea.theme}
                              </div>
                              {promptType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-medium text-xs">
                                  {promptType.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {user.benchmarkIdea.description}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                              Domain: {user.benchmarkIdea.targetDomain} •{" "}
                              {userPrompts.length} prompt
                              {userPrompts.length !== 1 ? "s" : ""}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Prompt Set Info - show when submitToExisting is true */}
            {"submitToExisting" in result.config && result.config.submitToExisting && (
              <div className="mt-6">
                <Alert variant="info" className="p-4">
                  <div className="font-semibold mb-2">
                    📝 Submitted to Existing Prompt Set
                  </div>
                  <p className="text-sm">
                    Prompts were generated based on existing examples and added to
                    {selectedPromptSet
                      ? ` the selected prompt set "${selectedPromptSet.title}" (ID: ${selectedPromptSet.id})`
                      : " randomly selected prompt sets"}.
                    No new prompt sets were created.
                  </p>
                </Alert>
              </div>
            )}

            {/* Last 5 Prompts */}
            {result.prompts.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">
                  Last 5 Prompts Generated
                </h3>
                <div className="space-y-3">
                  {result.prompts.slice(-5).map((prompt: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-medium text-sm text-green-600 dark:text-green-400 flex-1">
                          {prompt.question}
                        </div>
                        {prompt.id && (
                          <Link
                            href={`/prompts/${prompt.id}`}
                            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1 shrink-0"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      {!result.dbWritten && prompt.id.startsWith("sim-") && (
                        <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                          ⚠️ In-memory only - link won&apos;t work until data is
                          written to DB
                        </div>
                      )}
                      {prompt.fullPrompt && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {prompt.fullPrompt}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {prompt.metadata?.benchmarkTheme && (
                          <span>Theme: {prompt.metadata.benchmarkTheme}</span>
                        )}
                        {prompt.metadata?.promptType && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-medium">
                            {prompt.metadata.promptType.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
