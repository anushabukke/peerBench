import {
  AbstractCollector,
  PubMedCollector,
  StringCollector,
} from "@peerbench/sdk";

export const collectors: AbstractCollector<unknown>[] = [
  new StringCollector(),
  new PubMedCollector(),
  // TODO: Add more Collectors if there are anymore
];

/**
 * Gets a Collector by its identifier from the given list of Collectors
 */
export function getCollector(identifier: string) {
  return collectors.find((c) => c.identifier === identifier);
}
