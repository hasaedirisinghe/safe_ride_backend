import { describe, expect, it } from "vitest";
import { transitionForScan } from "../services/attendance-state.service.js";

describe("attendance state machine", () => {
  it("boards only from NOT_BOARDED using a boarding scanner", () => {
    expect(transitionForScan("NOT_BOARDED", "BOARDING")).toEqual({ eventType: "BOARDED", next: "ON_BUS" });
    expect(() => transitionForScan("ON_BUS", "BOARDING")).toThrowError(/not valid/i);
  });
  it("exits only from ON_BUS using an exit scanner", () => {
    expect(transitionForScan("ON_BUS", "EXIT")).toEqual({ eventType: "EXITED", next: "EXITED" });
    expect(() => transitionForScan("NOT_BOARDED", "EXIT")).toThrowError(/not valid/i);
  });
  it.each(["EXITED", "DROPPED_OFF"] as const)("rejects scans after %s", (state) => {
    expect(() => transitionForScan(state, "BOARDING")).toThrow();
    expect(() => transitionForScan(state, "EXIT")).toThrow();
  });
});

