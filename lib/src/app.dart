import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/admin/admin_screen.dart';
import 'features/activity/activity_screen.dart';
import 'features/auth/auth_screen.dart';
import 'features/explore/explore_screen.dart';
import 'features/feed/feed_screen.dart';
import 'features/products/product_detail_screen.dart';
import 'features/seller/seller_screen.dart';
import 'features/user/account_screen.dart';
import 'shared/navigation/app_route_observer.dart';
import 'shared/state/session_controller.dart';
import 'shared/theme/app_theme.dart';
import 'shared/notifications/app_notifier.dart';
import 'shared/notifications/app_notifier_host.dart';
import 'shared/widgets/app_logo.dart';
import 'shared/widgets/app_nav_bar.dart';
import 'shared/widgets/app_layout.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final session = ref.read(sessionControllerProvider);

  final router = GoRouter(
    initialLocation: '/',
    refreshListenable: session,
    redirect: (context, state) {
      final restoring = !session.hasFinishedRestore;
      final onSplash = state.matchedLocation == '/splash';
      final loggingIn =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      if (restoring) {
        return onSplash ? null : '/splash';
      }

      if (onSplash) {
        return session.isAuthenticated ? '/' : '/login';
      }

      if (!session.isAuthenticated && !loggingIn) {
        return '/login';
      }
      if (session.isAuthenticated && loggingIn) {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const AuthScreen(mode: AuthMode.login),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const AuthScreen(mode: AuthMode.register),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppLayout(
          navigationShell: navigationShell,
          location: state.uri.path,
        ),
        branches: [
          StatefulShellBranch(
            observers: [appRouteObserver],
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const FeedScreen(),
                routes: [
                  GoRoute(
                    path: 'products/:id',
                    builder: (context, state) => ProductDetailScreen(
                      productId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/explore',
                builder: (context, state) => const ExploreScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/seller',
                builder: (context, state) => const SellScreen(),
                routes: [
                  GoRoute(path: 'new', redirect: (context, state) => '/seller'),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/activity',
                builder: (context, state) => ActivityScreen(
                  showSales: state.uri.queryParameters['section'] == 'sales',
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/account',
                builder: (context, state) => const AccountScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/admin',
                builder: (context, state) => const AdminScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

class LicitApp extends ConsumerWidget {
  const LicitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final authenticated = ref.watch(
      sessionControllerProvider.select((session) => session.isAuthenticated),
    );
    ref.listen(
      sessionControllerProvider.select((session) => session.user?.id),
      (previous, next) {
        if (previous != null && previous != next) {
          ref.read(appNotifierProvider.notifier).clear();
        }
      },
    );

    return MaterialApp.router(
      title: 'Pinbind',
      locale: const Locale('ro'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
      builder: (context, child) => AppNotifierHost(
        bottomOffset: authenticated ? AppNavBar.height : 0,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xfff9f9fa),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppLogo(width: 198),
            SizedBox(height: 18),
            CircularProgressIndicator(color: Color(0xff4d514a)),
          ],
        ),
      ),
    );
  }
}
