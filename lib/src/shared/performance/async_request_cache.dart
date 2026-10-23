/// Coalesces concurrent reads; only explicitly given TTLs retain completed data.
/// Failed and invalidated requests never populate the cache.
class AsyncRequestCache {
  AsyncRequestCache({this.maxEntries = 32, DateTime Function()? now})
    : assert(maxEntries > 0),
      _now = now ?? DateTime.now;

  final int maxEntries;
  final DateTime Function() _now;
  final _entries = <String, _RequestEntry>{};

  Future<T> read<T>(
    String key,
    Future<T> Function() load, {
    Duration ttl = Duration.zero,
  }) {
    final previous = _entries.remove(key);
    if (previous != null &&
        (previous.expiresAt == null || previous.expiresAt!.isAfter(_now()))) {
      _entries[key] = previous;
      return previous.future.then((value) => value as T);
    }
    final entry = _RequestEntry();
    _entries[key] = entry;
    while (_entries.length > maxEntries) {
      _entries.remove(_entries.keys.first);
    }
    final result = Future<T>.sync(load).then(
      (value) {
        if (identical(_entries[key], entry)) {
          if (ttl == Duration.zero) {
            _entries.remove(key);
          } else {
            entry.expiresAt = _now().add(ttl);
          }
        }
        return value;
      },
      onError: (Object error, StackTrace stack) {
        if (identical(_entries[key], entry)) _entries.remove(key);
        Error.throwWithStackTrace(error, stack);
      },
    );
    entry.future = result;
    return result;
  }

  void invalidate(String key) => _entries.remove(key);
  void clear() => _entries.clear();
}

class _RequestEntry {
  late Future<Object?> future;
  DateTime? expiresAt;
}
