import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/state/session_controller.dart';

enum AuthMode { login, register }

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key, required this.mode});

  final AuthMode mode;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _obscurePassword = true;

  bool get _isRegister => widget.mode == AuthMode.register;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);

    return Scaffold(
      backgroundColor: _AuthColors.surfaceLowest,
      body: DefaultTextStyle.merge(
        style: GoogleFonts.montserrat(),
        child: Stack(
          children: [
            SafeArea(
              child: Column(
                children: [
                  const _AuthHeader(),
                  Expanded(
                    child: Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(24, 20, 24, 64),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 430),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _NarrativeHeader(isRegister: _isRegister),
                                const SizedBox(height: 40),
                                if (_isRegister) ...[
                                  _AuthTextField(
                                    controller: _nameController,
                                    label: 'Full Name',
                                    hint: 'Your name',
                                    icon: Icons.person_outline,
                                    textInputAction: TextInputAction.next,
                                    validator: (value) =>
                                        value == null || value.length < 2
                                        ? 'Minim 2 caractere'
                                        : null,
                                  ),
                                  const SizedBox(height: 16),
                                ],
                                _AuthTextField(
                                  controller: _emailController,
                                  label: 'Email Address',
                                  hint: 'name@example.com',
                                  icon: Icons.alternate_email,
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  validator: (value) =>
                                      value == null || !value.contains('@')
                                      ? 'Email invalid'
                                      : null,
                                ),
                                const SizedBox(height: 16),
                                _PasswordField(
                                  controller: _passwordController,
                                  obscure: _obscurePassword,
                                  onToggle: () => setState(
                                    () => _obscurePassword = !_obscurePassword,
                                  ),
                                  validator: (value) =>
                                      value == null || value.length < 8
                                      ? 'Minim 8 caractere'
                                      : null,
                                ),
                                if (_isRegister) ...[
                                  const SizedBox(height: 16),
                                  _AuthTextField(
                                    controller: _phoneController,
                                    label: 'Phone Number',
                                    hint: '+40 700 000 000',
                                    icon: Icons.phone_outlined,
                                    keyboardType: TextInputType.phone,
                                    textInputAction: TextInputAction.done,
                                  ),
                                ],
                                if (session.error != null) ...[
                                  const SizedBox(height: 16),
                                  _ErrorBanner(message: session.error!),
                                ],
                                const SizedBox(height: 24),
                                _PrimaryAuthButton(
                                  busy: session.busy || session.restoring,
                                  label: _isRegister
                                      ? 'CREATE ACCOUNT'
                                      : 'SIGN IN',
                                  onPressed: session.busy || session.restoring
                                      ? null
                                      : _submit,
                                ),
                                const _AuthDivider(),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _SocialButton(
                                        label: 'Google',
                                        icon: const _GoogleGlyph(),
                                        onPressed: () =>
                                            _showComingSoon('Google'),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _SocialButton(
                                        label: 'Apple',
                                        icon: const Icon(
                                          Icons.apple,
                                          size: 22,
                                          color: _AuthColors.primaryContainer,
                                        ),
                                        onPressed: () =>
                                            _showComingSoon('Apple'),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 40),
                                _FooterSwitch(isRegister: _isRegister),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final session = ref.read(sessionControllerProvider);
    try {
      if (_isRegister) {
        await session.register(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
          phone: _phoneController.text.trim(),
        );
      } else {
        await session.login(
          _emailController.text.trim(),
          _passwordController.text,
        );
      }
      if (mounted) context.go('/');
    } on DioException {
      // SessionController exposes the error in the UI.
    } catch (_) {
      // SessionController exposes the error in the UI.
    }
  }

  void _showComingSoon(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$provider login va fi adaugat dupa configurarea providerului.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

class _AuthColors {
  static const primary = Color(0xff363a34);
  static const primaryContainer = Color(0xff4d514a);
  static const surfaceLowest = Color(0xffffffff);
  static const secondaryContainer = Color(0xffe4e3d8);
  static const onSurfaceVariant = Color(0xff454842);
  static const outlineVariant = Color(0xffc5c7c0);
  static const error = Color(0xffba1a1a);
  static const errorContainer = Color(0xffffdad6);
}

class _AuthHeader extends StatelessWidget {
  const _AuthHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: _AuthColors.surfaceLowest.withValues(alpha: 0.86),
      ),
      child: const Text(
        'Licit',
        style: TextStyle(
          color: _AuthColors.primary,
          fontSize: 36,
          height: 1.2,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _NarrativeHeader extends StatelessWidget {
  const _NarrativeHeader({required this.isRegister});

  final bool isRegister;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          isRegister ? 'Create Account' : 'Welcome Back',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: _AuthColors.primaryContainer,
            fontSize: 30,
            height: 1.3,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          isRegister
              ? 'Join live video auctions and discover curated products.'
              : 'Step into your curated auction experience.',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: _AuthColors.onSurfaceVariant,
            fontSize: 16,
            height: 1.6,
            fontWeight: FontWeight.w400,
          ),
        ),
      ],
    );
  }
}

class _AuthTextField extends StatelessWidget {
  const _AuthTextField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.validator,
    this.keyboardType,
    this.textInputAction,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            label,
            style: const TextStyle(
              color: _AuthColors.primaryContainer,
              fontSize: 14,
              height: 1.2,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
        ),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          validator: validator,
          style: const TextStyle(
            color: _AuthColors.primaryContainer,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
          decoration: _authInputDecoration(
            hint: hint,
            prefixIcon: Icon(icon, color: _AuthColors.onSurfaceVariant),
          ),
        ),
      ],
    );
  }
}

class _PasswordField extends StatelessWidget {
  const _PasswordField({
    required this.controller,
    required this.obscure,
    required this.onToggle,
    required this.validator,
  });

  final TextEditingController controller;
  final bool obscure;
  final VoidCallback onToggle;
  final String? Function(String?) validator;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Padding(
                padding: EdgeInsets.only(left: 4, bottom: 6),
                child: Text(
                  'Password',
                  style: TextStyle(
                    color: _AuthColors.primaryContainer,
                    fontSize: 14,
                    height: 1.2,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.7,
                  ),
                ),
              ),
            ),
            TextButton(
              onPressed: () {},
              style: TextButton.styleFrom(
                foregroundColor: _AuthColors.onSurfaceVariant,
                padding: const EdgeInsets.only(bottom: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'Forgot password?',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        TextFormField(
          controller: controller,
          obscureText: obscure,
          validator: validator,
          textInputAction: TextInputAction.done,
          style: const TextStyle(
            color: _AuthColors.primaryContainer,
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
          decoration: _authInputDecoration(
            hint: '********',
            prefixIcon: const Icon(
              Icons.lock_outline,
              color: _AuthColors.onSurfaceVariant,
            ),
            suffixIcon: IconButton(
              tooltip: obscure ? 'Show password' : 'Hide password',
              onPressed: onToggle,
              icon: Icon(
                obscure
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
                color: _AuthColors.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

InputDecoration _authInputDecoration({
  required String hint,
  Widget? prefixIcon,
  Widget? suffixIcon,
}) {
  return InputDecoration(
    hintText: hint,
    hintStyle: TextStyle(
      color: _AuthColors.onSurfaceVariant.withValues(alpha: 0.42),
    ),
    prefixIcon: prefixIcon,
    suffixIcon: suffixIcon,
    filled: true,
    fillColor: _AuthColors.secondaryContainer,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(
        color: _AuthColors.primaryContainer,
        width: 1.2,
      ),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: _AuthColors.error, width: 1.2),
    ),
    focusedErrorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: _AuthColors.error, width: 1.2),
    ),
    errorStyle: const TextStyle(
      color: _AuthColors.error,
      fontWeight: FontWeight.w600,
    ),
  );
}

class _PrimaryAuthButton extends StatelessWidget {
  const _PrimaryAuthButton({
    required this.busy,
    required this.label,
    required this.onPressed,
  });

  final bool busy;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 64,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: _AuthColors.primaryContainer,
          foregroundColor: _AuthColors.surfaceLowest,
          disabledBackgroundColor: _AuthColors.primaryContainer.withValues(
            alpha: 0.55,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            height: 1.2,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.7,
          ),
        ),
        child: busy
            ? const SizedBox.square(
                dimension: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: _AuthColors.surfaceLowest,
                ),
              )
            : Text(label),
      ),
    );
  }
}

class _AuthDivider extends StatelessWidget {
  const _AuthDivider();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 1,
              color: _AuthColors.outlineVariant.withValues(alpha: 0.3),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'OR CONTINUE WITH',
              style: TextStyle(
                color: _AuthColors.onSurfaceVariant.withValues(alpha: 0.62),
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.4,
              ),
            ),
          ),
          Expanded(
            child: Container(
              height: 1,
              color: _AuthColors.outlineVariant.withValues(alpha: 0.3),
            ),
          ),
        ],
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final Widget icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: _AuthColors.primaryContainer,
          side: BorderSide(
            color: _AuthColors.outlineVariant.withValues(alpha: 0.48),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.4,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(width: 8),
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
          ],
        ),
      ),
    );
  }
}

class _FooterSwitch extends StatelessWidget {
  const _FooterSwitch({required this.isRegister});

  final bool isRegister;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          isRegister ? 'Already on Licit? ' : 'New to Licit? ',
          style: const TextStyle(
            color: _AuthColors.onSurfaceVariant,
            fontSize: 16,
            height: 1.6,
          ),
        ),
        TextButton(
          onPressed: () => context.go(isRegister ? '/login' : '/register'),
          style: TextButton.styleFrom(
            foregroundColor: _AuthColors.primary,
            padding: const EdgeInsets.symmetric(horizontal: 2),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            isRegister ? 'Sign In' : 'Create Account',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
          ),
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _AuthColors.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: _AuthColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: _AuthColors.error,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GoogleGlyph extends StatelessWidget {
  const _GoogleGlyph();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GoogleGlyphPainter()),
    );
  }
}

class _GoogleGlyphPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round;
    final rect = Offset.zero & size;

    stroke.color = const Color(0xff4285f4);
    canvas.drawArc(rect.deflate(2), -0.05, 1.25, false, stroke);
    stroke.color = const Color(0xff34a853);
    canvas.drawArc(rect.deflate(2), 1.2, 1.55, false, stroke);
    stroke.color = const Color(0xfffbbc05);
    canvas.drawArc(rect.deflate(2), 2.75, 1.15, false, stroke);
    stroke.color = const Color(0xffea4335);
    canvas.drawArc(rect.deflate(2), 3.9, 1.35, false, stroke);

    final bar = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.square
      ..color = const Color(0xff4285f4);
    canvas.drawLine(
      Offset(size.width * 0.55, size.height * 0.5),
      Offset(size.width - 2, size.height * 0.5),
      bar,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
