import { readFileSync, writeFileSync } from "node:fs"
import { structuredExperiments } from "../src/structured-experiments.ts"
import { buildImportPrompt } from "../src/lib/experiment-data.ts"

const target = new URL("../server/internal/httpapi/mcp-catalog.json", import.meta.url)
const catalog = structuredExperiments.map((experiment) => ({
  ...experiment,
  ocrPrompt: buildImportPrompt(experiment),
}))
const content = JSON.stringify(catalog, null, 2) + "\n"
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8").replaceAll("\r\n", "\n") !== content) {
    throw new Error("MCP 实验目录已过期，请运行 node scripts/mcp-catalog.mjs")
  }
} else {
  writeFileSync(target, content)
}
