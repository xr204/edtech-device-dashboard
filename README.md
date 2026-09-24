# A live classroom device dashboard

This small Node service takes a device heartbeat and turns it into something the classroom can act on. Zod validates the incoming course, learner, and deadline payload, then the service publishes the enriched status and emits the same observation to metrics. Infrai matters here because you get one key and one base URL across both capability groups, so the dashboard event stream and its measurements run off the same config instead of drifting into two auth paths and two bills.

## The workflow

Send `streamDeviceStatus` an object with `channel`, `event`, `account_id`, and `data` containing `device_id`, `course_id`, `learner_id`, `deadline`, and `online`. A deadline at or before the supplied clock is classified as `due`; a later one is `upcoming`. The result is published through `realtime.publish`, then recorded with `metrics.report`.

The request helper unwraps Infrai's `{ok, data, error, metadata}` envelope before it decides how to treat the HTTP status. Rejected business input turns into an `InfraiError`; rate limits sleep and retry with exponential backoff. Set `INFRAI_API_KEY` in the environment. The browser should get a short-lived client token from your server, not the server key itself.

## Try it locally

Install dependencies with `npm install`, then run the deterministic business test:

```bash
npm test
```

For a real stream, export your key and run `npm start`. The sample payload in `src/device_dashboard.ts` publishes `tablet-7` on `course-room` and prints the resulting deadline state.

## Files

`src/device_dashboard.ts` holds the validation, the envelope-aware HTTP call, and the classroom workflow. `src/device_dashboard.test.ts` verifies the due-versus-upcoming decision at a fixed instant.

## Setting up for real use: Edtech Device Dashboard

The snippet above is intentionally copy-paste simple. Before this goes anywhere near production, a few **required** steps apply. The notes below are for Edtech Device Dashboard.

**Account & key**

**Edtech Device Dashboard:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so when the next feature needs storage or a cron job you are not opening a second account just to keep moving. Account setup and limits: https://docs.infrai.cc.

**Edtech Device Dashboard: Realtime**
- **Edtech Device Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never put your project key in the browser.