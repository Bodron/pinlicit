import 'package:flutter/material.dart';

/// Shared observer for screens that need to react when a route is covered or
/// becomes visible again.
final appRouteObserver = RouteObserver<ModalRoute<dynamic>>();
