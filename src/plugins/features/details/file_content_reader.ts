export type FileReadResult =
  | { ok: true; value: string }
  | { ok: false; error: { type: "file_not_found" | "io"; filePath: string; message: string } };

export type HybridField = string | { file: string } | undefined;

export class FileContentReader {
  constructor(private readonly projectRoot: string) {}

  async readFileContent(fileRef: string, sourceFilePath = ""): Promise<FileReadResult> {
    const filePath = this.resolvePath(fileRef, sourceFilePath);
    try {
      const raw = await Deno.readTextFile(filePath);
      return { ok: true, value: stripFrontmatter(raw) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          type: message.includes("No such file") ? "file_not_found" : "io",
          filePath,
          message,
        },
      };
    }
  }

  async resolveHybridField(
    field: HybridField,
    sourceFilePath = "",
  ): Promise<FileReadResult | { ok: true; value: undefined }> {
    if (field === undefined) {
      return { ok: true, value: undefined };
    }
    if (typeof field === "string") {
      return { ok: true, value: field };
    }
    return await this.readFileContent(field.file, sourceFilePath);
  }

  private resolvePath(fileRef: string, sourceFilePath: string): string {
    if (fileRef.startsWith("/")) {
      return fileRef;
    }
    if (fileRef.startsWith("./") && sourceFilePath !== "") {
      const sourceDir = sourceFilePath.split("/").slice(0, -1).join("/");
      return `${this.projectRoot}/${sourceDir}/${fileRef}`.replaceAll("/./", "/");
    }
    return `${this.projectRoot}/${fileRef}`;
  }
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith("---")) {
    return raw;
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return raw;
  }
  return raw.slice(end + 4).replace(/^\r?\n/, "");
}
