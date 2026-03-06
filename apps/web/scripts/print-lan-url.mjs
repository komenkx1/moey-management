#!/usr/bin/env node
/**
 * Print LAN URL so you can open the dev server on your phone (same WiFi).
 * Prioritas: 192.168.x.x → 10.x.x.x → 172.16–31.x.x (IP lokal WiFi) agar HP bisa akses.
 */
import os from "os";

const port = process.env.PORT || "3005";
const ifaces = os.networkInterfaces();

function isPrivateLAN(addr) {
  if (addr.startsWith("192.168.")) return true;
  if (addr.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr)) return true;
  return false;
}

const all = [];
for (const name of Object.keys(ifaces)) {
  for (const iface of ifaces[name]) {
    if (iface.family === "IPv4" && !iface.internal) {
      all.push(iface.address);
    }
  }
}

const preferred = all.find(isPrivateLAN);
const ip = preferred ?? all[0] ?? null;
const url = ip ? `http://${ip}:${port}` : `http://<IP-mac>:${port}`;
console.log("\n  Buka di HP (satu WiFi):", url, "\n");
process.exit(0);
