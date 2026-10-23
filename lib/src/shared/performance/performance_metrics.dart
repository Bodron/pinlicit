import 'dart:developer' as developer;
import 'dart:math' as math;
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Opt-in diagnostics. No request bodies, credentials or full URLs are logged.
class PerformanceMetrics {
  static const enabled = bool.fromEnvironment('PERF_METRICS') && !kReleaseMode;
  static bool _started = false;

  static void startFrames() {
    if (!enabled || _started) return;
    _started = true;
    final build = <int>[];
    final raster = <int>[];
    WidgetsBinding.instance.addTimingsCallback((List<FrameTiming> timings) {
      for (final timing in timings) {
        build.add(timing.buildDuration.inMicroseconds);
        raster.add(timing.rasterDuration.inMicroseconds);
        if (build.length == 120) {
          final views = WidgetsBinding.instance.platformDispatcher.views;
          final hz = views.isEmpty ? 60.0 : views.first.display.refreshRate;
          final budget = 1000000 / (hz > 0 ? hz : 60);
          final overBudget = List.generate(
            build.length,
            (i) => math.max(build[i], raster[i]),
          ).where((duration) => duration > budget).length;
          build.sort();
          raster.sort();
          developer.log(
            'frames=120 build_p95_ms=${build[113] / 1000} '
            'raster_p95_ms=${raster[113] / 1000} '
            'over_budget=$overBudget budget_ms=${budget / 1000}',
            name: 'pinbind.frames',
          );
          build.clear();
          raster.clear();
        }
      }
    });
  }

  static Interceptor requests() => InterceptorsWrapper(
    onRequest: (options, handler) {
      options.extra['_performance_watch'] = Stopwatch()..start();
      handler.next(options);
    },
    onResponse: (response, handler) {
      _finish(response.requestOptions, response.statusCode?.toString() ?? '?');
      handler.next(response);
    },
    onError: (error, handler) {
      _finish(error.requestOptions, error.type.name);
      handler.next(error);
    },
  );

  static void _finish(RequestOptions options, String status) {
    final watch = options.extra.remove('_performance_watch') as Stopwatch?;
    if (watch == null) return;
    watch.stop();
    // Redact dynamic product/user IDs and omit query strings entirely.
    final path = options.path
        .split('?')
        .first
        .replaceAll(RegExp(r'/[a-fA-F0-9]{24}(?=/|$)'), '/:id');
    developer.log(
      '${options.method} $path status=$status elapsed_ms=${watch.elapsedMilliseconds}',
      name: 'pinbind.api',
    );
  }
}
