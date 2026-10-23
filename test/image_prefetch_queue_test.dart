import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/images/image_prefetch_queue.dart';

void main() {
  test(
    'rapid swipes keep at most one active and the latest pending download',
    () async {
      final calls = <String>[];
      final first = Completer<void>();
      final queue = ImagePrefetchQueue((url) {
        calls.add(url);
        return url == 'first' ? first.future : Future.value();
      });
      queue.select('first');
      queue.select('skipped');
      queue.select('latest');
      expect(calls, ['first']);
      first.complete();
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['first', 'latest']);
    },
  );
  test(
    'leaving the feed drops queued work and a failed prefetch does not block future downloads',
    () async {
      final calls = <String>[];
      final first = Completer<void>();
      final queue = ImagePrefetchQueue((url) {
        calls.add(url);
        return url == 'first' ? first.future : Future.value();
      });
      queue.select('first');
      queue.select('skipped');
      queue.select(null);
      first.completeError(StateError('offline'));
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['first']);
      queue.select('new');
      await Future<void>.delayed(Duration.zero);
      expect(calls, ['first', 'new']);
    },
  );
}
