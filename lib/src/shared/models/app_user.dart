class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.blocked,
    this.phone,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final bool blocked;
  final String? phone;

  bool get isSeller => role == 'seller' || role == 'admin';
  bool get isAdmin => role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? 'user').toString(),
      blocked: json['blocked'] == true,
      phone: json['phone']?.toString(),
    );
  }
}
