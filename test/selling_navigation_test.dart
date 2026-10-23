import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:licit/src/features/activity/activity_screen.dart';
import 'package:licit/src/features/products/create_product_screen.dart';
import 'package:licit/src/features/seller/seller_screen.dart';
import 'package:licit/src/shared/api/api_client.dart';
import 'package:licit/src/shared/models/app_user.dart';
import 'package:licit/src/shared/models/bid.dart';
import 'package:licit/src/shared/models/category.dart';
import 'package:licit/src/shared/models/product.dart';
import 'package:licit/src/shared/models/seller_application.dart';
import 'package:licit/src/shared/state/catalog_updates.dart';
import 'package:licit/src/shared/state/secure_token_store.dart';
import 'package:licit/src/shared/state/session_controller.dart';
import 'package:licit/src/shared/widgets/app_layout.dart';

class _Api extends ApiClient {
  int productsRead = 0;
  int categoriesRead = 0;
  int bidsRead = 0;
  @override
  Future<List<ProductCategory>> categories() async {
    categoriesRead++;
    return [const ProductCategory(id: 'auto', name: 'Auto', slug: 'auto')];
  }

  @override
  Future<List<Product>> myProducts() async {
    productsRead++;
    return [];
  }

  @override
  Future<List<Bid>> myBids() async {
    bidsRead++;
    return [];
  }

  @override
  Future<List<Product>> myFavorites() async => [];
  @override
  Future<List<SellerApplication>> mySellerApplications() async => [];
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    // Widget tests use placeholder font bytes instead of fetching Google Fonts.
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMessageHandler('flutter/assets', (message) async {
      final path = utf8.decode(message!.buffer.asUint8List());
      if (path == 'AssetManifest.bin') {
        return const StandardMessageCodec().encodeMessage({
          for (final weight in [
            'Thin',
            'ExtraLight',
            'Light',
            'Regular',
            'Medium',
            'SemiBold',
            'Bold',
            'ExtraBold',
            'Black',
          ])
            'test-fonts/Montserrat-$weight.ttf': <Object?>[],
        });
      }
      if (path.startsWith('test-fonts/')) return ByteData(0);
      final file = File(path);
      return file.existsSync()
          ? ByteData.sublistView(Uint8List.fromList(file.readAsBytesSync()))
          : null;
    });
  });
  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMessageHandler('flutter/assets', null);
  });

  Future<(GoRouter, _Api, ProviderContainer)> mount(
    WidgetTester tester, {
    String role = 'seller',
  }) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = _Api();
    final session = SessionController(api, SecureTokenStore())
      ..restoring = false
      ..user = AppUser(
        id: 'seller',
        name: 'Test',
        email: 'test@example.invalid',
        role: role,
        blocked: false,
      );
    final router = GoRouter(
      initialLocation: '/seller',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) =>
              AppLayout(navigationShell: shell, location: state.uri.path),
          branches: [
            for (final path in [
              '/',
              '/explore',
              '/seller',
              '/activity',
              '/account',
            ])
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: path,
                    builder: (_, state) => switch (path) {
                      '/seller' => const SellScreen(),
                      '/activity' => ActivityScreen(
                        showSales:
                            state.uri.queryParameters['section'] == 'sales',
                      ),
                      _ => const SizedBox.shrink(),
                    },
                  ),
                ],
              ),
          ],
        ),
      ],
    );
    final container = ProviderContainer(
      overrides: [
        apiClientProvider.overrideWithValue(api),
        sessionControllerProvider.overrideWith((_) => session),
      ],
    );
    addTearDown(() {
      router.dispose();
      container.dispose();
      api.dio.close();
    });
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp.router(
          routerConfig: router,
          locale: const Locale('ro'),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    );
    await tester.pumpAndSettle();
    return (router, api, container);
  }

  testWidgets(
    'Sell opens the form, sales load lazily and switching preserves drafts',
    (tester) async {
      final (router, api, container) = await mount(tester);
      expect(find.byType(CreateProductScreen), findsOneWidget);
      expect(find.text('Performanță'), findsNothing);
      expect(api.productsRead, 0);
      final field = find.byType(TextFormField).first;
      await tester.ensureVisible(field);
      await tester.enterText(field, 'Anunț în lucru');

      router.go('/activity');
      await tester.pumpAndSettle();
      expect(find.text('Cumpărări'), findsOneWidget);
      expect(api.productsRead, 0);
      expect(api.bidsRead, 1);
      await tester.tap(find.text('Vânzări'));
      await tester.pumpAndSettle();
      expect(router.state.uri.queryParameters['section'], 'sales');
      expect(find.text('Performanță'), findsOneWidget);
      expect(api.productsRead, 1);
      expect(find.text('Patek Philippe Calatrava'), findsNothing);

      router.go('/seller');
      await tester.pumpAndSettle();
      expect(find.text('Anunț în lucru'), findsOneWidget);
      expect(api.categoriesRead, 1);
      router.go('/activity?section=sales');
      await tester.pumpAndSettle();
      expect(api.productsRead, 1);

      container.read(catalogUpdatesProvider.notifier).listingPublished();
      await tester.pumpAndSettle();
      expect(api.productsRead, 2);
      router.go('/seller');
      await tester.pumpAndSettle();
      expect(find.text('Anunț în lucru'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'buyer keeps seller application gate instead of publishing form',
    (tester) async {
      await mount(tester, role: 'user');
      expect(find.byType(SellerAccessScreen), findsOneWidget);
      expect(find.byType(CreateProductScreen), findsNothing);
      expect(find.text('Performanță'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
