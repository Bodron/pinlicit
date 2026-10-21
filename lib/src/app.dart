import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/admin/admin_screen.dart';
import 'features/activity/activity_screen.dart';
import 'features/auth/auth_screen.dart';
import 'features/explore/explore_screen.dart';
import 'features/feed/feed_screen.dart';
import 'features/products/create_product_screen.dart';
import 'features/products/product_detail_screen.dart';
import 'features/seller/seller_screen.dart';
import 'features/user/account_screen.dart';
import 'shared/navigation/app_route_observer.dart';
import 'shared/state/session_controller.dart';
import 'shared/theme/app_theme.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final session = ref.read(sessionControllerProvider);

  return GoRouter(
    initialLocation: '/',
    observers: [appRouteObserver],
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
      GoRoute(path: '/', builder: (context, state) => const FeedScreen()),
      GoRoute(
        path: '/activity',
        builder: (context, state) => const ActivityScreen(),
      ),
      GoRoute(
        path: '/explore',
        builder: (context, state) => const ExploreScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const AuthScreen(mode: AuthMode.login),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const AuthScreen(mode: AuthMode.register),
      ),
      GoRoute(
        path: '/products/:id',
        builder: (context, state) =>
            ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/seller',
        builder: (context, state) => const SellerScreen(),
      ),
      GoRoute(
        path: '/seller/new',
        builder: (context, state) => const CreateProductScreen(),
      ),
      GoRoute(
        path: '/account',
        builder: (context, state) => const AccountScreen(),
      ),
      GoRoute(path: '/admin', builder: (context, state) => const AdminScreen()),
    ],
  );
});

class LicitApp extends ConsumerWidget {
  const LicitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Licit',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
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
            Text(
              'Licit',
              style: TextStyle(
                color: Color(0xff363a34),
                fontSize: 42,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 18),
            CircularProgressIndicator(color: Color(0xff4d514a)),
          ],
        ),
      ),
    );
  }
}
