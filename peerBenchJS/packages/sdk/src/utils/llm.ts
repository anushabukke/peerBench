import { jsonrepair } from "jsonrepair";

/**
 * Tries to repair and parse LLM response as a JSON object. LLM must
 * be configured to return a JSON object. This function only helps to
 * get rid out of some additional formatting (e.g. ```json).
 */
export function parseResponseAsJSON<T>(response: string) {
  try {
    const json = extractJSONFromResponse(response);
    if (!json) {
      throw new Error("No JSON found in the response");
    }

    return JSON.parse(jsonrepair(json)) as T;
  } catch (e) {
    if (process?.env?.PB_SDK_DEBUG) {
      console.log("Original response", JSON.stringify(response));
      console.error("Error parsing response as JSON", e);
    }
  }
}

/**
 * Extracts the first JSON formatted part from the response
 */
export function extractJSONFromResponse(response: string) {
  const jsonRegex = /```(json)?\n*(?<content>.*?)\n*```/s;
  const jsonMatch = response.match(jsonRegex);

  return jsonMatch?.groups?.content;
}
