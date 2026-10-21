class SellerApplication {
  const SellerApplication({
    required this.id,
    required this.displayName,
    required this.contactPhone,
    required this.status,
    this.notes,
  });

  final String id;
  final String displayName;
  final String contactPhone;
  final String status;
  final String? notes;

  factory SellerApplication.fromJson(Map<String, dynamic> json) {
    return SellerApplication(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      displayName: (json['displayName'] ?? '').toString(),
      contactPhone: (json['contactPhone'] ?? '').toString(),
      status: (json['status'] ?? 'pending').toString(),
      notes: json['notes']?.toString(),
    );
  }
}
