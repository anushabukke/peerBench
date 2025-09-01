"use client";

import {
  JsonView,
  allExpanded,
  darkStyles,
  defaultStyles,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { useTheme } from "next-themes";

export interface JSONViewProps {
  data: any;
}

export function JSONView({ data }: JSONViewProps) {
  const theme = useTheme();
  return (
    <JsonView
      data={data}
      shouldExpandNode={allExpanded}
      style={{
        ...(theme.theme === "dark" ? darkStyles : defaultStyles),
        container: "child-fields-container",
      }}
    />
  );
}
