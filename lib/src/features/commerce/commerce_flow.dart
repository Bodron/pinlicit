import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';
import 'stripe_payments.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

String commerceError(Object error) {
  if (error is DioException) {
    final body = error.response?.data;
    final message = body is Map ? body['message'] : null;
    if (message is String) {
      const translations = {
        'Forbidden resource':
            'Nu ai acces la această secțiune. Verifică dacă ești autentificat cu contul potrivit.',
        'Identity verification is required before payment.':
            'Verifică-ți identitatea prin Stripe înainte de licitare sau plată.',
        'The Stripe account type cannot be changed here. Contact support.':
            'Tipul contului Stripe a fost deja ales. Contactează suportul pentru schimbare.',
        'Seller transfers are disabled.':
            'Încasările nu sunt activate momentan. Plata cumpărătorului rămâne înregistrată.',
        'Verify your identity first.':
            'Finalizează mai întâi verificarea identității.',
        'Seller payment onboarding is incomplete.':
            'Vânzătorul trebuie să finalizeze configurarea încasărilor Stripe.',
        'Seller approval is required.':
            'Această acțiune este disponibilă doar conturilor aprobate de vânzător.',
        'A confirmed 10% bid guarantee is required.':
            'Achită și confirmă garanția de 10% înainte de ofertă.',
        'Order amount is below the minimum card payment of 3 RON.':
            'Suma comenzii este sub minimul de 3 lei pentru plata cu cardul. Contactează suportul pentru verificarea rezervării.',
        'Order is not payable.':
            'Comanda nu mai poate fi plătită. Verifică starea și termenul ei.',
        'Maximum bid must be between 30 and 999999.99 RON.':
            'Maximul ales trebuie să fie între 30 și 999.999,99 lei.',
        'Increase your maximum enough for a guarantee top-up of at least 3 RON.':
            'Stripe cere minimum 3 lei pentru o completare. Alege un maxim mai mare sau păstrează maximul deja acoperit.',
        'Only active listings without bids can be enrolled. Existing commitments require support review.':
            'Poți activa Stripe doar pentru anunțuri active fără oferte. Pentru cele cu oferte existente este necesară revizuirea.',
        'Payment provider is unavailable. Retry shortly.':
            'Stripe nu este disponibil momentan. Reîncearcă după ce verifici starea plății.',
      };
      return translations[message] ?? message;
    }
    if (message is List) return message.join('\n');
    return 'Nu putem contacta serverul. Încearcă din nou.';
  }
  if (error is StripeException) {
    return error.error.localizedMessage ??
        'Formularul de plată nu s-a putut deschide. Verifică starea comenzii și încearcă din nou.';
  }
  if (error is StateError) return error.message;
  return 'Operația nu s-a finalizat. Verifică starea în Plăți și comenzi înainte să reîncerci.';
}

Future<bool> ensureCommerceIdentity(BuildContext context, WidgetRef ref) async {
  await ref.read(stripePaymentsProvider).configure();
  final status = await ref.read(apiClientProvider).commerceGet('me');
  if ((status['identity'] as Map)['status'] == 'verified') return true;
  if (!context.mounted) return false;
  final go = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Verifică-ți identitatea'),
      content: const Text(
        'Înainte de licitare sau plată trebuie să finalizezi verificarea actului și a identității prin Stripe.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Mai târziu'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Verifică identitatea'),
        ),
      ],
    ),
  );
  if (go == true && context.mounted) context.push('/commerce');
  return false;
}

Future<bool> ensureBidGuarantee(
  BuildContext context,
  WidgetRef ref,
  Product product,
  int maximum,
) async {
  if (product.commerceVersion != 1) {
    throw StateError(
      'Vânzătorul trebuie să activeze plata Stripe pentru acest anunț vechi.',
    );
  }
  if (!await ensureCommerceIdentity(context, ref) || !context.mounted) {
    return false;
  }
  final api = ref.read(apiClientProvider);
  final quote = await api.commercePost('products/${product.id}/guarantee', {
    'maximum': maximum,
  });
  if (quote['status'] == 'covered') return true;
  if (!context.mounted) return false;
  final accepted = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Garanție de participare — 10%'),
      content: Text(
        'Maxim de licitare: ${formatRon(maximum)}.\n\nDe achitat acum: ${formatRon((quote['amount'] as num).toInt())}.\n\nDacă pierzi, garanția se rambursează după închiderea licitației. Dacă câștigi, se scade din preț; orice surplus se restituie. Majorarea maximului poate cere o completare.\n\nGaranția nu este un comision.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Renunță'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Continuă la Stripe'),
        ),
      ],
    ),
  );
  if (accepted != true) {
    await api.commercePost('products/${product.id}/guarantee/cancel');
    return false;
  }
  if (!await ref
      .read(stripePaymentsProvider)
      .present(quote['clientSecret'] as String)) {
    await api.commercePost('products/${product.id}/guarantee/cancel');
    return false;
  }
  final confirmed = await api.commercePost('products/${product.id}/guarantee', {
    'maximum': maximum,
  });
  if (confirmed['status'] != 'covered') {
    throw StateError(
      'Confirmarea plății este în curs. Revino la această ofertă după confirmare.',
    );
  }
  return true;
}

Future<void> openProductPayment(
  BuildContext context,
  WidgetRef ref,
  Product product,
) async {
  if (product.commerceVersion != 1) return;
  final order = await ref
      .read(apiClientProvider)
      .commercePost('products/${product.id}/order');
  if (context.mounted) await context.push('/checkout/${order['id']}');
}

Future<int?> chooseBidMaximum(BuildContext context, Product product) =>
    showDialog<int>(
      context: context,
      builder: (_) => _MaximumBidDialog(product: product),
    );

class _MaximumBidDialog extends StatefulWidget {
  const _MaximumBidDialog({required this.product});
  final Product product;
  @override
  State<_MaximumBidDialog> createState() => _MaximumBidDialogState();
}

class _MaximumBidDialogState extends State<_MaximumBidDialog> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _amount;
  @override
  void initState() {
    super.initState();
    final minimum = widget.product.nextBid < 3000
        ? 3000
        : widget.product.nextBid;
    _amount = TextEditingController(text: (minimum / 100).toStringAsFixed(2));
  }

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  int get _maximum {
    final amount = parseRon(_amount.text);
    return amount == null ||
            !amount.isFinite ||
            amount < 0 ||
            amount > 999999.99
        ? 0
        : (amount * 100).round();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Alege maximul de licitare'),
    content: Form(
      key: _form,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Oferta minimă curentă: ${formatRon(widget.product.nextBid)}'),
          TextFormField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            maxLength: 12,
            decoration: const InputDecoration(labelText: 'Maximul tău (RON)'),
            onChanged: (_) => setState(() {}),
            validator: (_) =>
                _maximum < widget.product.nextBid || _maximum < 3000
                ? 'Alege un maxim valid, de minimum 30 lei.'
                : null,
          ),
          Text(
            'Garanția totală necesară: ${formatRon((_maximum / 10).ceil())}. Din aceasta se scade garanția deja achitată. Suma exactă de plată se confirmă la pasul următor.',
          ),
        ],
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Renunță'),
      ),
      FilledButton(
        onPressed: () {
          if (_form.currentState!.validate()) Navigator.pop(context, _maximum);
        },
        child: const Text('Continuă'),
      ),
    ],
  );
}
