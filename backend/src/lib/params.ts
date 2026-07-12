export function paramId(value: string | string[] | undefined, name = "id"): string {
  if (typeof value === "string") return value;
  throw new Error(`Missing route parameter: ${name}`);
}
