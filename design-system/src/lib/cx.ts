/** Join class names, dropping falsy values. A tiny classnames helper. */
export type ClassValue = string | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
