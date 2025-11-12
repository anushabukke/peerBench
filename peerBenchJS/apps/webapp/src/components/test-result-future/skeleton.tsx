import { Card, CardContent, CardHeader, CardFooter } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export default function TestResultFutureSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Model name skeleton */}
            <Skeleton className="h-6 w-48 mb-2" />
            <div className="flex gap-5 text-sm text-gray-500 mt-1">
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Score icon and text skeleton */}
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-3">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Response text skeleton */}
        <div className="bg-card-content-container border border-card-content-container-border p-3 rounded-md">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Accordion skeleton */}
        <Accordion type="single" collapsible>
          <AccordionItem value="metadata">
            <AccordionTrigger className="pl-4 pt-4 pb-4 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-5 bg-card-content-container">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>

      <CardFooter className="flex justify-between items-center gap-4 pt-4 border-t">
        <div className="flex gap-2">
          {/* Comment button skeleton */}
          <Skeleton className="h-8 w-20" />
        </div>

        <div className="flex-1" />

        <div className="flex gap-3">
          {/* Thumbs up button skeleton */}
          <Skeleton className="h-8 w-8" />
          {/* Thumbs down button skeleton */}
          <Skeleton className="h-8 w-8" />
        </div>
      </CardFooter>

      {/* TestResultReviews section skeleton */}
      <div className="p-4 border-t">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </Card>
  );
}
