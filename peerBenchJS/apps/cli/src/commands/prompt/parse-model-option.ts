/**
 * Parses the Provider identifier and model ID from the
 * given string in format `<provider>:<model>`
 */
export function parseModelOption(str: string) {
  const [provider, model] = str.split(":");
  if (!provider || !model) {
    throw new Error(`Invalid model option: ${str}`);
  }

  return [provider, model] as const;
}
