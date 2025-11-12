import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FiltersSkeleton() {
  return (
    <Accordion type="single" collapsible defaultValue="filters">
      <AccordionItem value="filters">
        <AccordionTrigger className="pl-4 pt-4 pb-4 [&[data-state=open]]:rounded-b-none text-sm font-medium bg-background">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Filters
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-5 border-t border-t-gray-100 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
