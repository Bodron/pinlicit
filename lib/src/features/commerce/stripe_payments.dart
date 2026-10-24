import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import '../../shared/api/api_client.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

final stripePaymentsProvider = Provider(
  (ref) => StripePayments(ref.read(apiClientProvider)),
);

class StripePayments {
  StripePayments(this.api);
  final ApiClient api;
  Future<void> configure() async {
    final config = await api.commerceGet('config');
    if (config['ready'] != true ||
        config['mode'] != 'test' ||
        !(config['publishableKey'] as String? ?? '').startsWith('pk_test_')) {
      throw StateError('Plățile nu sunt încă activate pe acest server.');
    }
    Stripe.publishableKey = config['publishableKey'] as String;
    Stripe.urlScheme = 'pinbind';
    await Stripe.instance.applySettings();
  }

  Future<bool> present(String clientSecret) async {
    try {
      final intent = await Stripe.instance.retrievePaymentIntent(clientSecret);
      if (intent.livemode || intent.currency.toLowerCase() != 'ron') {
        throw StateError(
          'Plata nu poate fi inițiată. Verifică starea comenzii și încearcă din nou.',
        );
      }
      if (intent.amount < 300) {
        throw StateError(
          'Suma este sub minimul de 3 lei pentru plata cu cardul.',
        );
      }
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          customFlow: false,
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'Pinbind',
          primaryButtonLabel: 'Plătește ${formatRon(intent.amount.toInt())}',
          linkDisplayParams: const LinkDisplayParams(
            linkDisplay: LinkDisplay.never,
          ),
          returnURL: 'pinbind://stripe-redirect',
          style: ThemeMode.light,
          allowsDelayedPaymentMethods: false,
          appearance: const PaymentSheetAppearance(
            colors: PaymentSheetAppearanceColors(
              primary: Color(0xff363a34),
              background: Color(0xfff9f9fa),
              componentBackground: Colors.white,
              componentBorder: Color(0xffdedfd8),
              componentDivider: Color(0xffe4e5df),
              componentText: Color(0xff363a34),
              primaryText: Color(0xff363a34),
              secondaryText: Color(0xff70746b),
              placeholderText: Color(0xff70746b),
              icon: Color(0xff4d514a),
              error: Color(0xff9b382d),
            ),
            shapes: PaymentSheetShape(borderRadius: 14, borderWidth: 1),
          ),
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException catch (error) {
      if (error.error.code == FailureCode.Canceled) return false;
      rethrow;
    }
  }
}
