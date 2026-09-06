#!/usr/bin/env node

import { randomBytes, scryptSync } from "node:crypto";

const N = 32768;
const r = 8;
const p = 1;
const keyLength = 64;
const maxmem = 64 * 1024 * 1024;

async function readPassword(prompt) {
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8").replace(/[\r\n]+$/, "");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    }

    function onData(character) {
      if (character === "\u0003") {
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }
      if (character === "\r" || character === "\n") {
        cleanup();
        resolve(value);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += character;
    }

    process.stdin.on("data", onData);
  });
}

try {
  const password = await readPassword("Password: ");
  if (!password || password.length < 10) {
    console.error("Password must contain at least 10 characters.");
    process.exit(1);
  }

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, keyLength, { N, r, p, maxmem });
  process.stdout.write(
    `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${hash.toString("base64url")}\n`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not hash password");
  process.exit(1);
}
