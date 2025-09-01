/**
 * Caches the return value of the given function and returns
 * a function that returns the cached value.
 *
 * @param fn - The function to cache the result of
 * @returns A callable function that returns the cached value
 */
export function cacheResult<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  let cached: TReturn | undefined;
  let hasValue = false;
  return (...args: TArgs) => {
    if (!hasValue) {
      cached = fn(...args);
      hasValue = true;
    }
    return cached!;
  };
}
