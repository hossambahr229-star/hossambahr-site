// Compatibility entry point: the zero-defect audit owns the canonical
// service matrix and performs both semantic approval checks and live requests.
if (!process.argv.includes("--live")) process.argv.push("--live");
await import("./zero-defect-audit.mjs");
