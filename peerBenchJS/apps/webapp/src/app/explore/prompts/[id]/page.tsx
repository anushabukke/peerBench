import { notFound, redirect } from "next/navigation";
import { PromptService } from "@/services/prompt.service";
import { getTestResults } from "@/lib/actions/get-test-results";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DateTime } from "luxon";
import { CopyButton } from "./components/copy-button";
import { JSONView } from "@/components/json-view";
import { getUser } from "@/lib/actions/auth";
import TestResult from "@/components/test-result";
import { PromptReview } from "./components/prompt-review";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PromptDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PromptDetailPage({
  params,
}: PromptDetailPageProps) {
  try {
    const user = await getUser();
    if (!user) {
      redirect("/login");
    }

    const paramsId = await params.then((p) => p.id);

    // Fetch the specific prompt by ID
    const result = await PromptService.getPrompts({
      filters: {
        id: paramsId,
      },
      page: 1,
      pageSize: 1,
    });

    if (!result.data || result.data.length === 0) {
      notFound();
    }

    const prompt = result.data[0];

    // Fetch test results for this prompt
    const testResultsResponse = await getTestResults({
      filters: {
        promptId: paramsId,
      },
      page: 1,
      pageSize: 50, // Get more results to show comprehensive data
    });

    // Extract tags from metadata
    const tags = [
      ...(prompt.metadata?.tags || []),
      ...(prompt.metadata?.generatorTags || []),
      ...(prompt.metadata?.articleTags || []),
    ];

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/explore/prompts">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Prompts
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Prompt Details
              </h1>
              <div className="text-gray-600 mb-2">
                ID:{" "}
                <div className="inline-flex items-center gap-2">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {prompt.id}
                  </span>
                  <CopyButton
                    text={prompt.id}
                    label=""
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  />
                </div>
              </div>
              <div className="text-gray-600">
                Prompt Set:{" "}
                <span className="font-medium text-gray-900">
                  {prompt.promptSet.title}
                </span>{" "}
                (ID:{" "}
                <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {prompt.promptSet.id}
                </code>
                )
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{prompt.type}</Badge>
              <Badge variant="secondary">
                {DateTime.fromJSDate(new Date(prompt.createdAt)).toRelative()}
              </Badge>
            </div>
          </div>

          {/* Review Section */}
          <div className="flex justify-end mb-4">
            <PromptReview promptId={prompt.id} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* First Row - Prompt Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Prompt
                <Badge variant="outline" className="ml-auto">
                  {prompt.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-gray-800 leading-relaxed">
                {prompt.question}
              </p>

              {/* Question CID and SHA256 */}
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>CID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                    {prompt.cid}
                  </code>
                  <CopyButton
                    text={prompt.cid}
                    label=""
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>SHA256:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                    {prompt.sha256}
                  </code>
                  <CopyButton
                    text={prompt.sha256}
                    label=""
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  />
                </div>
              </div>

              {/* Full Prompt - Collapsible */}
              <div className="mt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="full-prompt">
                    <AccordionTrigger className="text-sm text-gray-600 hover:text-gray-800">
                      Click to view the full prompt that was sent to the model
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-gray-50 p-4 rounded-lg mt-4">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                          {prompt.fullPrompt}
                        </pre>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>CID:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                            {prompt.fullPromptCID}
                          </code>
                          <CopyButton
                            text={prompt.fullPromptCID}
                            label=""
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>SHA256:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                            {prompt.fullPromptSHA256}
                          </code>
                          <CopyButton
                            text={prompt.fullPromptSHA256}
                            label=""
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Options Section */}
              {(() => {
                try {
                  if (!prompt.options) return null;
                  if (typeof prompt.options !== "object") return null;
                  if (Array.isArray(prompt.options)) return null;

                  const optionKeys = Object.keys(prompt.options);
                  if (optionKeys.length === 0) return null;

                  return (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Options
                      </h3>
                      <div className="space-y-3">
                        {optionKeys.map((key) => {
                          const value = prompt.options[key];
                          return (
                            <div
                              key={key}
                              className={`p-3 rounded-lg border ${
                                key === prompt.answerKey
                                  ? "border-green-200 bg-green-50"
                                  : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  {key.toUpperCase()}
                                </span>
                                {key === prompt.answerKey && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-600"
                                  >
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-600 mt-1">
                                {value !== null && value !== undefined
                                  ? String(value)
                                  : "N/A"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.error("Error rendering options:", error);
                  return null;
                }
              })()}
            </CardContent>
          </Card>

          {/* Second Row - Tags and Models (Two Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tags */}
            {tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Models Summary */}
            {prompt.testResults && prompt.testResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Models Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Model
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Test Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {prompt.testResults.map((tr, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              {tr.modelName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {tr.score.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {tr.testCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Third Row - Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <p className="text-sm text-gray-600">
                {testResultsResponse.data.length} test result(s) found
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResultsResponse.data.map((testResult, index) => (
                  <div key={testResult.id} className="flex gap-3 items-center">
                    <TestResult
                      evaluationIndex={0}
                      testIndex={index}
                      promptSetId={prompt.promptSet.id}
                      user={user}
                      test={testResult}
                    />
                    <Link
                      href={`/inspect/${testResult.fileCID}`}
                      className="inline-flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Go to the evaluation file"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fourth Row - Metadata */}
          {prompt.metadata && Object.keys(prompt.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <JSONView data={prompt.metadata} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching prompt:", error);
    notFound();
  }
}
