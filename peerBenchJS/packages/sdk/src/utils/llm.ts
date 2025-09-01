/**
 * Tries to repair and parse LLM response as a JSON object. LLM must
 * be configured to return a JSON object. This function only helps to
 * get rid out of some additional formatting (e.g. ```json).
 */
export function parseResponseAsJSON<T>(response: string) {
  let out  ;
  try {
    out = JSON.parse(response.replace(/```json/g, "").replace(/```/g, "")) as T ;
  } catch (e) {
    console.log("Original response", response);
    console.error("Error parsing response as JSON", e);
  }
  return out;
}
