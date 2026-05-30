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
    `[Warning] Could not remove ${nextDir}: ${error.message}.\n` +
      `If this is a Windows EPERM permission lock, you may need to stop any running dev servers, or Next.js will overwrite existing files in-place during compile.`
  );
}
