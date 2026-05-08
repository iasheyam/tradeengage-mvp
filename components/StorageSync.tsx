"use client";

import { useEffect } from "react";

// Keys managed by this app — only these are persisted to the file
const STORAGE_KEYS = [
  "fb_groups",
  "reddit_subreddits",
  "fb_group_posts",
  "fb_group_runs",
  "reddit_posts",
  "reddit_runs",
  "user_profile",
  "community_statuses",
  "user_id",
  "debug_fb_fetch_last",
  "debug_reddit_fetch_last",
];

async function loadFromFile() {
  try {
    const res = await fetch("/api/storage");
    if (!res.ok) return;
    const data = await res.json() as Record<string, unknown>;
    for (const key of STORAGE_KEYS) {
      if (key in data && data[key] !== null && data[key] !== undefined) {
        // Values in the file are parsed JSON — re-serialize for localStorage
        localStorage.setItem(key, JSON.stringify(data[key]));
      }
    }
  } catch {
    // File missing or server not ready — silent fail, localStorage still works
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function saveToFile() {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  try {
    await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Server unreachable — silent fail
  }
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToFile, 500);
}

export default function StorageSync() {
  useEffect(() => {
    // 1. Hydrate localStorage from file on first load
    loadFromFile();

    // 2. Patch localStorage.setItem so any write auto-saves to file
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key: string, value: string) {
      originalSetItem(key, value);
      if (STORAGE_KEYS.includes(key)) debouncedSave();
    };

    // 3. Also save on tab close / navigation away
    window.addEventListener("beforeunload", saveToFile);

    return () => {
      localStorage.setItem = originalSetItem;
      window.removeEventListener("beforeunload", saveToFile);
    };
  }, []);

  return null;
}
