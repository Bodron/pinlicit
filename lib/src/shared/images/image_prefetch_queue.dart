import 'dart:async';

/// One download at a time; rapid swipes replace the pending item instead of
/// accumulating a queue of photos the user has already skipped.
class ImagePrefetchQueue {
  ImagePrefetchQueue(this.download);
  final Future<void> Function(String url) download;
  String? _desired;
  bool _running = false;

  void select(String? url) {
    _desired = url;
    if (!_running && url != null) unawaited(_drain());
  }

  Future<void> _drain() async {
    _running = true;
    try {
      while (_desired != null) {
        final url = _desired!;
        _desired = null;
        try {
          await download(url);
        } catch (_) {
          /* Rendering owns any visible error. */
        }
      }
    } finally {
      _running = false;
    }
  }
}
