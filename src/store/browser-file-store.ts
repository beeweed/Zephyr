import type { BrowserFileRecord, FileReadArgs, FileWriteArgs, ToolExecutionResult } from "@/types/agent";

const DB_NAME = "vibe-coder-browser-fs";
const DB_VERSION = 1;
const STORE_NAME = "files";
const ROOT_PREFIX = "/home/user/";

let dbPromise: Promise<IDBDatabase> | null = null;

export class BrowserFileStore {
  static async listFiles(): Promise<BrowserFileRecord[]> {
    const db = await openDatabase();
    return transaction<BrowserFileRecord[]>(db, "readonly", (store, resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const rows = (request.result as BrowserFileRecord[]).sort((a, b) => a.path.localeCompare(b.path));
        resolve(rows);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to list files."));
    });
  }

  static async readFile(args: FileReadArgs): Promise<ToolExecutionResult> {
    const validation = validatePath(args.file_path, "file_read");
    if (!validation.ok) {
      return validation.result;
    }

    const db = await openDatabase();
    const record = await transaction<BrowserFileRecord | undefined>(db, "readonly", (store, resolve, reject) => {
      const request = store.get(args.file_path);
      request.onsuccess = () => resolve(request.result as BrowserFileRecord | undefined);
      request.onerror = () => reject(request.error ?? new Error("Failed to read file."));
    });

    if (!record) {
      return {
        ok: false,
        tool: "file_read",
        file_path: args.file_path,
        error: {
          code: "ENOENT",
          message: `File does not exist: ${args.file_path}`,
        },
      };
    }

    const numbered = withLineNumbers(record.content);
    return {
      ok: true,
      tool: "file_read",
      file_path: record.path,
      content: numbered,
      bytes: new Blob([record.content]).size,
      line_count: record.content.length === 0 ? 0 : record.content.split(/\r?\n/).length,
    };
  }

  static async writeFile(args: FileWriteArgs): Promise<ToolExecutionResult> {
    const validation = validatePath(args.file_path, "file_write");
    if (!validation.ok) {
      return validation.result;
    }
    if (typeof args.content !== "string") {
      return {
        ok: false,
        tool: "file_write",
        file_path: args.file_path,
        error: {
          code: "EINVAL",
          message: "file_write content must be a string.",
        },
      };
    }

    const db = await openDatabase();
    const existing = await transaction<BrowserFileRecord | undefined>(db, "readonly", (store, resolve, reject) => {
      const request = store.get(args.file_path);
      request.onsuccess = () => resolve(request.result as BrowserFileRecord | undefined);
      request.onerror = () => reject(request.error ?? new Error("Failed to inspect file."));
    });

    const now = new Date().toISOString();
    const record: BrowserFileRecord = {
      path: args.file_path,
      content: args.content,
      size: new Blob([args.content]).size,
      updatedAt: now,
      createdAt: existing?.createdAt ?? now,
      kind: "file",
    };

    await transaction<void>(db, "readwrite", (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to write file."));
    });

    return {
      ok: true,
      tool: "file_write",
      file_path: record.path,
      bytes: record.size,
      line_count: args.content.length === 0 ? 0 : args.content.split(/\r?\n/).length,
    };
  }

  static async deleteFile(path: string): Promise<void> {
    const db = await openDatabase();
    await transaction<void>(db, "readwrite", (store, resolve, reject) => {
      const request = store.delete(path);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to delete file."));
    });
  }

  static async clear(): Promise<void> {
    const db = await openDatabase();
    await transaction<void>(db, "readwrite", (store, resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to clear files."));
    });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "path" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open browser file database."));
  });

  return dbPromise;
}

function transaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: unknown) => void) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
    run(store, resolve, reject);
  });
}

function validatePath(filePath: string, tool: "file_read" | "file_write"): { ok: true } | { ok: false; result: ToolExecutionResult } {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return {
      ok: false,
      result: {
        ok: false,
        tool,
        error: { code: "EINVAL", message: "file_path must be a non-empty string." },
      },
    };
  }

  if (!filePath.startsWith(ROOT_PREFIX) || filePath.includes("\0")) {
    return {
      ok: false,
      result: {
        ok: false,
        tool,
        file_path: filePath,
        error: {
          code: "EACCES",
          message: "file_path must be an absolute path starting with /home/user/.",
        },
      },
    };
  }

  return { ok: true };
}

function withLineNumbers(content: string): string {
  if (content.length === 0) return "";
  return content
    .split(/\r?\n/)
    .map((line, index) => `${String(index + 1).padStart(5, " ")}\t${line}`)
    .join("\n");
}
