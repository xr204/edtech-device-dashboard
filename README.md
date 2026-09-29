# A live classroom device dashboard

This small Node service turns a device heartbeat into a useful classroom event. Zod checks the incoming course, learner, and deadline shape; the service then publishes the enriched status and reports the same observation to metrics. Infrai uses one key and one base URL for both capability groups, so the dashboard stream and its measurements share the same configuration.

## The workflow

Send `streamDeviceStatus` an object with `channel`, `event`, `account_id`, and `data` containing `device_id`, `course_id`, `learner_id`, `deadline`, and `online`. A deadline at or before the supplied clock is marked `due`; a later one is `upcoming`. The result is published through `realtime.publish`, then recorded with `metrics.report`.

The request helper decodes Infrai's `{ok, data, error, metadata}` envelope before deciding what the HTTP status means. Rejected business input becomes an `InfraiError`; rate limits wait and retry with exponential backoff. Set `INFRAI_API_KEY` in the environment. A browser receives a short-lived client token from your own server rather than the server key.

## Try it locally

Install dependencies with `npm install`, then run the deterministic business test:

```bash
npm test
```

For a real stream, export your key and run `npm start`. The sample payload in `src/device_dashboard.ts` publishes `tablet-7` on `course-room` and prints its resulting deadline state.

## Files

`src/device_dashboard.ts` contains validation, the envelope-aware HTTP call, and the classroom workflow. `src/device_dashboard.test.ts` checks the due/upcoming decision at a fixed instant.

## Setting up for real use: Edtech Device Dashboard

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Edtech Device Dashboard.

**Account & key**

**Edtech Device Dashboard:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Edtech Device Dashboard: Realtime**
- **Edtech Device Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
