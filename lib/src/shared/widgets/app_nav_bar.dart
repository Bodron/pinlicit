import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/session_controller.dart';

class AppNavBar extends ConsumerWidget {
  const AppNavBar({super.key, required this.currentIndex});

  final int currentIndex;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionControllerProvider).user;
    final destinations = [
      const NavigationDestination(
        icon: Icon(Icons.play_circle_outline),
        label: 'Feed',
      ),
      const NavigationDestination(
        icon: Icon(Icons.storefront_outlined),
        label: 'Seller',
      ),
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        label: 'Cont',
      ),
      if (user?.isAdmin == true)
        const NavigationDestination(
          icon: Icon(Icons.admin_panel_settings_outlined),
          label: 'Admin',
        ),
    ];
    final selectedIndex = currentIndex >= destinations.length
        ? 0
        : currentIndex;

    return NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go('/');
            break;
          case 1:
            context.go('/seller');
            break;
          case 2:
            context.go('/account');
            break;
          case 3:
            context.go('/admin');
            break;
        }
      },
      destinations: destinations,
    );
  }
}
