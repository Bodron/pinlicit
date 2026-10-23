import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:video_player/video_player.dart';

abstract class FeedVideoHandle {
  VideoPlayerController? get controller;
  Duration get position;
  Future<void> initialize();
  Future<void> setLooping();
  Future<void> seekTo(Duration position);
  Future<void> play();
  Future<void> dispose();
}

class _NativeVideoHandle implements FeedVideoHandle {
  _NativeVideoHandle(String url)
    : controller = VideoPlayerController.networkUrl(Uri.parse(url));

  @override
  final VideoPlayerController controller;
  @override
  Duration get position => controller.value.position;
  @override
  Future<void> initialize() => controller.initialize();
  @override
  Future<void> setLooping() => controller.setLooping(true);
  @override
  Future<void> seekTo(Duration position) => controller.seekTo(position);
  @override
  Future<void> play() => controller.play();
  @override
  Future<void> dispose() => controller.dispose();
}

/// One native player for the entire feed. Disposal completes before allocation
/// of the next player; stale initializations can never start playback.
class FeedPlayback extends ChangeNotifier {
  FeedPlayback({
    FeedVideoHandle Function(String url)? create,
    this.initializationTimeout = const Duration(seconds: 12),
  }) : _create = create ?? _NativeVideoHandle.new;

  final FeedVideoHandle Function(String url) _create;
  final Duration initializationTimeout;
  final _positions = <String, Duration>{};
  Future<void> _transition = Future.value();
  _PlaybackEntry? _entry;
  String? _failedId;
  String? _desiredId;
  String? _desiredUrl;
  int _revision = 0;
  bool _disposed = false;

  String? get activeId => _entry?.id ?? _failedId;
  VideoPlayerController? get controller => _entry?.handle.controller;
  bool get ready => _entry?.ready ?? false;
  bool get failed => _entry?.failed ?? (_failedId != null);

  Future<void> select(String? id, String? url) {
    if (_disposed || (_desiredId == id && _desiredUrl == url)) {
      return _transition;
    }
    _desiredId = id;
    _desiredUrl = url;
    final revision = ++_revision;
    return _transition = _transition.then((_) async {
      if (_disposed || revision != _revision) return;
      await _release();
      if (_disposed || revision != _revision || id == null || url == null) {
        return;
      }
      try {
        final entry = _PlaybackEntry(id, _create(url));
        _entry = entry;
        notifyListeners();
        unawaited(_initialize(entry, revision));
      } catch (_) {
        _failedId = id;
        notifyListeners();
      }
    });
  }

  bool _isCurrent(_PlaybackEntry entry, int revision) =>
      !_disposed && revision == _revision && identical(_entry, entry);

  Future<void> _initialize(_PlaybackEntry entry, int revision) async {
    try {
      await entry.handle.initialize().timeout(initializationTimeout);
      if (!_isCurrent(entry, revision)) return;
      await entry.handle.setLooping();
      if (!_isCurrent(entry, revision)) return;
      final position = _positions[entry.id];
      if (position != null) await entry.handle.seekTo(position);
      if (!_isCurrent(entry, revision)) return;
      await entry.handle.play();
      if (!_isCurrent(entry, revision)) return;
      entry.ready = true;
      notifyListeners();
    } catch (_) {
      if (!_isCurrent(entry, revision)) return;
      entry.failed = true;
      notifyListeners();
    }
  }

  Future<void> _release() async {
    final entry = _entry;
    _entry = null;
    _failedId = null;
    if (entry == null) return;
    if (!_disposed) notifyListeners();
    if (entry.ready) {
      _positions.remove(entry.id);
      _positions[entry.id] = entry.handle.position;
      while (_positions.length > 32) {
        _positions.remove(_positions.keys.first);
      }
    }
    try {
      await entry.handle.dispose();
    } catch (_) {
      // Still allow the next source to be selected after native cleanup fails.
    }
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _revision++;
    unawaited(_transition.then((_) => _release()));
    super.dispose();
  }
}

class _PlaybackEntry {
  _PlaybackEntry(this.id, this.handle);
  final String id;
  final FeedVideoHandle handle;
  bool ready = false;
  bool failed = false;
}
