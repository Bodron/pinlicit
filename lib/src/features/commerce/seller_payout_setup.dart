import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../shared/api/api_client.dart';

Future<String?> chooseSellerBusinessType(
  BuildContext context, {
  String? existingType,
}) async {
  if (['individual', 'company'].contains(existingType)) return existingType;
  return showModalBottomSheet<String>(
    context: context,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'Cum vrei să încasezi?',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Persoană fizică'),
            subtitle: const Text('Încasezi în nume propriu'),
            onTap: () => Navigator.pop(context, 'individual'),
          ),
          ListTile(
            leading: const Icon(Icons.business_outlined),
            title: const Text('Persoană juridică'),
            subtitle: const Text('Încasezi în contul firmei'),
            onTap: () => Navigator.pop(context, 'company'),
          ),
          const Padding(
            padding: EdgeInsets.all(20),
            child: Text(
              'Stripe îți va cere datele și documentele necesare. Pentru schimbarea tipului unui cont deja început, contactează suportul.',
            ),
          ),
        ],
      ),
    ),
  );
}

Future<void> openSellerOnboarding(ApiClient api, String businessType) async {
  final data = await api.commercePost('seller/onboarding', {
    'businessType': businessType,
  });
  final url = Uri.tryParse('${data['url']}');
  if (url == null ||
      url.scheme != 'https' ||
      !(url.host == 'stripe.com' || url.host.endsWith('.stripe.com'))) {
    throw StateError('Link Stripe invalid.');
  }
  // SFSafariViewController / Custom Tabs preserve Stripe's browser features.
  // Never inject JavaScript or collect banking/identity data in a raw WebView.
  final mode = await supportsLaunchMode(LaunchMode.inAppBrowserView)
      ? LaunchMode.inAppBrowserView
      : LaunchMode.externalApplication;
  if (!await launchUrl(url, mode: mode)) {
    throw StateError('Nu putem deschide pagina Stripe.');
  }
}
