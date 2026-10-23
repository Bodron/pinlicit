import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/shared/performance/performance_metrics.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  PaintingBinding.instance.imageCache.maximumSize = 160;
  PaintingBinding.instance.imageCache.maximumSizeBytes = 64 * 1024 * 1024;
  PerformanceMetrics.startFrames();
  runApp(const ProviderScope(child: LicitApp()));
}
