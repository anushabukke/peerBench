/**
 * Removes the invalid characters from the given path.
 */
export function normalizePath(path: string): string {
  if (!path || typeof path !== "string") {
    return "";
  }

  // Remove null bytes first (common across all systems)
  let normalized = path.replace(/\0/g, "");

  // Define invalid characters for different operating systems
  const invalidChars = {
    // Windows invalid characters: < > : " | ? * \ /
    windows: /[<>:"|?*\\/]/g,
    // Unix invalid characters: forward slash (for path components)
    unix: /\//g,
  };

  // Detect operating system
  const isWindows = process.platform === "win32";

  // Choose appropriate invalid character pattern
  const pattern = isWindows ? invalidChars.windows : invalidChars.unix;

  // Remove invalid characters
  normalized = normalized.replace(pattern, "");

  // Handle Windows-specific path normalization
  if (isWindows) {
    // Normalize backslashes to forward slashes for consistency
    normalized = normalized.replace(/\\/g, "/");

    // Handle drive letters (e.g., C:)
    normalized = normalized.replace(/^([a-zA-Z]):\//, "$1:/");

    // Remove multiple consecutive slashes (except for UNC paths)
    if (!normalized.startsWith("//")) {
      normalized = normalized.replace(/\/+/g, "/");
    }
  } else {
    // Unix-like systems: remove multiple consecutive slashes
    normalized = normalized.replace(/\/+/g, "/");
  }

  // Remove leading/trailing slashes (except for root paths)
  if (normalized.length > 1) {
    if (isWindows && normalized.match(/^[a-zA-Z]:\/$/)) {
      // Keep drive root as is (e.g., "C:/")
    } else if (normalized === "/") {
      // Keep root as is
    } else {
      normalized = normalized.replace(/^\/+|\/+$/g, "");
    }
  }

  return normalized;
}
