import { User } from "@supabase/supabase-js";
import {
  LucideBookOpen,
  LucideSearch,
  LucideUpload,
  LucideFileCog,
  LucideWrench,
  LucideFileText,
  LucideGitCompare,
  LucideMessageSquareText,
  LucideExternalLink,
} from "lucide-react";

export const links = [
  {
    label: "Benchmarks",
    icon: <LucideFileCog size={16} />,
    menu: [
      {
        label: "Create Benchmark",
        href: "/prompt-sets/create",
        description: "Create new benchmarks",
        access: "authenticated",
        icon: <LucideFileCog />,
      },
      {
        label: "View Benchmarks",
        href: "/prompt-sets",
        description: "Explore benchmarks",
        icon: <LucideSearch />,
      },
      {
        label: "Run Benchmark",
        href: "/benchmark",
        description: "Test benchmarks against models",
        icon: <LucideWrench />,
        access: "authenticated",
      },
    ],
  },
  {
    label: "Prompts",
    icon: <LucideMessageSquareText size={16} />,
    menu: [
      {
        label: "Create",
        href: "/prompts/create",
        description: "Create new Prompts",
        icon: <LucideMessageSquareText />,
        access: "authenticated",
      },
      {
        label: "Mass Upload",
        href: "/upload",
        description: "Upload multiple Prompts",
        icon: <LucideUpload />,
        access: "authenticated",
      },
      {
        label: "View",
        href: "/prompts",
        description: "Explore Prompts",
        icon: <LucideSearch />,
      },
    ],
  },
  {
    label: "Compare",
    href: "/compare",
    icon: <LucideGitCompare />,
    access: "authenticated",
  },
  {
    label: "Review",
    href: "/prompts/review",
    icon: <LucideBookOpen />,
    access: "authenticated",
  },
  {
    label: "Onboarding Tutorial",
    href: "https://docs.google.com/document/d/1Wj7o3pAjqMSYy9pHeRXzvm24H3ByYgz7HRxjV67nnQM/edit?usp=sharing",
    icon: (
      <div className="flex items-center gap-1">
        <LucideFileText size={16} />
      </div>
    ),
    iconSuffix: <LucideExternalLink size={14} className="opacity-60" />,
    external: true,
  },
];

export const isNeedAuth = (link: any, user: User | null) => {
  if (link.access === "authenticated") {
    return user !== null;
  }
  return true;
};

export const isNeedExtra = (link: any, isExtraEnabled?: boolean) => {
  if (link.extra) {
    return isExtraEnabled;
  }
  return true;
};
