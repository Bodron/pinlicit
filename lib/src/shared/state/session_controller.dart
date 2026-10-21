import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../api/api_client.dart';
import '../models/app_user.dart';
import 'secure_token_store.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final secureTokenStoreProvider = Provider<SecureTokenStore>(
  (ref) => SecureTokenStore(),
);

final sessionControllerProvider = ChangeNotifierProvider<SessionController>((
  ref,
) {
  return SessionController(
    ref.read(apiClientProvider),
    ref.read(secureTokenStoreProvider),
  )..restoreSession();
});

class SessionController extends ChangeNotifier {
  SessionController(this._api, this._tokenStore);

  final ApiClient _api;
  final SecureTokenStore _tokenStore;
  AppUser? user;
  bool busy = false;
  bool restoring = true;
  String? error;
  bool _restoreStarted = false;

  bool get isAuthenticated => user != null && _api.token != null;
  bool get hasFinishedRestore => !restoring;

  Future<void> restoreSession() async {
    if (_restoreStarted) return;
    _restoreStarted = true;
    restoring = true;
    error = null;
    notifyListeners();

    try {
      final token = await _tokenStore.readAccessToken();
      if (token == null || token.isEmpty) {
        _api.setToken(null);
        user = null;
        return;
      }

      _api.setToken(token);
      user = await _api.me();
    } on DioException {
      await _clearSession();
    } catch (_) {
      await _clearSession();
    } finally {
      restoring = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    if (restoring) return;
    await _run(() async {
      final session = await _api.login(email: email, password: password);
      await _tokenStore.writeAccessToken(session.accessToken);
      _api.setToken(session.accessToken);
      user = session.user;
    });
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    if (restoring) return;
    await _run(() async {
      final session = await _api.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      await _tokenStore.writeAccessToken(session.accessToken);
      _api.setToken(session.accessToken);
      user = session.user;
    });
  }

  Future<void> refreshMe() async {
    if (_api.token == null) return;
    await _run(() async {
      user = await _api.me();
    });
  }

  Future<void> logout() async {
    await _clearSession();
    notifyListeners();
  }

  Future<void> _clearSession() async {
    await _tokenStore.clear();
    _api.setToken(null);
    user = null;
  }

  Future<void> _run(Future<void> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } on DioException catch (exception) {
      error = _extractError(exception);
      rethrow;
    } catch (exception) {
      error = _extractUnexpectedError(exception);
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  String _extractError(DioException exception) {
    final data = exception.response?.data;
    if (data is Map && data['message'] != null) {
      final message = data['message'];
      return message is List ? message.join(', ') : message.toString();
    }
    switch (exception.type) {
      case DioExceptionType.connectionError:
        return 'Cannot reach the API. Check that the backend is running and API_BASE_URL is correct.';
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return 'The API took too long to respond. Check your connection and backend server.';
      case DioExceptionType.badResponse:
        return 'Login failed. Please check your credentials and try again.';
      case DioExceptionType.cancel:
        return 'Request was cancelled.';
      case DioExceptionType.badCertificate:
        return 'The server certificate is not trusted.';
      case DioExceptionType.unknown:
        break;
    }
    return exception.message ?? 'Request failed.';
  }

  String _extractUnexpectedError(Object exception) {
    final message = exception.toString();
    if (message.contains('MissingPluginException')) {
      return 'Secure storage is not ready. Stop and start the app again, not only hot reload.';
    }
    return message.isEmpty
        ? 'Something went wrong. Please try again.'
        : message;
  }
}
