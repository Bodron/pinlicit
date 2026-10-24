import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:licit/src/features/activity/activity_screen.dart';
import 'package:licit/src/shared/api/api_client.dart';
import 'package:licit/src/shared/models/app_user.dart';
import 'package:licit/src/shared/models/bid.dart';
import 'package:licit/src/shared/models/product.dart';
import 'package:licit/src/shared/state/secure_token_store.dart';
import 'package:licit/src/shared/state/session_controller.dart';

class _PurchasesApi extends ApiClient {
  int reads = 0;
  bool includeNew = false;
  Map<String, dynamic> order(String id, String buyer) => {
    'id': id,
    'productId': id,
    'title': id,
    'buyerId': buyer,
    'sellerId': 'seller',
    'amount': 4500000,
    'status': 'paid',
  };
  @override
  Future<List<Bid>> myBids() async => [];
  @override
  Future<List<Product>> myFavorites() async => [];
  @override
  Future<List<Map<String, dynamic>>> commerceList(String path) async {
    reads++;
    return [
      order('Achiziție directă', 'buyer'),
      order('Comanda altui cumpărător', 'other'),
      if (includeNew) order('Produs nou plătit', 'buyer'),
    ];
  }

  @override
  Future<Product> product(String id) async => Product.fromJson({'id': id});
}

void main() {
  testWidgets(
    'direct purchases appear without a bid and refresh after another checkout',
    (tester) async {
      GoogleFonts.config.allowRuntimeFetching = false;
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = _PurchasesApi();
      final session = SessionController(api, SecureTokenStore())
        ..user = const AppUser(
          id: 'buyer',
          name: 'Buyer',
          email: 'buyer@example.invalid',
          role: 'user',
          blocked: false,
        );
      final router = GoRouter(
        initialLocation: '/activity?purchase=first',
        routes: [
          GoRoute(
            path: '/activity',
            builder: (context, state) => Scaffold(
              body: ActivityScreen(
                showWins: true,
                purchaseId: state.uri.queryParameters['purchase'],
              ),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWithValue(api),
            sessionControllerProvider.overrideWith((ref) => session),
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
      expect(find.text('Achiziție directă'), findsOneWidget);
      expect(find.text('Comanda altui cumpărător'), findsNothing);
      expect(api.reads, 1);
      api.includeNew = true;
      router.go('/activity?purchase=second');
      await tester.pumpAndSettle();
      expect(api.reads, 2);
      expect(find.text('Produs nou plătit'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
