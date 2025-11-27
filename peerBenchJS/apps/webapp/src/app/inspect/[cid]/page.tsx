import { FileService, RawFile } from "@/services/file.service";
import { EvaluationService } from "@/services/evaluation.service";
import Evaluations from "./components/Evaluations";
import Header from "./components/Header";
import { getUser } from "@/lib/actions/auth";
import { FileTypes } from "@/database/types";
import { NULL_UUID } from "@/lib/constants";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ cid: string }>;
};

export default async function Page({ params }: PageProps) {
  const user = await getUser();
  const cid = (await params).cid;

  // TODO: This part is a little bit tricky. We are applying ACL rules different on file and evaluation level.
  // That's why here first we are getting the file without the ACL rules and apply them here again because we are doing ACL differently
  // on file and evaluation level. Ideally implementation would be making this page only for showing the raw file and we show the
  // evaluations in another file. But for the time being, until we do that, we are doing ACL right here (although we have it in `getFile` method) - mdk
  const rawFile = await FileService.getFile(cid, {
    // requestedByUserId: user?.id ?? NULL_UUID,
  });
  if (!rawFile) {
    notFound();
  }

  if (
    rawFile.type !== FileTypes.Evaluation &&
    rawFile.type !== FileTypes.Audit
  ) {
    return <NotSupported rawFile={rawFile} />;
  }

  const result = await EvaluationService.getEvaluations({
    filters: {
      cid,
    },
    page: 1,
    pageSize: 100, // TODO: We are planning to refactor this page to have more user friendly UI so for the time being only fetching the first 100 evaluations is enough (although none of the files has more than 2-5 evaluations) - mdk
    requestedByUserId: user?.id ?? NULL_UUID,
  });

  if (result.data.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto space-y-4 px-4 py-8 max-w-7xl">
      <Header evaluationCount={result.totalCount} />
      <Evaluations evaluations={result.data} user={user} />
    </div>
  );
}

function NotSupported({ rawFile }: { rawFile: NonNullable<RawFile> }) {
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
