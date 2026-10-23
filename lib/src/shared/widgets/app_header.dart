import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'app_logo.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppHeader({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xfff9f9fa),
      child: SafeArea(
        bottom: false,
        child: Container(
          height: preferredSize.height,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Expanded(
                child: Align(alignment: Alignment.centerLeft, child: AppLogo()),
              ),
              IconButton(
                tooltip: context.l10n.navFeed,
                onPressed: () => context.go('/'),
                icon: const Icon(
                  Icons.shopping_bag_outlined,
                  color: Color(0xff363a34),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
