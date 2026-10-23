import 'dart:io';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../performance/async_request_cache.dart';
import '../performance/performance_metrics.dart';
import '../models/app_user.dart';
import '../models/bid.dart';
import '../models/category.dart';
import '../models/product.dart';
import '../models/seller_application.dart';

class AuthSession {
  const AuthSession({required this.accessToken, required this.user});

  final String accessToken;
  final AppUser user;
}

class VideoUploadTicket {
  const VideoUploadTicket({
    required this.key,
    required this.uploadUrl,
    required this.videoUrl,
    required this.contentType,
  });

  final String key;
  final String uploadUrl;
  final String videoUrl;
  final String contentType;

  factory VideoUploadTicket.fromJson(Map<String, dynamic> json) {
    return VideoUploadTicket(
      key: (json['key'] ?? '').toString(),
      uploadUrl: (json['uploadUrl'] ?? '').toString(),
      videoUrl: (json['videoUrl'] ?? '').toString(),
      contentType: (json['contentType'] ?? 'video/mp4').toString(),
    );
  }
}

class ApiClient {
  ApiClient()
    : dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 12),
          receiveTimeout: const Duration(seconds: 20),
        ),
      ) {
    if (PerformanceMetrics.enabled) {
      dio.interceptors.add(PerformanceMetrics.requests());
    }
  }

  final Dio dio;
  final _reads = AsyncRequestCache();
  String? _accessToken;

  void setToken(String? token) {
    if (_accessToken != token) _reads.clear();
    _accessToken = token;
    dio.options.headers[HttpHeaders.authorizationHeader] = token == null
        ? null
        : 'Bearer $token';
  }

  String? get token => _accessToken;

  Future<AuthSession> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
        if (phone?.isNotEmpty == true) 'phone': phone,
      },
    );
    return _sessionFromJson(response.data!);
  }

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return _sessionFromJson(response.data!);
  }

  Future<AppUser> me() async {
    final response = await dio.get<Map<String, dynamic>>('/me');
    return AppUser.fromJson(response.data!);
  }

  Future<List<ProductCategory>> categories() =>
      _reads.read('categories', () async {
        final response = await dio.get<List<dynamic>>('/categories');
        return response.data!
            .whereType<Map<String, dynamic>>()
            .map(ProductCategory.fromJson)
            .toList();
      }, ttl: const Duration(minutes: 5));

  Future<List<Product>> feed({String? categoryId}) =>
      _reads.read('feed:${categoryId ?? 'all'}', () async {
        final response = await dio.get<List<dynamic>>(
          '/products/feed',
          queryParameters: {
            if (categoryId != null) 'categoryId': categoryId,
            'limit': 30,
          },
        );
        return response.data!
            .whereType<Map<String, dynamic>>()
            .map(Product.fromJson)
            .toList();
      });

  Future<Product> product(String id) async {
    final response = await dio.get<Map<String, dynamic>>('/products/$id');
    return Product.fromJson(response.data!);
  }

  Future<Product> placeBid(String productId, int amount) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/products/$productId/bids',
      data: {'amount': amount},
    );
    _reads.invalidate('my-bids');
    return Product.fromJson(response.data!['product'] as Map<String, dynamic>);
  }

  Future<Product> buyNow(String productId) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/products/$productId/buy-now',
    );
    return Product.fromJson(response.data!);
  }

  Future<VideoUploadTicket> createVideoUpload({
    required String fileName,
    String contentType = 'video/mp4',
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/uploads/video-url',
      data: {'fileName': fileName, 'contentType': contentType},
    );
    return VideoUploadTicket.fromJson(response.data!);
  }

  Future<void> uploadVideo({
    required VideoUploadTicket ticket,
    required List<int> bytes,
  }) async {
    await Dio().put<void>(
      ticket.uploadUrl,
      data: bytes,
      options: Options(
        headers: {
          HttpHeaders.contentTypeHeader: ticket.contentType,
          HttpHeaders.contentLengthHeader: bytes.length,
        },
      ),
    );
  }

  Future<Product> createProduct(Map<String, dynamic> data) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/products',
      data: data,
    );
    return Product.fromJson(response.data!);
  }

  Future<List<Product>> myProducts() async {
    final response = await dio.get<List<dynamic>>('/me/products');
    return response.data!
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  }

  Future<List<Bid>> myBids() => _reads.read('my-bids', () async {
    final response = await dio.get<List<dynamic>>('/me/bids');
    return response.data!
        .whereType<Map<String, dynamic>>()
        .map(Bid.fromJson)
        .toList();
  });

  Future<List<Product>> myFavorites() => _reads.read('favorites', () async {
    final response = await dio.get<List<dynamic>>('/me/favorites');
    return response.data!
        .whereType<Map<String, dynamic>>()
        .map(Product.fromJson)
        .toList();
  });

  Future<Product> addFavorite(String productId) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/me/favorites/$productId',
    );
    _reads.invalidate('favorites');
    return Product.fromJson(response.data!);
  }

  Future<int?> removeFavorite(String productId) async {
    final response = await dio.delete<Map<String, dynamic>>(
      '/me/favorites/$productId',
    );
    _reads.invalidate('favorites');
    final count = response.data?['favoriteCount'];
    return count is num ? count.toInt() : null;
  }

  Future<List<SellerApplication>> mySellerApplications() async {
    final response = await dio.get<List<dynamic>>('/seller-applications/me');
    return response.data!
        .whereType<Map<String, dynamic>>()
        .map(SellerApplication.fromJson)
        .toList();
  }

  Future<SellerApplication> requestSeller({
    required String displayName,
    required String contactPhone,
    String? notes,
  }) async {
    final response = await dio.post<Map<String, dynamic>>(
      '/seller-applications',
      data: {
        'displayName': displayName,
        'contactPhone': contactPhone,
        if (notes?.isNotEmpty == true) 'notes': notes,
      },
    );
    return SellerApplication.fromJson(response.data!);
  }

  Future<List<SellerApplication>> pendingSellerApplications() async {
    final response = await dio.get<List<dynamic>>('/admin/seller-applications');
    return response.data!
        .whereType<Map<String, dynamic>>()
        .map(SellerApplication.fromJson)
        .toList();
  }

  Future<void> approveSeller(String id) async {
    await dio.post<void>('/admin/seller-applications/$id/approve');
  }

  Future<void> rejectSeller(String id) async {
    await dio.post<void>('/admin/seller-applications/$id/reject');
  }

  Future<void> hideProduct(String id) async {
    await dio.post<void>('/admin/products/$id/hide');
  }

  Future<void> blockUser(String id, bool blocked) async {
    await dio.patch<void>('/admin/users/$id/block', data: {'blocked': blocked});
  }

  AuthSession _sessionFromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: json['accessToken'].toString(),
      user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
