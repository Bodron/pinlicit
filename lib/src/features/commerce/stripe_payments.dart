import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import '../../shared/api/api_client.dart';
import '../../shared/state/session_controller.dart';

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
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'Pinbind',
          returnURL: 'pinbind://stripe-redirect',
          style: ThemeMode.light,
          allowsDelayedPaymentMethods: false,
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
