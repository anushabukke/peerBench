import { AbstractGenerator, TRPGenerator } from "@peerbench/sdk";

export const generators: AbstractGenerator[] = [
  new TRPGenerator(),
  // TODO: Add more Generators if there are anymore
];

/**
 * Gets a Generator by its identifier from the given list of Generators
 */
export function getGenerator(identifier: string) {
  return generators.find((g) => g.identifier === identifier);
}
