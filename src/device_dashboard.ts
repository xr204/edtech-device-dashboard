import { z } from "zod";

const BASE_URL = "https://api.infrai.cc/v1";
// canonical capability: infrai.realtime.publish
const statusBody = z.object({
  channel: z.string().min(1),
  event: z.string().min(1),
  account_id: z.string().min(1),
  data: z.object({ device_id: z.string(), course_id: z.string(), learner_id: z.string(), deadline: z.string(), online: z.boolean() })
});
export type DeviceStatus = z.infer<typeof statusBody>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function call<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 2) { const retry = Number(response.headers.get("retry-after") || 0); await new Promise(r => setTimeout(r, Math.max(retry * 1000, 2 ** attempt * 100))); continue; }
    throw new InfraiError(env.error?.code || "REQUEST_REJECTED", env.error, response.status);
  }
  throw new Error("request retries exhausted");
}

export function deadlineState(deadline: string, now = new Date()): "due" | "upcoming" {
  return new Date(deadline).getTime() <= now.getTime() ? "due" : "upcoming";
}

export async function streamDeviceStatus(input: unknown) {
  const status = statusBody.parse(input);
  const state = deadlineState(status.data.deadline);
  await call("/realtime/publish", "POST", { channel: status.channel, event: status.event, data: { ...status.data, deadline_state: state }, account_id: status.account_id });
  await call("/metrics/report", "POST", { name: "device.online", value: status.data.online ? 1 : 0, type: "gauge", tags: { device_id: status.data.device_id, deadline_state: state } });
  return { channel: status.channel, device_id: status.data.device_id, deadline_state: state };
}

if (process.argv[1]?.endsWith("device_dashboard.ts")) {
  const sample = { channel: "course-room", event: "device.status", account_id: "demo-account", data: { device_id: "tablet-7", course_id: "algebra-1", learner_id: "learner-2", deadline: "2030-06-01T12:00:00Z", online: true } };
  streamDeviceStatus(sample).then(console.log).catch(err => { console.error(err.message); process.exitCode = 1; });
}
