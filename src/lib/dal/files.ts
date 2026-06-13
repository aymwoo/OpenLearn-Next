import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pluginFiles } from "@/db/schema";

export type FileRecord = typeof pluginFiles.$inferSelect;

export async function getFileBySha256(
  schoolId: string,
  pluginId: string,
  sha256: string,
) {
  // TODO: implement
  return null;
}

export async function insertFileRecord(_input: unknown) {
  // TODO: implement
  throw new Error("Not implemented");
}

export async function getFileRecord(
  _schoolId: string,
  _pluginId: string,
  _fileId: string,
) {
  // TODO: implement
  return null;
}

export async function listFiles(_input: {
  schoolId: string;
  pluginId: string;
  prefix: string;
  cursor?: string;
  limit: number;
}) {
  // TODO: implement
  return { files: [], nextCursor: null };
}

export async function getFileMetadata(
  _schoolId: string,
  _pluginId: string,
  _fileId: string,
) {
  // TODO: implement
  return null;
}

export async function softDeleteFile(
  _schoolId: string,
  _pluginId: string,
  _fileId: string,
) {
  // TODO: implement
  return null;
}
