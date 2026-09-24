import assert from "node:assert/strict";
import { deadlineState } from "./device_dashboard.ts";

const now = new Date("2030-06-01T12:00:00Z");
assert.equal(deadlineState("2030-06-01T11:59:59Z", now), "due");
assert.equal(deadlineState("2030-06-01T12:00:01Z", now), "upcoming");
console.log("deadline state decision passed");
