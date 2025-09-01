export const apiFetcher = <T = any>(url: string) =>
  fetch(url).then((res) => res.json() as T);
