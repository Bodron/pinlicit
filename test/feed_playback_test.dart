import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/video/feed_playback.dart';
import 'package:video_player/video_player.dart';

Future<void> flush() => Future<void>.delayed(Duration.zero);

void main() {
  test(
    'rapid selection releases old player before allocating the next',
    () async {
      final handles = <String, _FakeVideo>{};
      final playback = FeedPlayback(
        create: (url) => handles[url] = _FakeVideo(),
      );
      await playback.select('a', 'a');
      handles['a']!.initialization.complete();
      await flush();
      expect(playback.ready, isTrue);
      handles['a']!.cleanup = Completer<void>();
      final switching = playback.select('b', 'b');
      await flush();
      expect(handles.keys, ['a']);
      expect(playback.activeId, isNull);
      handles['a']!.cleanup!.complete();
      await switching;
      expect(handles.keys, ['a', 'b']);
      expect(handles['a']!.disposed, 1);
      playback.dispose();
      await flush();
      handles['b']!.initialization.complete();
    },
  );

  test('obsolete initialization cannot play after a swipe', () async {
    final handles = <String, _FakeVideo>{};
    final playback = FeedPlayback(create: (url) => handles[url] = _FakeVideo());
    await playback.select('a', 'a');
    await playback.select('b', 'b');
    handles['b']!.initialization.complete();
    await flush();
    handles['a']!.initialization.complete();
    await flush();
    expect(handles['a']!.plays, 0);
    expect(handles['a']!.disposed, 1);
    expect(handles['b']!.plays, 1);
    expect(playback.activeId, 'b');
    playback.dispose();
    await flush();
  });

  test(
    'inactive feed releases its player and resumes the saved position',
    () async {
      final handles = <_FakeVideo>[];
      final playback = FeedPlayback(
        create: (_) {
          final handle = _FakeVideo();
          handles.add(handle);
          return handle;
        },
      );
      await playback.select('a', 'url');
      handles.first.initialization.complete();
      await flush();
      handles.first.position = const Duration(seconds: 8);
      await playback.select(null, null);
      expect(playback.activeId, isNull);
      expect(handles.first.disposed, 1);
      await playback.select('a', 'url');
      handles.last.initialization.complete();
      await flush();
      expect(handles.last.seeked, const Duration(seconds: 8));
      expect(handles.last.plays, 1);
      playback.dispose();
      await flush();
    },
  );

  test(
    'dispose during initialization prevents playback and listener callbacks',
    () async {
      final handle = _FakeVideo();
      final playback = FeedPlayback(create: (_) => handle);
      await playback.select('a', 'url');
      playback.dispose();
      await flush();
      handle.initialization.complete();
      await flush();
      expect(handle.plays, 0);
      expect(handle.disposed, 1);
    },
  );

  test(
    'initialization failure is isolated; next clip can still play',
    () async {
      final handles = <String, _FakeVideo>{};
      final playback = FeedPlayback(
        create: (url) => handles[url] = _FakeVideo(),
      );
      await playback.select('a', 'a');
      handles['a']!.initialization.completeError(StateError('bad source'));
      await flush();
      expect(playback.failed, isTrue);
      await playback.select('b', 'b');
      handles['b']!.initialization.complete();
      await flush();
      expect(playback.ready, isTrue);
      expect(playback.failed, isFalse);
      playback.dispose();
      await flush();
    },
  );
}

class _FakeVideo implements FeedVideoHandle {
  final initialization = Completer<void>();
  Completer<void>? cleanup;
  int plays = 0;
  int disposed = 0;
  Duration? seeked;
  @override
  Duration position = Duration.zero;
  @override
  VideoPlayerController? get controller => null;
  @override
  Future<void> initialize() => initialization.future;
  @override
  Future<void> setLooping() async {}
  @override
  Future<void> seekTo(Duration position) async {
    seeked = position;
  }

  @override
  Future<void> play() async {
    plays++;
  }

  @override
  Future<void> dispose() async {
    await cleanup?.future;
    disposed++;
  }
}
