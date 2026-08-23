import { beforeEach, describe, expect, it } from "vitest";
import { deleteProfile, listProfiles, loadProfile, profileFromBase64, profileToBase64, saveProfile, withLighting, type Profile } from "./profiles";

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
  it("parses a v1 profile without version or lighting", () => {
    const v1 = {
      id: "v1", name: "v1", createdAt: 1,
      layers: { base: new Array(520).fill(0), fn: new Array(520).fill(0) },
      colors: {}, effect: { num: 3, speed: null, brightness: null, colorful: true, color: null },
      sleepMinutes: 0, debounceMs: 3, raw: "",
    };
    localStorage.setItem("aula-f75.profiles", JSON.stringify([v1]));
    expect(loadProfile("v1")?.name).toBe("v1");
    expect(loadProfile("v1")?.lighting).toBeUndefined();
  });
  it("withLighting returns a v2 copy preserving keybinds", () => {
    const p = mk("w"); p.layers.base[9] = 0x04;
    const q = withLighting(p, new Uint8Array(128).fill(7));
    expect(q.version).toBe(2);
    expect(q.lighting).toHaveLength(128);
    expect(q.lighting?.[5]).toBe(7);
    expect(q.layers.base[9]).toBe(0x04);
    expect(p.lighting).toBeUndefined();
  });
  it("round-trips lighting through save/load and base64", () => {
    const p = withLighting(mk("r"), new Uint8Array(128).fill(9));
    p.layers.fn[3] = 0x02;
    saveProfile(p);
    const loaded = loadProfile("r");
    expect(loaded?.lighting).toEqual(new Array(128).fill(9));
    expect(loaded?.layers.fn[3]).toBe(0x02);
    const back = profileFromBase64(profileToBase64(p));
    expect(back.lighting).toHaveLength(128);
    expect(back.lighting?.[0]).toBe(9);
    expect(back.layers.fn[3]).toBe(0x02);
  });
  it("applies a v1 profile without lighting without throwing", () => {
    saveProfile(mk("nv"));
    const p = loadProfile("nv");
    let region: Uint8Array | null = null;
    expect(() => { if (p?.lighting) region = Uint8Array.from(p.lighting); }).not.toThrow();
    expect(region).toBeNull();
  });
});