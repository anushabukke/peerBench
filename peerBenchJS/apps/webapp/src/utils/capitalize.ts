export function capitalize(
  str: string,
  eachWord = false,
  delimiter: RegExp | string = " "
) {
  return eachWord
    ? str
        .split(delimiter ?? /[,.\-/]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : str.charAt(0).toUpperCase() + str.slice(1);
}
