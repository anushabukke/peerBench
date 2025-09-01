import { FileService, RawFile } from "@/services/file.service";
import { FileType } from "@/types/file-type";
import { EvaluationService } from "@/services/evaluation.service";
import Evaluations from "./components/evaluations";
import Header from "./components/header";
import { getUser } from "@/lib/actions/auth";

type SearchParams = Promise<{ cid: string }>;

export default async function Page({ params }: { params: SearchParams }) {
  const user = await getUser();
  const cid = (await params).cid;

  try {
    const rawFile = await FileService.getFile(cid);

    if (!rawFile) {
      return <NotFound />;
    }

    if (
      rawFile.type !== FileType.Evaluation &&
      rawFile.type !== FileType.Audit
    ) {
      return <NotSupported rawFile={rawFile} />;
    }

    const evaluations = await EvaluationService.getEvaluations({ cid });

    return (
      <div className="container mx-auto space-y-4 px-4 py-8 max-w-7xl">
        <Header evaluationCount={evaluations.length} />
        <Evaluations evaluations={evaluations} user={user} />
      </div>
    );
  } catch (error) {
    console.error("error", error);
    return <Error error={error} />;
  }
}

function Error({ error }: { error: unknown }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-red-500 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>
          {error instanceof Error
            ? (error as Error).message
            : JSON.stringify(error)}
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Not Found</h2>
        <p>Raw file not found</p>
      </div>
    </div>
  );
}

function NotSupported({ rawFile }: { rawFile: RawFile }) {
  // Prepare download link
  const fileName = rawFile.name || `raw-file-${Date.now()}`;

  // Encode content as base64 for data URL
  const base64Content = Buffer.from(rawFile.content, "utf-8").toString(
    "base64"
  );
  const downloadUrl = `data:text/plain;base64,${base64Content}`;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Not Supported</h2>
        <p>
          peerBench doesn&apos;t support to view this file type. You can
          download it{" "}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={fileName}
              className="text-blue-600 underline hover:text-blue-800"
            >
              here
            </a>
          ) : (
            "here"
          )}
        </p>
      </div>
    </div>
  );
}
