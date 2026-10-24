import 'package:licit/src/features/commerce/payment_methods_screen.dart';
import 'package:licit/src/shared/models/app_user.dart';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/features/commerce/commerce_flow.dart';
import 'package:licit/src/features/commerce/commerce_screen.dart';
import 'package:licit/src/shared/state/secure_token_store.dart';
import 'package:licit/src/features/commerce/commerce_models.dart';
import 'package:licit/src/features/commerce/stripe_payments.dart';
import 'package:licit/src/shared/api/api_client.dart';
import 'package:licit/src/shared/models/product.dart';
import 'package:licit/src/shared/state/session_controller.dart';

class _Adapter implements HttpClientAdapter {
  int quotes = 0;
  @override
  void close({bool force = false}) {}
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path.endsWith('/me')) {
      return ResponseBody.fromString(
        '{"identity":{"status":"verified"}}',
        200,
        headers: {
          Headers.contentTypeHeader: ['application/json'],
        },
      );
    }
    if (options.path.endsWith('/cancel')) {
      return ResponseBody.fromString(
        '{"status":"reconciled"}',
        201,
        headers: {
          Headers.contentTypeHeader: ['application/json'],
        },
      );
    }
    quotes++;
    return ResponseBody.fromString(
      quotes > 1
          ? '{"status":"covered"}'
          : '{"status":"requires_payment","amount":1000,"clientSecret":"pi_test_secret"}',
      201,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }
}

class _Payments extends StripePayments {
  _Payments(super.api, {required this.completed});
  final bool completed;
  int presented = 0;
  @override
  Future<void> configure() async {}
  @override
  Future<bool> present(String clientSecret) async {
    presented++;
    return completed;
  }
}

class _StatusApi extends ApiClient {
  String identity = 'requires_input';
  @override
  Future<Map<String, dynamic>> commerceGet(String path) async =>
      path == 'config'
      ? {'enabled': true, 'ready': true}
      : {
          'identity': {'status': identity},
          'sellerPayments': {},
        };
  @override
  Future<List<Map<String, dynamic>>> commerceList(String path) async => [];
}

class _PayoutApi extends ApiClient {
  Map<String, dynamic>? onboarding;
  int earningsRequests = 0;
  @override
  Future<Map<String, dynamic>> commerceGet(String path) async => switch (path) {
    'config' => {'enabled': true, 'ready': true},
    'seller/earnings' => {
      'readyForRelease': 19000,
      'awaitingDelivery': 10000,
      'requestCount': ++earningsRequests,
    },
    _ => {
      'identity': {'status': 'unverified'},
      'sellerPayments': {'connected': false},
    },
  };
  @override
  Future<Map<String, dynamic>> commercePost(
    String path, [
    Map<String, dynamic>? data,
  ]) async {
    onboarding = data;
    // Invalid external URL intentionally stops before any browser plugin call.
    return {'url': 'https://example.invalid/onboard'};
  }
}

void main() {
  testWidgets('buyer can view payments without requesting seller earnings', (
    tester,
  ) async {
    final api = _PayoutApi();
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
          sessionControllerProvider.overrideWith((ref) => session),
        ],
        child: const MaterialApp(home: PaymentMethodsScreen()),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Plățile tale'), findsOneWidget);
    expect(find.text('Încasări din vânzări'), findsNothing);
    expect(api.earningsRequests, 0);
    expect(find.textContaining('Mod de test'), findsNothing);
    await tester.pumpWidget(const SizedBox());
  });
  Map<String, dynamic> order(String state) => {
    'id': 'order',
    'productId': 'product',
    'title': 'Lot',
    'buyerId': 'buyer',
    'sellerId': 'seller',
    'amount': 10000,
    'depositCredit': 1000,
    'amountDue': 9000,
    'status': state,
    'paymentDeadline': DateTime.now()
        .add(const Duration(hours: 1))
        .toIso8601String(),
  };
  for (final choice in {
    'Persoană fizică': 'individual',
    'Persoană juridică': 'company',
  }.entries) {
    testWidgets(
      'unverified seller can choose ${choice.key} for payout onboarding',
      (tester) async {
        final api = _PayoutApi();
        final session = SessionController(api, SecureTokenStore())
          ..user = const AppUser(
            id: 'seller',
            name: 'Seller',
            email: 'seller@example.invalid',
            role: 'seller',
            blocked: false,
          );
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiClientProvider.overrideWithValue(api),
              sessionControllerProvider.overrideWith((ref) => session),
            ],
            child: const MaterialApp(home: PaymentMethodsScreen()),
          ),
        );
        await tester.pumpAndSettle();
        final configure = find.text('Configurează încasările');
        for (
          var i = 0;
          i < 12 && configure.hitTestable().evaluate().isEmpty;
          i++
        ) {
          await tester.drag(find.byType(ListView), const Offset(0, -220));
          await tester.pumpAndSettle();
        }
        await tester.tap(configure);
        await tester.pumpAndSettle();
        expect(find.text('Persoană fizică'), findsOneWidget);
        expect(find.text('Persoană juridică'), findsOneWidget);
        await tester.tap(find.text(choice.key));
        await tester.pumpAndSettle();
        expect(api.onboarding, {'businessType': choice.value});
        await tester.fling(find.byType(ListView), const Offset(0, 1800), 3000);
        await tester.pumpAndSettle();
        expect(find.text('Link Stripe invalid.'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
  test('order exposes only confirmed states and the remaining payment', () {
    final pending = CommerceOrder.fromJson(order('awaiting_payment'));
    expect(pending.amountDue, 9000);
    expect(pending.canPay, isTrue);
    expect(pending.canShip, isFalse);
    expect(pending.canReceive, isFalse);
    expect(CommerceOrder.fromJson(order('paid')).canShip, isTrue);
    expect(CommerceOrder.fromJson(order('completed')).canReceive, isFalse);
    expect(
      CommerceOrder.fromJson({...order('paid'), 'issueOpen': true}).canShip,
      isFalse,
    );
  });
  testWidgets(
    'verification status refreshes after Stripe finishes asynchronously',
    (tester) async {
      final api = _StatusApi();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWithValue(api),
            sessionControllerProvider.overrideWith(
              (ref) => SessionController(api, SecureTokenStore()),
            ),
          ],
          child: const MaterialApp(home: CommerceScreen()),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Verificare de completat'), findsOneWidget);
      api.identity = 'verified';
      await tester.pump(const Duration(seconds: 15));
      await tester.pumpAndSettle();
      expect(find.text('Verificată'), findsOneWidget);
      expect(find.text('Verifică prin Stripe'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  for (final confirmed in [false, true]) {
    testWidgets(
      'guarantee cancellation/success controls permission to submit the bid ($confirmed)',
      (tester) async {
        final api = ApiClient();
        final adapter = _Adapter();
        api.dio.httpClientAdapter = adapter;
        final payment = _Payments(api, completed: confirmed);
        bool? eligible;
        final product = Product.fromJson({
          'id': 'product',
          'commerceVersion': 1,
        });
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              apiClientProvider.overrideWithValue(api),
              stripePaymentsProvider.overrideWithValue(payment),
            ],
            child: MaterialApp(
              home: Consumer(
                builder: (context, ref, _) => Scaffold(
                  body: TextButton(
                    onPressed: () async {
                      eligible = await ensureBidGuarantee(
                        context,
                        ref,
                        product,
                        10000,
                      );
                    },
                    child: const Text('Bid'),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Bid'));
        await tester.pumpAndSettle();
        expect(find.text('Garanție de participare — 10%'), findsOneWidget);
        expect(payment.presented, 0);
        await tester.tap(find.text('Continuă la Stripe'));
        await tester.pumpAndSettle();
        expect(eligible, confirmed);
        expect(payment.presented, 1);
        expect(adapter.quotes, confirmed ? 2 : 1);
      },
    );
  }
}
