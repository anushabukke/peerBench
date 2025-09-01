import { Option } from "commander";

export const OptionTags = () =>
  new Option(
    "-t, --tag <tags...>",
    "Tags to be attached to the output file"
  ).default([]);
