# Favorites consistency

The client allows one request per card at a time. Own-product attempts are rejected before any optimistic update. Rejected operations restore both membership and the exact previous count, while preserving live auction price/status changes. Late responses for a replaced/disposed card are ignored. Confirmed operations use the server count; older DELETE responses without a count remain supported.

The API stores the favorite and its product counter in one MongoDB transaction. Add/remove are idempotent; only a newly inserted/deleted favorite changes the counter, using atomic increments. Both writes roll back together. DELETE also returns `favoriteCount`. Unique-index races retry with a fresh transaction, and MongoDB retries transient write conflicts. This requires a replica set/sharded deployment (including Atlas), not standalone MongoDB.

Regression checks:

```sh
flutter test test/favorite_mutation_test.dart
cd backend
npm test -- --runInBand
npm run build
MONGO_TEST_URI='<disposable replica-set URI>' npm run test:integration:favorites
```

The integration test requires an explicit `MONGO_TEST_URI` and never loads `.env`. Use a disposable database: it inserts synthetic products/favorites and simulates a counter write failure. It checks self-favorite rejection, concurrent users, repeated/concurrent first adds, repeated removes, and transaction rollback. No live-user credentials are needed.
