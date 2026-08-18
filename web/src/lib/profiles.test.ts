import { beforeEach, describe, expect, it } from "vitest";
import { deleteProfile, listProfiles, loadProfile, profileFromBase64, profileToBase64, saveProfile, type Profile } from "./profiles";

class Store {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
beforeEach(() => {
  (globalThis as any).localStorage = new Store();
});

function mk(name: string): Profile {
  return {
    id: name, name, createdAt: 1,
    layers: { base: new Uint8Array(520), fn: new Uint8Array(520) },
    colors: { 0: [255, 0, 0] },
    effect: { num: 3, speed: 2, brightness: 4, colorful: true, color: null },
    sleepMinutes: 30, debounceMs: 2, raw: "",
  };
}

describe("profiles", () => {
  it("saves and lists", () => {
    saveProfile(mk("p1"));
    expect(listProfiles().map((p) => p.name)).toEqual(["p1"]);
  });
  it("round-trips a load", () => {
    saveProfile(mk("p2"));
    expect(loadProfile("p2")?.name).toBe("p2");
  });
  it("persists layer bytes through localStorage", () => {
    const p = mk("q"); p.layers.base[9] = 0x04;
    saveProfile(p);
    expect(loadProfile("q")?.layers.base[9]).toBe(0x04);
  });
  it("deletes", () => {
    saveProfile(mk("p3"));
    deleteProfile("p3");
    expect(listProfiles()).toHaveLength(0);
  });
  it("base64 export/import preserves layers", () => {
    const p = mk("x"); p.layers.base[9] = 0x4;
    const s = profileToBase64(p);
    const q = profileFromBase64(s);
    expect(q.layers.base[9]).toBe(0x4);
    expect(q.name).toBe("x");
  });
});