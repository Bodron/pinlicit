import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'src/app.dart';
import 'src/shared/performance/performance_metrics.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  PerformanceMetrics.startFrames();
  runApp(const ProviderScope(child: LicitApp()));
}
