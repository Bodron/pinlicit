import 'dart:io';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/category.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

class CreateProductScreen extends ConsumerStatefulWidget {
  const CreateProductScreen({super.key});

  @override
  ConsumerState<CreateProductScreen> createState() =>
      _CreateProductScreenState();
}

class _CreateProductScreenState extends ConsumerState<CreateProductScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _materials = TextEditingController();
  final _description = TextEditingController();
  final _startingPrice = TextEditingController(text: '50');
  final _reservePrice = TextEditingController(text: '200');
  final _minIncrement = TextEditingController(text: '5');
  final _buyNow = TextEditingController(text: '250');
  final _devVideoUrl = TextEditingController();

  final _durationOptions = const [3, 5, 7, 14, 30];
  int _durationDays = 7;
  List<ProductCategory> _categories = [];
  ProductCategory? _category;
  PlatformFile? _video;
  bool _loading = true;
  bool _saving = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _title.dispose();
    _materials.dispose();
    _description.dispose();
    _startingPrice.dispose();
    _reservePrice.dispose();
    _minIncrement.dispose();
    _buyNow.dispose();
    _devVideoUrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );

    return Theme(
      data: theme,
      child: Scaffold(
        backgroundColor: _PostColors.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              const _CreateListingTopBar(),
              Expanded(
                child: _loading
                    ? const _CreateListingLoading()
                    : Form(
                        key: _formKey,
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(16, 20, 16, 132),
                          children: [
                            Center(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(
                                  maxWidth: 768,
                                ),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    const _PageHeader(),
                                    const SizedBox(height: 40),
                                    _VideoUploadPanel(
                                      video: _video,
                                      devVideoUrl: _devVideoUrl,
                                      onPickVideo: _pickVideo,
                                    ),
                                    const SizedBox(height: 40),
                                    _FormSection(
                                      title: 'Basic Information',
                                      children: [
                                        _LabeledField(
                                          label: 'Listing Title',
                                          child: TextFormField(
                                            controller: _title,
                                            style: _fieldTextStyle,
                                            decoration: _inputDecoration(
                                              "e.g. 'Ethereal Synthesis #04'",
                                            ),
                                            validator: (value) =>
                                                value == null ||
                                                    value.trim().length < 3
                                                ? 'Minim 3 caractere'
                                                : null,
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: 'Category',
                                            child:
                                                DropdownButtonFormField<
                                                  ProductCategory
                                                >(
                                                  initialValue: _category,
                                                  dropdownColor: _PostColors
                                                      .surfaceContainer,
                                                  icon: const Icon(
                                                    Icons.expand_more,
                                                    color: _PostColors
                                                        .onSurfaceVariant,
                                                  ),
                                                  style: _fieldTextStyle,
                                                  items: _categories
                                                      .map(
                                                        (category) =>
                                                            DropdownMenuItem(
                                                              value: category,
                                                              child: Text(
                                                                category.name,
                                                              ),
                                                            ),
                                                      )
                                                      .toList(),
                                                  onChanged: (value) =>
                                                      setState(
                                                        () => _category = value,
                                                      ),
                                                  decoration: _inputDecoration(
                                                    'Select Category',
                                                  ),
                                                  validator: (value) =>
                                                      value == null
                                                      ? 'Alege categoria'
                                                      : null,
                                                ),
                                          ),
                                          right: _LabeledField(
                                            label: 'Media/Materials',
                                            child: TextFormField(
                                              controller: _materials,
                                              style: _fieldTextStyle,
                                              decoration: _inputDecoration(
                                                'e.g. Acrylic on Canvas',
                                              ),
                                            ),
                                          ),
                                        ),
                                        _LabeledField(
                                          label: 'Description',
                                          child: TextFormField(
                                            controller: _description,
                                            minLines: 5,
                                            maxLines: 8,
                                            style: _fieldTextStyle,
                                            decoration: _inputDecoration(
                                              'Share the story, provenance, and soul of this piece...',
                                            ),
                                            validator: (value) =>
                                                value == null ||
                                                    value.trim().length < 10
                                                ? 'Minim 10 caractere'
                                                : null,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 40),
                                    _FormSection(
                                      title: 'Auction Rules',
                                      trailingIcon: Icons.gavel_outlined,
                                      children: [
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: 'Starting Price (RON)',
                                            child: _MoneyField(
                                              controller: _startingPrice,
                                              placeholder: '0.00',
                                            ),
                                          ),
                                          right: _LabeledField(
                                            label: 'Reserve Price (RON)',
                                            child: _MoneyField(
                                              controller: _reservePrice,
                                              placeholder: 'Minimum accepted',
                                            ),
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: 'Min. Increment (RON)',
                                            child: _MoneyField(
                                              controller: _minIncrement,
                                              placeholder: '50.00',
                                            ),
                                          ),
                                          right: _LabeledField(
                                            label: 'Buy It Now (Optional)',
                                            child: _MoneyField(
                                              controller: _buyNow,
                                              placeholder: 'Set price',
                                            ),
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: 'Auction Duration',
                                            child: DropdownButtonFormField<int>(
                                              initialValue: _durationDays,
                                              dropdownColor:
                                                  _PostColors.surfaceContainer,
                                              icon: const Icon(
                                                Icons.schedule,
                                                color: _PostColors
                                                    .onSurfaceVariant,
                                              ),
                                              style: _fieldTextStyle,
                                              items: _durationOptions
                                                  .map(
                                                    (days) => DropdownMenuItem(
                                                      value: days,
                                                      child: Text('$days Days'),
                                                    ),
                                                  )
                                                  .toList(),
                                              onChanged: (value) {
                                                if (value == null) return;
                                                setState(
                                                  () => _durationDays = value,
                                                );
                                              },
                                              decoration: _inputDecoration(
                                                '7 Days',
                                              ),
                                            ),
                                          ),
                                          right: const _AuctionRulesHint(),
                                        ),
                                      ],
                                    ),
                                    if (_message != null) ...[
                                      const SizedBox(height: 20),
                                      _InlineMessage(message: _message!),
                                    ],
                                    const SizedBox(height: 40),
                                    _PublishButton(
                                      saving: _saving,
                                      onPressed: _saving ? null : _save,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: const _CreateListingBottomNav(),
      ),
    );
  }

  TextStyle get _fieldTextStyle {
    return const TextStyle(
      color: _PostColors.onSurface,
      fontSize: 16,
      height: 1.4,
      fontWeight: FontWeight.w500,
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        color: _PostColors.outlineVariant.withValues(alpha: 0.85),
      ),
      filled: true,
      fillColor: _PostColors.surfaceContainer,
      contentPadding: const EdgeInsets.all(16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _PostColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _PostColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _PostColors.error, width: 2),
      ),
    );
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await ref.read(apiClientProvider).categories();
      if (!mounted) return;
      setState(() {
        _categories = categories;
        _category = categories.isEmpty ? null : categories.first;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickVideo() async {
    final result = await FilePicker.pickFiles(
      type: FileType.video,
      withData: true,
    );
    if (result != null && result.files.isNotEmpty) {
      setState(() => _video = result.files.single);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_video == null && _devVideoUrl.text.trim().isEmpty) {
      setState(
        () => _message = 'Alege un video sau completeaza un URL de dezvoltare.',
      );
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
    });

    try {
      var videoKey = 'dev/${DateTime.now().millisecondsSinceEpoch}.mp4';
      var videoUrl = _devVideoUrl.text.trim();

      if (_video != null) {
        final ticket = await ref
            .read(apiClientProvider)
            .createVideoUpload(fileName: _video!.name);
        final bytes = _video!.bytes ?? await File(_video!.path!).readAsBytes();
        await ref
            .read(apiClientProvider)
            .uploadVideo(ticket: ticket, bytes: bytes);
        videoKey = ticket.key;
        videoUrl = ticket.videoUrl;
      }

      final now = DateTime.now().toUtc();
      final materials = _materials.text.trim();
      final description = [
        if (materials.isNotEmpty) 'Media/Materials: $materials',
        _description.text.trim(),
      ].join('\n\n');

      await ref.read(apiClientProvider).createProduct({
        'title': _title.text.trim(),
        'description': description,
        'categoryId': _category!.id,
        'videoKey': videoKey,
        'videoUrl': videoUrl,
        'startingPrice': ronToBani(_startingPrice.text),
        'reservePrice': ronToBani(_reservePrice.text),
        'minBidIncrement': ronToBani(_minIncrement.text),
        'buyNowPrice': ronToBani(_buyNow.text),
        'startsAt': now.toIso8601String(),
        'endsAt': now.add(Duration(days: _durationDays)).toIso8601String(),
      });
      if (mounted) context.go('/seller');
    } on DioException catch (error) {
      setState(() => _message = _messageFrom(error));
    } catch (error) {
      setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _messageFrom(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? 'Publicarea a esuat.';
  }
}

class _PostColors {
  static const background = Color(0xfff9f9fa);
  static const surface = Color(0xffffffff);
  static const surfaceLow = Color(0xfff3f3f4);
  static const surfaceContainer = Color(0xffeeeeef);
  static const secondaryContainer = Color(0xffe4e3d8);
  static const primary = Color(0xff363a34);
  static const primaryContainer = Color(0xff4d514a);
  static const onSurface = Color(0xff1a1c1d);
  static const onSurfaceVariant = Color(0xff454842);
  static const outlineVariant = Color(0xffc5c7c0);
  static const error = Color(0xffba1a1a);
}

class _CreateListingTopBar extends StatelessWidget {
  const _CreateListingTopBar();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: _PostColors.background.withValues(alpha: 0.88),
        border: Border(
          bottom: BorderSide(
            color: _PostColors.outlineVariant.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Close',
            onPressed: () => context.go('/seller'),
            icon: const Icon(Icons.close, color: _PostColors.primary),
          ),
          const Expanded(
            child: Center(
              child: Text(
                'Licit',
                style: TextStyle(
                  color: _PostColors.primary,
                  fontSize: 36,
                  height: 1.2,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Help',
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Seller help va fi adaugat in urmatorul pas.'),
              ),
            ),
            icon: const Icon(
              Icons.help_outline,
              color: _PostColors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader();

  @override
  Widget build(BuildContext context) {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Create New Listing',
          style: TextStyle(
            color: _PostColors.primary,
            fontSize: 30,
            height: 1.3,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Introduce your masterpiece to the global Licit audience.',
          style: TextStyle(
            color: _PostColors.onSurfaceVariant,
            fontSize: 16,
            height: 1.6,
          ),
        ),
      ],
    );
  }
}

class _VideoUploadPanel extends StatelessWidget {
  const _VideoUploadPanel({
    required this.video,
    required this.devVideoUrl,
    required this.onPickVideo,
  });

  final PlatformFile? video;
  final TextEditingController devVideoUrl;
  final VoidCallback onPickVideo;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final compact = width < 390;
    final iconSize = compact ? 52.0 : 64.0;
    final iconGlyphSize = compact ? 30.0 : 36.0;
    final titleSize = compact ? 20.0 : 24.0;
    final helperSize = compact ? 12.0 : 14.0;

    return Column(
      children: [
        InkWell(
          onTap: onPickVideo,
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              decoration: BoxDecoration(
                color: _PostColors.surfaceLow,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _PostColors.outlineVariant.withValues(alpha: 0.55),
                  width: 2,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuD5-2R6YOSdI9wn1Jo1SH5c53T0ncfbbFolKO9ORbVYCw4gEHxX5JfWRfZPyikMgFoPBYTwhDgDTegtArjJteQ_C5Zlz1wB05mY_zlwq9yFD2uN6sK3D6FqNf_EIWKFgP--g5EPlkdYap6uVmivcGTFELrD9m0YlubrSZMmUyrwRpC8svIPLiC0cIF4IAHB43Def7carKCa6FMYAHbAXszwvydRG-Bxk5IViBzCzY-AgKUOvfoTMMwQj-xvW5F0LAWs2nTXe1LrHw',
                      fit: BoxFit.cover,
                      opacity: const AlwaysStoppedAnimation(0.2),
                      errorBuilder: (context, error, stackTrace) =>
                          const ColoredBox(color: _PostColors.surfaceLow),
                    ),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: _PostColors.surfaceLow.withValues(alpha: 0.28),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.all(compact ? 14 : 24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: iconSize,
                            height: iconSize,
                            decoration: BoxDecoration(
                              color: _PostColors.primaryContainer.withValues(
                                alpha: 0.1,
                              ),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.movie_outlined,
                              color: _PostColors.primary,
                              size: iconGlyphSize,
                            ),
                          ),
                          SizedBox(height: compact ? 10 : 16),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              video == null
                                  ? 'Upload Exhibition Video'
                                  : video!.name,
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: _PostColors.primary,
                                fontSize: titleSize,
                                height: 1.2,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          SizedBox(height: compact ? 6 : 8),
                          Text(
                            'MP4 or MOV, max 500MB. High-quality motion reveals the true essence of your work.',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: _PostColors.onSurfaceVariant,
                              fontSize: helperSize,
                              height: 1.25,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: devVideoUrl,
          style: const TextStyle(color: _PostColors.onSurface),
          decoration: InputDecoration(
            hintText: 'Video URL pentru dezvoltare, optional',
            hintStyle: TextStyle(
              color: _PostColors.outlineVariant.withValues(alpha: 0.85),
            ),
            prefixIcon: const Icon(
              Icons.link,
              color: _PostColors.onSurfaceVariant,
            ),
            filled: true,
            fillColor: _PostColors.surfaceContainer,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(
                color: _PostColors.primary,
                width: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({
    required this.title,
    required this.children,
    this.trailingIcon,
  });

  final String title;
  final List<Widget> children;
  final IconData? trailingIcon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _PostColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _PostColors.outlineVariant.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    color: _PostColors.onSurfaceVariant,
                    fontSize: 14,
                    height: 1.2,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                  ),
                ),
              ),
              if (trailingIcon != null)
                Icon(
                  trailingIcon,
                  color: _PostColors.onSurfaceVariant.withValues(alpha: 0.42),
                ),
            ],
          ),
          const SizedBox(height: 24),
          for (final child in children) ...[child, const SizedBox(height: 24)],
        ]..removeLast(),
      ),
    );
  }
}

class _ResponsivePair extends StatelessWidget {
  const _ResponsivePair({required this.left, required this.right});

  final Widget left;
  final Widget right;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 620) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [left, const SizedBox(height: 24), right],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            const SizedBox(width: 24),
            Expanded(child: right),
          ],
        );
      },
    );
  }
}

class _AuctionRulesHint extends StatelessWidget {
  const _AuctionRulesHint();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _PostColors.secondaryContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Text(
        'Bidders enter their maximum price. Licit only raises the public bid enough to keep the leader winning.',
        style: TextStyle(
          color: _PostColors.onSurfaceVariant,
          fontSize: 13,
          height: 1.4,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: _PostColors.onSurfaceVariant,
            fontSize: 14,
            height: 1.2,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _MoneyField extends StatelessWidget {
  const _MoneyField({required this.controller, required this.placeholder});

  final TextEditingController controller;
  final String placeholder;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      style: const TextStyle(
        color: _PostColors.onSurface,
        fontSize: 16,
        height: 1.4,
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: TextStyle(
          color: _PostColors.outlineVariant.withValues(alpha: 0.85),
        ),
        prefixText: 'RON ',
        prefixStyle: const TextStyle(
          color: _PostColors.onSurfaceVariant,
          fontWeight: FontWeight.w700,
        ),
        filled: true,
        fillColor: _PostColors.surfaceContainer,
        contentPadding: const EdgeInsets.all(16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _PostColors.primary, width: 2),
        ),
      ),
      validator: (value) {
        if (value == null || value.trim().isEmpty) return null;
        final parsed = double.tryParse(value.replaceAll(',', '.'));
        if (parsed == null || parsed < 0) return 'Suma invalida';
        return null;
      },
    );
  }
}

class _InlineMessage extends StatelessWidget {
  const _InlineMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _PostColors.secondaryContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: _PostColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: _PostColors.primary,
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PublishButton extends StatelessWidget {
  const _PublishButton({required this.saving, required this.onPressed});

  final bool saving;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: FilledButton.icon(
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              backgroundColor: _PostColors.primary,
              disabledBackgroundColor: _PostColors.primary.withValues(
                alpha: 0.55,
              ),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(54),
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            icon: saving
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.send_outlined),
            label: Text(saving ? 'Publishing...' : 'Publish Listing'),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          "By publishing, you agree to Licit's Seller Terms & Commission Policy.",
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _PostColors.onSurfaceVariant.withValues(alpha: 0.6),
            fontSize: 12,
            height: 1.4,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _CreateListingBottomNav extends StatelessWidget {
  const _CreateListingBottomNav();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80 + MediaQuery.paddingOf(context).bottom,
      padding: EdgeInsets.fromLTRB(
        8,
        8,
        8,
        8 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: _PostColors.background,
        border: Border(
          top: BorderSide(
            color: _PostColors.outlineVariant.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _BottomItem(
            icon: Icons.play_circle_outline,
            label: 'Feed',
            onTap: () => context.go('/'),
          ),
          _BottomItem(
            icon: Icons.search,
            label: 'Explore',
            onTap: () => context.go('/explore'),
          ),
          _BottomItem(
            icon: Icons.add_circle,
            label: 'Sell',
            active: true,
            onTap: () => context.go('/seller'),
          ),
          _BottomItem(
            icon: Icons.notifications_outlined,
            label: 'Activity',
            onTap: () => context.go('/activity'),
          ),
          _BottomItem(
            icon: Icons.person_outline,
            label: 'Profile',
            onTap: () => context.go('/account'),
          ),
        ],
      ),
    );
  }
}

class _BottomItem extends StatelessWidget {
  const _BottomItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? _PostColors.primary : _PostColors.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? _PostColors.secondaryContainer.withValues(alpha: 0.5)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color.withValues(alpha: active ? 1 : 0.62)),
            Text(
              label,
              style: TextStyle(
                color: color.withValues(alpha: active ? 1 : 0.62),
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateListingLoading extends StatelessWidget {
  const _CreateListingLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(color: _PostColors.primaryContainer),
    );
  }
}
