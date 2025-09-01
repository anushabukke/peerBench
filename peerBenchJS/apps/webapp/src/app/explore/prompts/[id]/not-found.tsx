import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Prompt Not Found
          </CardTitle>
          <p className="text-gray-600">
            The prompt you&apos;re looking for doesn&apos;t exist or may have
            been removed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/explore/prompts">
              <Button variant="outline" className="w-full sm:w-auto">
                <Search className="w-4 h-4 mr-2" />
                Browse Prompts
              </Button>
            </Link>

            <Link href="/explore/prompts">
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Prompts
              </Button>
            </Link>

            <Link href="/">
              <Button variant="ghost" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>

          <div className="text-sm text-gray-500 pt-4 border-t">
            <p>
              If you believe this is an error, please check the URL or report
              the issue.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
