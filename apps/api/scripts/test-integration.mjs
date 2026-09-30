// Reset and seed the integration test database, then run the integration tests against it.
// Usage: TEST_DATABASE_URL=postgresql://.../cognitia_test npm run test:integration
import "dotenv/config";
import { spawnSync } from "node:child_process";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("Set TEST_DATABASE_URL to a separate database, e.g. postgresql://postgres:postgres@localhost:5432/cognitia_test");
  process.exit(1);
}
const dbName = new URL(testUrl).pathname.replace(/^\//, "");
if (testUrl === process.env.DATABASE_URL || !/test/i.test(dbName)) {
  // The reset wipes everything, so refuse anything that doesn't look like a throwaway database
  console.error(`Refusing to reset "${dbName}": TEST_DATABASE_URL must differ from DATABASE_URL and name a *test* database.`);
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: testUrl, NODE_ENV: "test", AI_PLATFORM_API_KEY: "" };
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("npx", ["prisma", "migrate", "reset", "--force", "--skip-seed"]);
run("node", ["prisma/seed.js"]);
run("node", [
  "--experimental-vm-modules",
  "node_modules/jest/bin/jest.js",
  "--runInBand",
  "--forceExit",
  "src/tests/integration",
]);
