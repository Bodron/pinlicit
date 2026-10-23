import 'package:licit/l10n/l10n.dart';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/category.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/notifications/app_notifier.dart';
import '../../shared/state/catalog_updates.dart';
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

  final _durationOptions = const [3, 5, 7, 14, 30];
  int _durationDays = 7;
  List<ProductCategory> _categories = [];
  ProductCategory? _category;
  PlatformFile? _image;
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );

    return Theme(
      data: theme,
      child: ColoredBox(
        color: _PostColors.background,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
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
                                    TextButton.icon(
                                      onPressed: () =>
                                          context.push('/commerce'),
                                      icon: const Icon(
                                        Icons.account_balance_outlined,
                                      ),
                                      label: const Text(
                                        'Verifică identitatea și configurează încasările Stripe',
                                      ),
                                    ),
                                    const SizedBox(height: 40),
                                    _ImageUploadPanel(
                                      image: _image,
                                      onPickImage: _pickImage,
                                    ),
                                    const SizedBox(height: 40),
                                    _FormSection(
                                      title: context.l10n.basicInformation,
                                      children: [
                                        _LabeledField(
                                          label: context.l10n.listingTitle,
                                          child: TextFormField(
                                            controller: _title,
                                            style: _fieldTextStyle,
                                            decoration: _inputDecoration(
                                              context.l10n.listingTitleExample,
                                            ),
                                            validator: (value) =>
                                                value == null ||
                                                    value.trim().length < 3
                                                ? context
                                                      .l10n
                                                      .minimumThreeCharacters
                                                : null,
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: context.l10n.category,
                                            child:
                                                DropdownButtonFormField<
                                                  ProductCategory
                                                >(
                                                  isExpanded: true,
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
                                                        (
                                                          category,
                                                        ) => DropdownMenuItem(
                                                          value: category,
                                                          child: Text(
                                                            localizedCategory(
                                                              category.name,
                                                              context.l10n,
                                                            ),
                                                          ),
                                                        ),
                                                      )
                                                      .toList(),
                                                  onChanged: (value) =>
                                                      setState(
                                                        () => _category = value,
                                                      ),
                                                  decoration: _inputDecoration(
                                                    context.l10n.selectCategory,
                                                  ),
                                                  validator: (value) =>
                                                      value == null
                                                      ? context
                                                            .l10n
                                                            .chooseCategory
                                                      : null,
                                                ),
                                          ),
                                          right: _LabeledField(
                                            label: context.l10n.materials,
                                            child: TextFormField(
                                              controller: _materials,
                                              style: _fieldTextStyle,
                                              decoration: _inputDecoration(
                                                context.l10n.materialsExample,
                                              ),
                                            ),
                                          ),
                                        ),
                                        _LabeledField(
                                          label: context.l10n.description,
                                          child: TextFormField(
                                            controller: _description,
                                            minLines: 5,
                                            maxLines: 8,
                                            style: _fieldTextStyle,
                                            decoration: _inputDecoration(
                                              context.l10n.descriptionHint,
                                            ),
                                            validator: (value) =>
                                                value == null ||
                                                    value.trim().length < 10
                                                ? context
                                                      .l10n
                                                      .minimumTenCharacters
                                                : null,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 40),
                                    _FormSection(
                                      title: context.l10n.auctionRules,
                                      trailingIcon: Icons.gavel_outlined,
                                      children: [
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label:
                                                context.l10n.startingPriceRon,
                                            child: _MoneyField(
                                              controller: _startingPrice,
                                              placeholder: '0.00',
                                            ),
                                          ),
                                          right: _LabeledField(
                                            label: context.l10n.reservePriceRon,
                                            child: _MoneyField(
                                              controller: _reservePrice,
                                              placeholder:
                                                  context.l10n.minimumAccepted,
                                            ),
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: context
                                                .l10n
                                                .minimumIncrementRon,
                                            child: _MoneyField(
                                              controller: _minIncrement,
                                              placeholder: '50.00',
                                            ),
                                          ),
                                          right: _LabeledField(
                                            label: context.l10n.buyNowOptional,
                                            child: _MoneyField(
                                              controller: _buyNow,
                                              placeholder:
                                                  context.l10n.setPrice,
                                            ),
                                          ),
                                        ),
                                        _ResponsivePair(
                                          left: _LabeledField(
                                            label: context.l10n.auctionDuration,
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
                                                      child: Text(
                                                        context.l10n.daysCount(
                                                          days,
                                                        ),
                                                      ),
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
                                                context.l10n.sevenDays,
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
      setState(() => _message = localizedError(error, context.l10n));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      withData: true,
    );
    if (!mounted || result == null || result.files.isEmpty) return;
    final image = result.files.single;
    if (image.size < 1 || image.size > 10 * 1024 * 1024) {
      setState(() => _message = context.l10n.imageRequirements);
      return;
    }
    setState(() {
      _image = image;
      _message = null;
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_image == null) {
      setState(() => _message = context.l10n.chooseImage);
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
    });

    final l10n = context.l10n;
    try {
      final image = _image!;
      final contentType = switch (image.extension?.toLowerCase()) {
        'jpg' || 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => throw FormatException(l10n.imageRequirements),
      };
      final bytes = image.bytes ?? await File(image.path!).readAsBytes();
      final optimized = await ref
          .read(apiClientProvider)
          .uploadImage(
            fileName: image.name,
            contentType: contentType,
            bytes: bytes,
          );
      final imageKey = optimized.imageKey;
      final imageUrl = optimized.imageUrl;

      final now = DateTime.now().toUtc();
      final materials = _materials.text.trim();
      final description = [
        if (materials.isNotEmpty) l10n.materialsValue(materials),
        _description.text.trim(),
      ].join('\n\n');

      await ref.read(apiClientProvider).createProduct({
        'title': _title.text.trim(),
        'description': description,
        'categoryId': _category!.id,
        'imageKey': imageKey,
        'imageUrl': imageUrl,
        'startingPrice': ronToBani(_startingPrice.text),
        'reservePrice': ronToBani(_reservePrice.text),
        'minBidIncrement': ronToBani(_minIncrement.text),
        'buyNowPrice': ronToBani(_buyNow.text),
        'startsAt': now.toIso8601String(),
        'endsAt': now.add(Duration(days: _durationDays)).toIso8601String(),
      });
      if (mounted) {
        _image = null;
        ref.read(catalogUpdatesProvider.notifier).listingPublished();
        context.notifier.success(context.l10n.listingPublished);
        context.go('/activity?section=sales');
      }
    } on DioException catch (error) {
      setState(() => _message = _messageFrom(error));
    } catch (error) {
      setState(() => _message = localizedError(error, context.l10n));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _messageFrom(DioException error) =>
      localizedError(error, context.l10n);
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

class _PageHeader extends StatelessWidget {
  const _PageHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.createListing,
          style: const TextStyle(
            color: _PostColors.primary,
            fontSize: 30,
            height: 1.3,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          context.l10n.createListingDescription,
          style: const TextStyle(
            color: _PostColors.onSurfaceVariant,
            fontSize: 16,
            height: 1.6,
          ),
        ),
      ],
    );
  }
}

class _ImageUploadPanel extends StatelessWidget {
  const _ImageUploadPanel({required this.image, required this.onPickImage});
  final PlatformFile? image;
  final VoidCallback onPickImage;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onPickImage,
    borderRadius: BorderRadius.circular(12),
    child: AspectRatio(
      aspectRatio: 4 / 3,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: _PostColors.surfaceLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _PostColors.outlineVariant),
        ),
        child: image?.bytes != null
            ? Image.memory(
                image!.bytes!,
                cacheWidth:
                    (MediaQuery.sizeOf(context).width *
                            MediaQuery.devicePixelRatioOf(context))
                        .ceil()
                        .clamp(1, 1280)
                        .toInt(),
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    Center(child: Text(context.l10n.imageLoadFailed)),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.add_photo_alternate_outlined,
                    size: 64,
                    color: _PostColors.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    context.l10n.uploadImage,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 20,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      context.l10n.imageRequirements,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
      ),
    ),
  );
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
      child: Text(
        context.l10n.auctionRulesExplanation,
        style: const TextStyle(
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
        final parsed = parseRon(value);
        if (parsed == null || parsed < 0) return context.l10n.invalidAmount;
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
            label: Text(
              saving ? context.l10n.publishing : context.l10n.publishListing,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          context.l10n.publishingTerms,
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

class _CreateListingLoading extends StatelessWidget {
  const _CreateListingLoading();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(color: _PostColors.primaryContainer),
    );
  }
}
