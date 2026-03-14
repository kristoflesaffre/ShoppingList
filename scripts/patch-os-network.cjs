/**
 * Workaround for Node.js uv_interface_addresses error (e.g. on some macOS/Node 23 setups).
 * Patches os.networkInterfaces() to return a safe fallback when the system call fails,
 * so Storybook (and other tools) can start without crashing.
 */
const os = require("os");
const orig = os.networkInterfaces;
if (typeof orig === "function") {
  const fallback = {
    lo: [
      {
        address: "127.0.0.1",
        netmask: "255.0.0.0",
        family: "IPv4",
        mac: "00:00:00:00:00:00",
        internal: true,
      },
      {
        address: "::1",
        netmask: "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
        family: "IPv6",
        mac: "00:00:00:00:00:00",
        internal: true,
      },
    ],
  };
  os.networkInterfaces = function networkInterfaces() {
    try {
      return orig.call(this);
    } catch (_) {
      return fallback;
    }
  };
}
