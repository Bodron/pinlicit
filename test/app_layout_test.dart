import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:licit/src/shared/api/api_client.dart';
import 'package:licit/src/shared/state/secure_token_store.dart';
import 'package:licit/src/shared/state/session_controller.dart';
import 'package:licit/src/shared/widgets/app_header.dart';
import 'package:licit/src/shared/widgets/app_layout.dart';
import 'package:licit/src/shared/widgets/app_nav_bar.dart';

void main() {
  Future<GoRouter> mount(WidgetTester tester, Map<String, int> mounts) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final paths = [
      '/',
      '/explore',
      '/seller',
      '/activity',
      '/account',
      '/admin',
    ];
    final router = GoRouter(
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) => AppLayout(
            navigationShell: navigationShell,
            location: state.uri.path,
          ),
          branches: [
            for (final path in paths)
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: path,
                    builder: (_, _) => _StatefulPage(path, mounts),
                    routes: path == '/'
                        ? [
                            GoRoute(
                              path: 'products/:id',
                              builder: (_, _) => const Text('Product details'),
                            ),
                          ]
                        : [],
                  ),
                ],
              ),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionControllerProvider.overrideWith(
            (_) =>
                SessionController(ApiClient(), SecureTokenStore())
                  ..restoring = false,
          ),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          locale: const Locale('ro'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    );
    await tester.pumpAndSettle();
    return router;
  }

  testWidgets('tabs retain state and share one persistent navigation bar', (
    tester,
  ) async {
    final mounts = <String, int>{};
    await mount(tester, mounts);
    expect(find.byType(AppHeader), findsNothing);
    final nav = tester.element(find.byType(AppNavBar));

    await tester.tap(find.text('Explorează'));
    await tester.pumpAndSettle();
    final header = tester.element(find.byType(AppHeader));
    await tester.enterText(find.byType(TextField), 'saved search');
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    final scrollBefore = tester
        .state<ScrollableState>(
          find.descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          ),
        )
        .position
        .pixels;
    expect(scrollBefore, greaterThan(0));

    await tester.tap(find.text('Profil'));
    await tester.pumpAndSettle();
    expect(tester.element(find.byType(AppHeader)), same(header));
    expect(tester.element(find.byType(AppNavBar)), same(nav));
    expect(find.byType(Scaffold), findsOneWidget);

    await tester.tap(find.text('Explorează'));
    await tester.pumpAndSettle();
    expect(find.text('saved search'), findsOneWidget);
    expect(mounts['/explore'], 1);
    expect(mounts['/account'], 1);
    expect(
      tester
          .state<ScrollableState>(
            find.descendant(
              of: find.byType(ListView),
              matching: find.byType(Scrollable),
            ),
          )
          .position
          .pixels,
      scrollBefore,
    );

    await tester.tap(find.text('Acasă'));
    await tester.pumpAndSettle();
    expect(mounts['/'], 1);
    expect(find.byType(AppHeader), findsNothing);
    expect(find.text('Feed visible: true'), findsOneWidget);
    expect(tester.element(find.byType(AppNavBar)), same(nav));
    expect(tester.takeException(), isNull);
  });

  testWidgets('product details share the layout and bag returns to feed', (
    tester,
  ) async {
    final mounts = <String, int>{};
    final router = await mount(tester, mounts);
    router.push('/products/example');
    await tester.pumpAndSettle();
    expect(find.text('Product details'), findsOneWidget);
    expect(find.byType(AppHeader), findsOneWidget);
    expect(find.byType(AppNavBar), findsOneWidget);
    expect(
      find.text('Feed visible: false', skipOffstage: false),
      findsOneWidget,
    );

    await tester.tap(find.byTooltip('Acasă'));
    await tester.pumpAndSettle();
    expect(router.state.uri.path, '/');
    expect(find.byType(AppHeader), findsNothing);
    expect(find.text('Feed visible: true'), findsOneWidget);
    expect(mounts['/'], 1);
    expect(tester.takeException(), isNull);
  });
}

class _StatefulPage extends StatefulWidget {
  const _StatefulPage(this.path, this.mounts);
  final String path;
  final Map<String, int> mounts;

  @override
  State<_StatefulPage> createState() => _StatefulPageState();
}

class _StatefulPageState extends State<_StatefulPage> {
  final controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    widget.mounts.update(widget.path, (value) => value + 1, ifAbsent: () => 1);
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feedVisible = AppLayoutVisibility.isFeedVisible(context);
    return Column(
      children: [
        if (widget.path == '/') Text('Feed visible: $feedVisible'),
        TextField(controller: controller),
        Expanded(
          child: ListView(
            children: [
              for (var i = 0; i < 40; i++)
                SizedBox(height: 50, child: Text('Item $i')),
            ],
          ),
        ),
      ],
    );
  }
}
