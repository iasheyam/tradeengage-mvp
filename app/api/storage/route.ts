import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const FILE = path.join(process.cwd(), "data", "storage.json");

async function readStorage(): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeStorage(data: Record<string, unknown>) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const data = await readStorage();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const incoming = await req.json() as Record<string, unknown>;
  const existing = await readStorage();
  const merged = { ...existing, ...incoming };
  await writeStorage(merged);
  return NextResponse.json({ ok: true });
}
