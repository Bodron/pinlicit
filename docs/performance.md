# Performance contract

This records resource limits and repeatable checks, not unmeasured speed claims.

## Implemented limits

- Selling: the Sell tab opens the publishing form; Activity separates purchases from sales. Each section loads on first access and retains state. Publishing clears only the completed draft and refreshes inventory. Sales inventory renders at most six cards per page; inactive Activity sections suspend animation tickers.
- Navigation: one application scaffold/header/navigation bar. Branches load on first access and retain state. Authentication disposes the authenticated shell on logout.
- Feed: product photographs use Flutter image loading/cache and a repaint boundary. No native media player is allocated.
- Live auctions: only the active, visible card connects. Covering the feed, switching cards, backgrounding, and disposal disconnect it. Callbacks from replaced connections are ignored.
- Reads: concurrent identical feed, favorites, bids, and category requests share their network request. Mutable auction/account data is not retained in a time-based cache. Categories have a five-minute TTL. The request cache is limited to 32 entries and is cleared on token changes. Errors do not poison retries.
- Feed loading: only the latest selection can commit its result; stale completions cannot replace a newer category. Publishing explicitly refreshes cached lists.
- Painting: the product photograph has a repaint boundary separate from auction UI. Avoid removing blur, imagery, or other design elements without measuring their raster cost.

## Measurement

Use a physical device in profile mode; simulator/debug timings are not a production baseline:

```sh
flutter run --profile -d <device-id> \
  --dart-define=API_BASE_URL=http://<LAN-IP>:3000 \
  --dart-define=PERF_METRICS=true
```

`PERF_METRICS` is off by default and disabled in release builds. It logs API path/status/duration without payloads, tokens, or query strings. Every 120 rendered frames it reports UI/raster p95 and frames exceeding the device-reported refresh-rate budget. Use Flutter DevTools for timeline, allocations/native memory, and image/network investigation; the counters alone cannot diagnose all stalls.

Repeat the same flow on the same device/network/build:

1. Launch and open the feed. Record API calls, time to first visible image, memory, UI/raster p95.
2. Swipe through 20 photographs, reverse direction, then repeat. Observe decoded-image memory and whether it stabilizes.
3. Switch Feed/Explore/Profile ten times. Existing pages should retain state rather than rerun initial loading. Enter categories rapidly; the final category must win.
4. Open details, switch tabs, and background/resume. There must be no active feed auction connection when hidden.
5. Toggle favorites, publish a listing, sign out, sign into another account. Verify correctness/invalidation alongside timings.

Track startup/image-first-frame, API latency and call counts, memory after warmup/20/40 swipes, and UI/raster p95. At 60 Hz each pipeline stage has about 16.7 ms; at 120 Hz about 8.3 ms. Agree startup/image/memory targets using the first physical-device baseline rather than fabricating percentage gains.

## Regression checks

```sh
flutter analyze
flutter test
```

Tests cover retained branch state and scroll, one shared layout, nested navigation, request coalescing/TTL/LRU/session invalidation/errors and favorite mutations.

## Next decisions requiring evidence

- Images: measure download size, decoded-image memory and CDN headers before adding prefetch or disk cache.
- Lists: current feed requests are capped at 30 but have no continuation cursor. Implement cursor pagination with a matching database index before expanding the catalogue beyond this window; client-side virtualization alone does not solve this.
- API/database: inspect slow query plans and payload sizes on representative data before changing indexes or response projections. Do not run schema/index mutations against the cloud database as part of a UI optimization.
- Cache: use explicit mutation invalidation and appropriate freshness rules before extending TTLs to auction prices or personal data.
