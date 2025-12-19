import { err, ok, type Result } from "@storyteller/shared/result.ts";

export interface FileSystemGateway {
  ensureDir(path: string): Promise<Result<void, FileSystemError>>;
  writeFile(
    path: string,
    content: string,
  ): Promise<Result<void, FileSystemError>>;
  exists(path: string): Promise<Result<boolean, FileSystemError>>;
  readFile(path: string): Promise<Result<string, FileSystemError>>;
}

export interface FileSystemError {
  readonly code: "io_error" | "not_found" | "permission_denied";
  readonly message: string;
  readonly cause?: unknown;
}

export class DenoFileSystemGateway implements FileSystemGateway {
  async ensureDir(path: string): Promise<Result<void, FileSystemError>> {
    try {
      await Deno.mkdir(path, { recursive: true });
      return ok(undefined);
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        return err({
          code: "permission_denied",
          message: `Cannot create directory: ${path}`,
          cause: error,
        });
      }
      return err({
        code: "io_error",
        message: `Failed to create directory: ${path}`,
        cause: error,
      });
    }
  }

  async writeFile(
    path: string,
    content: string,
  ): Promise<Result<void, FileSystemError>> {
    try {
      const parent = path.slice(0, path.lastIndexOf("/"));
      if (parent) {
        await Deno.mkdir(parent, { recursive: true });
      }
      await Deno.writeTextFile(path, content);
      return ok(undefined);
    } catch (error) {
      if (error instanceof Deno.errors.PermissionDenied) {
        return err({
          code: "permission_denied",
          message: `Cannot write file: ${path}`,
          cause: error,
        });
      }
      return err({
        code: "io_error",
        message: `Failed to write file: ${path}`,
        cause: error,
      });
    }
  }

  async exists(path: string): Promise<Result<boolean, FileSystemError>> {
    try {
      await Deno.lstat(path);
      return ok(true);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return ok(false);
      }
      if (error instanceof Deno.errors.PermissionDenied) {
        return err({
          code: "permission_denied",
          message: `Cannot access path: ${path}`,
          cause: error,
        });
      }
      return err({
        code: "io_error",
        message: `Failed to access path: ${path}`,
        cause: error,
      });
    }
  }

  async readFile(path: string): Promise<Result<string, FileSystemError>> {
    try {
      const content = await Deno.readTextFile(path);
      return ok(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return err({
          code: "not_found",
          message: `File not found: ${path}`,
          cause: error,
        });
      }
      if (error instanceof Deno.errors.PermissionDenied) {
        return err({
          code: "permission_denied",
          message: `Cannot read file: ${path}`,
          cause: error,
        });
      }
      return err({
        code: "io_error",
        message: `Failed to read file: ${path}`,
        cause: error,
      });
    }
  }
}
