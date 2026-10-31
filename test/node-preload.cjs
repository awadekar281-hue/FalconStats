// Windows sandbox processes may not expose a UID; tsx otherwise tries the restricted os.userInfo fallback.
if (typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', { value: () => 0, configurable: true });
}
