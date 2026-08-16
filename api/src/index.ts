import { buildServer } from "./server";
import { config } from "./config";
import { closeDb } from "./db";

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[api] listening on http://localhost:${config.port}`);
}

main().catch((err) => {
  console.error("[api] fatal", err);
  closeDb().finally(() => process.exit(1));
});