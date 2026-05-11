const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");

try {
  fs.rmSync(nextDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 500,
  });
} catch (error) {
  console.warn(
    `Could not remove ${nextDir}. If this is Windows EPERM, stop any running Next processes and delete .next before rebuilding.`,
  );
  throw error;
}
