import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';

class AppNavBar extends StatelessWidget {
  static const height = 80.0;
  const AppNavBar({
    super.key,
    required this.currentIndex,
    required this.onSelected,
    this.isAdmin = false,
  });

  final int currentIndex;
  final ValueChanged<int> onSelected;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    final destinations = [
      (Icons.image_outlined, Icons.photo_library, context.l10n.navFeed),
      (Icons.search, Icons.search, context.l10n.navExplore),
      (Icons.add_circle_outline, Icons.add_circle, context.l10n.navSell),
      (
        Icons.notifications_outlined,
        Icons.notifications,
        isAdmin ? context.l10n.navAdmin : context.l10n.navActivity,
      ),
      (Icons.person_outline, Icons.person, context.l10n.navProfile),
    ];
    return Material(
      color: const Color(0xfff9f9fa),
      child: SafeArea(
        top: false,
        child: Container(
          height: height,
          padding: const EdgeInsets.all(8),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Color(0xffe4e3d8))),
          ),
          child: Row(
            children: [
              for (var index = 0; index < destinations.length; index++)
                Expanded(
                  child: Semantics(
                    selected: currentIndex == index,
                    button: true,
                    child: InkWell(
                      onTap: () => onSelected(index),
                      borderRadius: BorderRadius.circular(12),
                      child: Center(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: currentIndex == index
                                ? const Color(0xffe4e3d8).withValues(alpha: 0.5)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                currentIndex == index
                                    ? destinations[index].$2
                                    : destinations[index].$1,
                                color: currentIndex == index
                                    ? const Color(0xff363a34)
                                    : const Color(0xff898c86),
                              ),
                              FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  destinations[index].$3,
                                  maxLines: 1,
                                  style: TextStyle(
                                    color: currentIndex == index
                                        ? const Color(0xff363a34)
                                        : const Color(0xff898c86),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
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
      ),
    );
  }
}
