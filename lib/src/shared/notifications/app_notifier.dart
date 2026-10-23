import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum NoticeKind { info, success, warning, error, loading }

@immutable
class NoticeAction {
  const NoticeAction({required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;
}

@immutable
class AppNotice {
  const AppNotice({
    required this.id,
    required this.title,
    required this.kind,
    this.description,
    this.action,
  });
  final String id;
  final String title;
  final String? description;
  final NoticeKind kind;
  final NoticeAction? action;
}

final appNotifierProvider = NotifierProvider<AppNotifier, List<AppNotice>>(
  AppNotifier.new,
);

/// One bounded, app-wide notification stream. No BuildContext is retained.
class AppNotifier extends Notifier<List<AppNotice>> {
  static const maxVisible = 3;
  final _timers = <String, Timer>{};
  int _sequence = 0;

  @override
  List<AppNotice> build() {
    ref.onDispose(() {
      for (final timer in _timers.values) {
        timer.cancel();
      }
      _timers.clear();
    });
    return const [];
  }

  String info(
    String title, {
    String? description,
    String? id,
    NoticeAction? action,
    Duration? duration,
  }) => show(
    title,
    kind: NoticeKind.info,
    description: description,
    id: id,
    action: action,
    duration: duration,
  );
  String success(
    String title, {
    String? description,
    String? id,
    NoticeAction? action,
    Duration? duration,
  }) => show(
    title,
    kind: NoticeKind.success,
    description: description,
    id: id,
    action: action,
    duration: duration,
  );
  String warning(
    String title, {
    String? description,
    String? id,
    NoticeAction? action,
    Duration? duration,
  }) => show(
    title,
    kind: NoticeKind.warning,
    description: description,
    id: id,
    action: action,
    duration: duration,
  );
  String error(
    String title, {
    String? description,
    String? id,
    NoticeAction? action,
    Duration? duration,
  }) => show(
    title,
    kind: NoticeKind.error,
    description: description,
    id: id,
    action: action,
    duration: duration,
  );
  String loading(String title, {String? description, String? id}) => show(
    title,
    kind: NoticeKind.loading,
    description: description,
    id: id,
    duration: Duration.zero,
  );

  /// Reusing an ID replaces a message (e.g. loading → success).
  /// Duration.zero keeps it visible until explicitly dismissed/replaced.
  String show(
    String title, {
    NoticeKind kind = NoticeKind.info,
    String? description,
    String? id,
    NoticeAction? action,
    Duration? duration,
  }) {
    final duplicate = state.where(
      (notice) =>
          notice.kind == kind &&
          notice.title == title &&
          notice.description == description &&
          notice.action == action,
    );
    final key =
        id ??
        (duplicate.isNotEmpty ? duplicate.first.id : 'notice-${++_sequence}');
    _timers.remove(key)?.cancel();
    final items = [
      ...state.where((notice) => notice.id != key),
      AppNotice(
        id: key,
        title: title,
        description: description,
        kind: kind,
        action: action,
      ),
    ];
    while (items.length > maxVisible) {
      _timers.remove(items.removeAt(0).id)?.cancel();
    }
    state = List.unmodifiable(items);
    final lifetime =
        duration ??
        (action != null
            ? const Duration(seconds: 10)
            : kind == NoticeKind.error || kind == NoticeKind.warning
            ? const Duration(seconds: 6)
            : const Duration(seconds: 4));
    if (lifetime > Duration.zero) {
      _timers[key] = Timer(lifetime, () => dismiss(key));
    }
    return key;
  }

  void dismiss(String id) {
    _timers.remove(id)?.cancel();
    if (state.any((notice) => notice.id == id)) {
      state = List.unmodifiable(state.where((notice) => notice.id != id));
    }
  }

  void clear() {
    for (final timer in _timers.values) {
      timer.cancel();
    }
    _timers.clear();
    state = const [];
  }
}

extension AppNotifierContext on BuildContext {
  AppNotifier get notifier => ProviderScope.containerOf(
    this,
    listen: false,
  ).read(appNotifierProvider.notifier);
}
