import path from "path";

// A dependency name comes from a plugin's package.json and is used to build
// filesystem paths (readFileSync / symlinkSync / unlinkSync / rmSync), so it
// must be a plain npm package name (optional scope, no path separators, no
// segment starting with ".", no "..") before use.
export const isValidDependencyName = (dependency: unknown): dependency is string =>
  typeof dependency === 'string' &&
  !dependency.includes('..') &&
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(dependency);

// Returns the absolute path of `dependency` inside `base`, or null if the name
// is invalid or the resolved path would leave `base`. Callers must treat null
// as "skip": never fall back to the raw name.
export const resolveDependencyPath = (base: string, dependency: unknown): string | null => {
  if (!isValidDependencyName(dependency)) return null;
  const root = path.resolve(base);
  const resolved = path.resolve(root, dependency);
  if (!resolved.startsWith(root + path.sep)) return null;
  return resolved;
};
