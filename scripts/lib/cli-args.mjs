// Minimal argv helper shared by scripts that take `--flag value` pairs.
export function flagValue(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
}
