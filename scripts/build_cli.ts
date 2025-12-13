#!/usr/bin/env -S deno run --allow-read --allow-write

import { parse } from "@std/cli/parse";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";
import {
  computeSha256Hex,
  createBuildManifest,
} from "../src/infrastructure/cli/build_manifest.ts";

interface CliArgs {
  version?: string;
  out?: string;
  artifacts?: string | string[];
}

const args = parse(Deno.args, {
  string: ["version", "out", "artifacts"],
  alias: {
    v: "version",
    o: "out",
    a: "artifacts",
  },
}) as CliArgs;

const version = args.version ?? "0.0.0-dev";
const outDir = args.out ?? "dist";
const artifactsArg = args.artifacts;

const artifactPaths = Array.isArray(artifactsArg)
  ? artifactsArg
  : artifactsArg
  ? [artifactsArg]
  : [];

if (artifactPaths.length === 0) {
  console.error(
    "No artifacts provided. Use --artifacts <path> for each binary.",
  );
  Deno.exit(1);
}

const artifacts = [];
for (const path of artifactPaths) {
  const checksum = await computeSha256Hex(path);
  const stat = await Deno.stat(path);
  artifacts.push({
    name: basename(path),
    checksum,
    size: stat.size,
    path,
  });
}

const manifest = createBuildManifest(version, artifacts);

await Deno.mkdir(outDir, { recursive: true });
const manifestPath = join(outDir, "storyteller-manifest.json");
await Deno.writeTextFile(
  manifestPath,
  JSON.stringify(manifest, null, 2) + "\n",
);

console.log(`Manifest written to ${manifestPath}`);
