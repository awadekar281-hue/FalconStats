// The sandboxed Windows runner does not expose a Windows UID. tsx calls
// process.geteuid() when present; this stable local test identity avoids its
// fallback to os.userInfo(), which the sandbox denies.
if (typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', { value: () => 0, configurable: true });
}
