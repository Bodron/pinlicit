import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:licit/src/features/commerce/checkout_screen.dart';
import 'package:licit/src/features/commerce/stripe_payments.dart';
import 'package:licit/src/shared/api/api_client.dart';
import 'package:licit/src/shared/models/app_user.dart';
import 'package:licit/src/shared/models/product.dart';
import 'package:licit/src/shared/state/secure_token_store.dart';
import 'package:licit/src/shared/state/session_controller.dart';

class _CheckoutApi extends ApiClient {
  int amount = 12500000, credit = 0, paymentRequests = 0;
  String status = 'awaiting_payment';
  @override
  Future<Map<String, dynamic>> commerceGet(String path) async => switch (path) {
    'config' => {'ready': true, 'mode': 'test', 'minimumOrderPayment': 300},
    'me' => {
      'identity': {'status': 'verified'},
    },
    _ => {
      'id': 'order',
      'productId': 'product',
      'title': 'BMW — DEMO',
      'buyerId': 'buyer',
      'sellerId': 'seller',
      'amount': amount,
      'amountDue': amount - credit,
      'depositCredit': credit,
      'status': status,
      'paymentDeadline': DateTime.now()
          .add(const Duration(hours: 24))
          .toIso8601String(),
    },
  };
  @override
  Future<Product> product(String id) async =>
      Product.fromJson({'id': id, 'title': 'BMW — DEMO'});
  @override
  Future<Map<String, dynamic>> commercePost(
    String path, [
    Map<String, dynamic>? data,
  ]) async {
    expect(path, 'orders/order/payment');
    expect(data, isNull); // Prices always come from the server.
    paymentRequests++;
    return {'clientSecret': 'pi_fixture_secret'};
  }
}

class _CheckoutPayments extends StripePayments {
  _CheckoutPayments(super.api);
  bool completed = true, confirmOnServer = false;
  String? failure;
  @override
  Future<void> configure() async {}
  @override
  Future<bool> present(String clientSecret) async {
    if (failure != null) throw StateError(failure!);
    if (confirmOnServer) (api as _CheckoutApi).status = 'paid';
    return completed;
  }
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);
  Future<void> open(
    WidgetTester tester,
    _CheckoutApi api,
    _CheckoutPayments payments,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final session = SessionController(api, SecureTokenStore())
      ..user = const AppUser(
        id: 'buyer',
        name: 'Buyer',
        email: 'buyer@example.invalid',
        role: 'user',
        blocked: false,
      );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          apiClientProvider.overrideWithValue(api),
          stripePaymentsProvider.overrideWithValue(payments),
          sessionControllerProvider.overrideWith((ref) => session),
        ],
        child: const MaterialApp(home: CheckoutScreen(orderId: 'order')),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('blocks the invalid one-leu order before opening Stripe', (
    tester,
  ) async {
    final api = _CheckoutApi()..amount = 100;
    await open(tester, api, _CheckoutPayments(api));
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.textContaining('sub minimul'), findsOneWidget);
    expect(api.paymentRequests, 0);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
  testWidgets(
    'large price fits and a sheet callback alone never marks an order paid',
    (tester) async {
      final api = _CheckoutApi()..credit = 1250000;
      await open(tester, api, _CheckoutPayments(api));
      expect(find.text('Garanție achitată'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();
      expect(api.paymentRequests, 1);
      expect(find.textContaining('în curs de confirmare'), findsOneWidget);
      expect(find.textContaining('Plată confirmată'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'only canonical payment success changes checkout to confirmation',
    (tester) async {
      final api = _CheckoutApi();
      await open(tester, api, _CheckoutPayments(api)..confirmOnServer = true);
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();
      expect(find.text('Comanda ta'), findsOneWidget);
      expect(find.text('Vezi comenzile tale'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'payment error survives background refresh and the buyer can retry',
    (tester) async {
      final api = _CheckoutApi();
      await open(
        tester,
        api,
        _CheckoutPayments(api)..failure = 'Card refuzat. Încearcă alt card.',
      );
      await tester.tap(find.byType(FilledButton));
      await tester.pumpAndSettle();
      expect(find.text('Card refuzat. Încearcă alt card.'), findsOneWidget);
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
      expect(find.text('Card refuzat. Încearcă alt card.'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );
}
