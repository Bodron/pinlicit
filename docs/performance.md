# Performance contract

This records resource limits and repeatable checks, not unmeasured speed claims.

## Implemented limits

- Selling: the Sell tab opens the publishing form; Activity separates purchases from sales. Each section loads on first access and retains state. Publishing clears only the completed draft and refreshes inventory. Sales inventory renders at most six cards per page; inactive Activity sections suspend animation tickers.
- Navigation: one application scaffold/header/navigation bar. Branches load on first access and retain state. Authentication disposes the authenticated shell on logout.
- Feed: one centrally owned native player; cleanup finishes before allocating its replacement. Leaving the feed or backgrounding the app releases it. Up to 32 playback positions are retained, not 32 players.
- Live auctions: only the active, visible card connects. Covering the feed, switching cards, backgrounding, and disposal disconnect it. Callbacks from replaced connections are ignored.
- Reads: concurrent identical feed, favorites, bids, and category requests share their network request. Mutable auction/account data is not retained in a time-based cache. Categories have a five-minute TTL. The request cache is limited to 32 entries and is cleared on token changes. Errors do not poison retries.
- Feed loading: only the latest selection can commit its result; stale completions cannot replace a newer category. Publishing explicitly refreshes cached lists.
- Painting: video has a repaint boundary separate from auction UI. Avoid removing blur, imagery, or other design elements without measuring their raster cost.

The one-player policy prioritizes bounded native memory/network use. It reinitializes video on revisiting a clip, restoring its position. It does **not** implement prefetch or disk caching. If measured time to first frame is unacceptable, the next experiment is a two-player current/next pool with the same cancellation and eviction guarantees, compared against this baseline.

## Measurement

Use a physical device in profile mode; simulator/debug timings are not a production baseline:

```sh
flutter run --profile -d <device-id> \
  --dart-define=API_BASE_URL=http://<LAN-IP>:3000 \
  --dart-define=PERF_METRICS=true
```

`PERF_METRICS` is off by default and disabled in release builds. It logs API path/status/duration without payloads, tokens, or query strings. Every 120 rendered frames it reports UI/raster p95 and frames exceeding the device-reported refresh-rate budget. Use Flutter DevTools for timeline, allocations/native memory, and image/video/network investigation; the counters alone cannot diagnose all stalls.

Repeat the same flow on the same device/network/build:

1. Launch and open the feed. Record API calls, time to first visible video, memory, UI/raster p95.
2. Swipe through 20 videos, reverse direction, then repeat. Observe native-player/resource counts and whether memory stabilizes. A single-player policy does not imply constant total application memory.
3. Switch Feed/Explore/Profile ten times. Existing pages should retain state rather than rerun initial loading. Enter categories rapidly; the final category must win.
4. Open details, switch tabs, and background/resume. There must be no audible feed playback or active feed auction connection when hidden.
5. Toggle favorites, publish a listing, sign out, sign into another account. Verify correctness/invalidation alongside timings.

Track startup/video-first-frame, API latency and call counts, memory after warmup/20/40 swipes, and UI/raster p95. At 60 Hz each pipeline stage has about 16.7 ms; at 120 Hz about 8.3 ms. Agree startup/video/memory targets using the first physical-device baseline rather than fabricating percentage gains.

## Regression checks

```sh
flutter analyze
flutter test
```

Tests cover retained branch state and scroll, one shared layout, nested navigation, request coalescing/TTL/LRU/session invalidation/errors, and player cleanup/stale initialization/background release/position restoration.

## Next decisions requiring evidence

- Video: measure first-frame latency, source resolution/bitrate and CDN headers before deciding prefetch, adaptive streaming or disk cache.
- Lists: current feed requests are capped at 30 but have no continuation cursor. Implement cursor pagination with a matching database index before expanding the catalogue beyond this window; client-side virtualization alone does not solve this.
- API/database: inspect slow query plans and payload sizes on representative data before changing indexes or response projections. Do not run schema/index mutations against the cloud database as part of a UI optimization.
- Cache: use explicit mutation invalidation and appropriate freshness rules before extending TTLs to auction prices or personal data.
