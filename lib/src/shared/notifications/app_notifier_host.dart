import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:licit/l10n/l10n.dart';

import 'app_notifier.dart';

/// Mount once above the Router so navigation and dialogs cannot remove notices.
/// Only the notification layer observes the stream; the Router is not rebuilt.
class AppNotifierHost extends StatelessWidget {
  const AppNotifierHost({
    super.key,
    required this.child,
    this.bottomOffset = 0,
  });
  final Widget child;
  final double bottomOffset;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final bottom =
        math.max(
          media.viewInsets.bottom,
          media.viewPadding.bottom + bottomOffset,
        ) +
        12;
    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        Positioned(
          bottom: bottom,
          left: 16,
          right: 16,
          child: Align(
            alignment: Alignment.bottomCenter,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: 420,
                maxHeight: (media.size.height - media.padding.top - bottom - 12)
                    .clamp(0.0, double.infinity),
              ),
              child: Consumer(
                builder: (context, ref, _) {
                  final notices = ref.watch(appNotifierProvider);
                  return SingleChildScrollView(
                    primary: false,
                    reverse: true,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (final notice in notices)
                          Padding(
                            key: ValueKey(notice.id),
                            padding: const EdgeInsets.only(top: 8),
                            child: _NoticeCard(notice: notice),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NoticeCard extends ConsumerWidget {
  const _NoticeCard({required this.notice});
  final AppNotice notice;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(appNotifierProvider.notifier);
    final (icon, accent) = switch (notice.kind) {
      NoticeKind.success => (
        Icons.check_circle_outline_rounded,
        const Color(0xff0f766e),
      ),
      NoticeKind.error => (
        Icons.error_outline_rounded,
        const Color(0xffba1a1a),
      ),
      NoticeKind.warning => (
        Icons.warning_amber_rounded,
        const Color(0xffa66a12),
      ),
      NoticeKind.info => (Icons.info_outline_rounded, const Color(0xff4d514a)),
      NoticeKind.loading => (Icons.more_horiz, const Color(0xff4d514a)),
    };
    final reducedMotion = MediaQuery.disableAnimationsOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: reducedMotion
          ? Duration.zero
          : const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      builder: (context, progress, child) => Opacity(
        opacity: progress,
        child: Transform.translate(
          offset: Offset(0, 10 * (1 - progress)),
          child: child,
        ),
      ),
      child: Dismissible(
        key: ValueKey('dismiss-${notice.id}'),
        direction: DismissDirection.horizontal,
        onDismissed: (_) => notifier.dismiss(notice.id),
        child: Semantics(
          container: true,
          explicitChildNodes: true,
          liveRegion: true,
          child: Material(
            color: Colors.white,
            elevation: 0,
            borderRadius: BorderRadius.circular(12),
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xffc5c7c0).withValues(alpha: 0.65),
                ),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x16000000),
                    blurRadius: 24,
                    offset: Offset(0, 6),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: notice.kind == NoticeKind.loading && !reducedMotion
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: accent,
                              ),
                            )
                          : Icon(icon, size: 22, color: accent),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              notice.title,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Color(0xff363a34),
                                fontSize: 13,
                                height: 1.4,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (notice.description != null) ...[
                              const SizedBox(height: 4),
                              Text(
                                notice.description!,
                                maxLines: 4,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xff5e5f57),
                                  fontSize: 12,
                                  height: 1.5,
                                ),
                              ),
                            ],
                            if (notice.action case final action?)
                              TextButton(
                                style: TextButton.styleFrom(
                                  foregroundColor: const Color(0xff0f766e),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                  ),
                                ),
                                onPressed: () {
                                  notifier.dismiss(notice.id);
                                  action.onPressed();
                                },
                                child: Text(action.label),
                              ),
                          ],
                        ),
                      ),
                    ),
                    Semantics(
                      label: context.l10n.dismissNotification,
                      button: true,
                      child: IconButton(
                        onPressed: () => notifier.dismiss(notice.id),
                        icon: const Icon(
                          Icons.close_rounded,
                          size: 17,
                          color: Color(0xff757872),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
