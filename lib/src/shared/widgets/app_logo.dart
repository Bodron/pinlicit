import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.width = 144});

  final double width;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/branding/pinbind_logo.svg',
      width: width,
      height: width * 42 / 164.99000549316406,
      fit: BoxFit.contain,
      semanticsLabel: 'Pinbind',
    );
  }
}
