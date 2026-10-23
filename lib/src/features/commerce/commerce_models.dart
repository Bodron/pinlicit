class CommerceOrder {
  CommerceOrder.fromJson(Map<String, dynamic> json)
    : id = json['id'] as String,
      productId = json['productId'] as String,
      title = json['title'] as String,
      buyerId = json['buyerId'] as String,
      sellerId = json['sellerId'] as String,
      amount = (json['amount'] as num).toInt(),
      depositCredit = (json['depositCredit'] as num? ?? 0).toInt(),
      amountDue = (json['amountDue'] as num? ?? json['amount'] as num).toInt(),
      status = json['status'] as String,
      paymentDeadline = DateTime.tryParse('${json['paymentDeadline']}'),
      releaseAfter = DateTime.tryParse('${json['releaseAfter']}'),
      carrier = json['carrier'] as String?,
      trackingCode = json['trackingCode'] as String?,
      issueOpen = json['issueOpen'] == true;
  final String id, productId, title, buyerId, sellerId, status;
  final int amount, depositCredit, amountDue;
  final DateTime? paymentDeadline, releaseAfter;
  final String? carrier, trackingCode;
  final bool issueOpen;
  bool get canPay =>
      status == 'awaiting_payment' &&
      paymentDeadline != null &&
      paymentDeadline!.isAfter(DateTime.now());
  bool get canReceive => !issueOpen && ['paid', 'shipped'].contains(status);
  bool get canReport =>
      !issueOpen && ['paid', 'shipped', 'delivered'].contains(status);
  bool get canShip => !issueOpen && status == 'paid';
  String get label => switch (status) {
    'awaiting_payment' => 'Așteaptă plata',
    'paid' => 'Plătită',
    'shipped' => 'Expediată',
    'delivered' => 'Primire confirmată',
    'transfer_pending' => 'Transfer în curs',
    'completed' => 'Transferată vânzătorului',
    'payment_expired' => 'Termen de plată expirat',
    'refund_pending' => 'Rambursare în curs',
    'refunded' => 'Rambursată',
    'disputed' => 'Plată contestată',
    _ => 'În verificare',
  };
}
