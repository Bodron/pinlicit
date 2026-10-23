import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/performance/async_request_cache.dart';

void main() {
  test(
    'concurrent reads share one request; live data is read fresh afterward',
    () async {
      final cache = AsyncRequestCache();
      final response = Completer<int>();
      var calls = 0;
      Future<int> load() {
        calls++;
        return response.future;
      }

      final first = cache.read('feed', load);
      final second = cache.read('feed', load);
      expect(calls, 1);
      response.complete(10);
      expect(await Future.wait([first, second]), [10, 10]);
      expect(
        await cache.read('feed', () async {
          calls++;
          return 11;
        }),
        11,
      );
      expect(calls, 2);
    },
  );

  test('TTL starts on success and expires with a controllable clock', () async {
    var now = DateTime.utc(2026);
    final cache = AsyncRequestCache(now: () => now);
    var calls = 0;
    Future<int> read() => cache.read(
      'categories',
      () async => ++calls,
      ttl: const Duration(minutes: 5),
    );
    expect(await read(), 1);
    now = now.add(const Duration(minutes: 4));
    expect(await read(), 1);
    now = now.add(const Duration(minutes: 1));
    expect(await read(), 2);
  });

  test('failed requests do not poison subsequent retries', () async {
    final cache = AsyncRequestCache();
    await expectLater(
      cache.read<int>('feed', () async => throw StateError('offline')),
      throwsStateError,
    );
    expect(await cache.read('feed', () async => 42), 42);
  });

  test('invalidating an in-flight read cannot replace newer data', () async {
    final cache = AsyncRequestCache();
    final oldResponse = Completer<int>();
    final old = cache.read(
      'favorites',
      () => oldResponse.future,
      ttl: const Duration(minutes: 1),
    );
    cache.invalidate('favorites');
    expect(
      await cache.read(
        'favorites',
        () async => 2,
        ttl: const Duration(minutes: 1),
      ),
      2,
    );
    oldResponse.complete(1);
    expect(await old, 1);
    expect(await cache.read('favorites', () async => 3), 2);
  });

  test('LRU has a fixed capacity and reads renew recency', () async {
    final cache = AsyncRequestCache(maxEntries: 2);
    Future<int> read(String key, int value) =>
        cache.read(key, () async => value, ttl: const Duration(minutes: 1));
    await read('a', 1);
    await read('b', 2);
    expect(await read('a', 99), 1);
    await read('c', 3);
    expect(await read('b', 4), 4);
  });

  test(
    'clear isolates sessions even if a previous request completes late',
    () async {
      final cache = AsyncRequestCache();
      final old = Completer<int>();
      final pending = cache.read(
        'user',
        () => old.future,
        ttl: const Duration(minutes: 5),
      );
      cache.clear();
      expect(
        await cache.read(
          'user',
          () async => 2,
          ttl: const Duration(minutes: 5),
        ),
        2,
      );
      old.complete(1);
      await pending;
      expect(await cache.read('user', () async => 3), 2);
    },
  );
}
