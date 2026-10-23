import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/session_controller.dart';
import 'app_header.dart';
import 'app_nav_bar.dart';

/// Changes visibility without discarding the inactive tabs' navigators/state.
class AppLayoutVisibility extends InheritedWidget {
  const AppLayoutVisibility({
    super.key,
    required this.feedVisible,
    required this.location,
    required super.child,
  });

  final bool feedVisible;
  final String location;

  static bool isFeedVisible(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<AppLayoutVisibility>()!
      .feedVisible;

  static String locationOf(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<AppLayoutVisibility>()!
      .location;

  @override
  bool updateShouldNotify(AppLayoutVisibility oldWidget) =>
      feedVisible != oldWidget.feedVisible || location != oldWidget.location;
}

class AppLayout extends ConsumerWidget {
  const AppLayout({
    super.key,
    required this.navigationShell,
    required this.location,
  });

  final StatefulNavigationShell navigationShell;
  final String location;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAdmin = ref.watch(
      sessionControllerProvider.select(
        (session) => session.user?.isAdmin == true,
      ),
    );
    final feedVisible = navigationShell.currentIndex == 0 && location == '/';
    final selectedIndex = navigationShell.currentIndex == 5
        ? 3
        : navigationShell.currentIndex;

    return Scaffold(
      backgroundColor: const Color(0xfff9f9fa),
      appBar: feedVisible ? null : const AppHeader(),
      body: AppLayoutVisibility(
        feedVisible: feedVisible,
        location: location,
        child: navigationShell,
      ),
      bottomNavigationBar: AppNavBar(
        currentIndex: selectedIndex,
        isAdmin: isAdmin,
        onSelected: (index) {
          final branch = index == 3 && isAdmin ? 5 : index;
          navigationShell.goBranch(
            branch,
            initialLocation: branch == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}
