/**
 * Formats the given Date object as a string that can be
 * also used as a file name. The format is: `<year>-<month>-<day>-<hour>-<minute>-<second>`. Uses UTC time.
 * @param date The Date object to be formatted. Uses now by default.
 */
export function dateString(date?: Date) {
  date ??= new Date();
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}-${date.getUTCSeconds()}`;
}
