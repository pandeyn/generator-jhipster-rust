// Blueprint command registration entry point.
//
// generator-jhipster's environment builder probes every loaded blueprint for
// a `<blueprint>/cli/commands.{js,cjs,mjs,ts,cts,mts}` module that
// default-exports a commands object. When the file is missing it logs
// `INFO! No custom commands found within blueprint: ...` on every CLI
// invocation (including `jhipster-rust --version`), which pollutes
// script-friendly output and any pipeline consuming stdout.
//
// Exporting an empty object satisfies the loader without registering any
// extra subcommands. Add entries here when the blueprint needs to ship
// `jhipster-rust <something>` beyond what the parent CLI already exposes.

export default {};
