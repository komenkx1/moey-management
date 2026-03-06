#!/usr/bin/env node
/**
 * Print LAN URL so you can open the dev server on your phone (same WiFi).
 */
import os from "os";

const port = process.env.PORT || "3005";
const ifaces = os.networkInterfaces();
let ip = null;
for (const name of Object.keys(ifaces)) {
  for (const iface of ifaces[name]) {
    if (iface.family === "IPv4" && !iface.internal) {
      ip = iface.address;
      break;
    }
  }
  if (ip) break;
}
const url = ip ? `http://${ip}:${port}` : `http://<IP-mac>:${port}`;
console.log("\n  Buka di HP (satu WiFi):", url, "\n");
process.exit(0);
