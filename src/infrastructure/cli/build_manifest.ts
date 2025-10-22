export interface BuildManifestArtifact {
  readonly name: string;
  readonly checksum: string;
  readonly size: number;
  readonly path: string;
}

export interface BuildManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly artifacts: readonly BuildManifestArtifact[];
}

export async function computeSha256Hex(path: string): Promise<string> {
  const data = await Deno.readFile(path);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createBuildManifest(
  version: string,
  artifacts: readonly BuildManifestArtifact[],
): BuildManifest {
  const sortedArtifacts = [...artifacts].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  return {
    version,
    generatedAt: new Date().toISOString(),
    artifacts: sortedArtifacts,
  };
}
