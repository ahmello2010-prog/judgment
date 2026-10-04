import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const JudgmentApp());
}

class JudgmentApp extends StatelessWidget {
  const JudgmentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'محكمة الأدوار',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF050A12),
      ),
      home: const GameWebViewScreen(),
    );
  }
}

class GameWebViewScreen extends StatefulWidget {
  const GameWebViewScreen({super.key});

  @override
  State<GameWebViewScreen> createState() => _GameWebViewScreenState();
}

class _GameWebViewScreenState extends State<GameWebViewScreen> {
  // رابط اللعبة الحية الحالي في المشروع
  static const String _gameUrl = 'https://judgment-eta.vercel.app';

  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();

    final PlatformWebViewControllerCreationParams params =
        const PlatformWebViewControllerCreationParams();

    _controller = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF050A12));

    _configureAndroidWebViewAndPermissions();
  }

  Future<void> _configureAndroidWebViewAndPermissions() async {
    // 1. إعداد WebView الخاص بنظام أندرويد لتمرير صلاحية المايكروفون (WebRTC / LiveKit)
    if (_controller.platform is AndroidWebViewController) {
      final AndroidWebViewController androidController =
          _controller.platform as AndroidWebViewController;

      // السماح بتشغيل الصوت المباشر والمؤثرات الصوتية تلقائياً داخل WebView
      await androidController.setMediaPlaybackRequiresUserGesture(false);

      // ربط طلبات الصلاحيات الصادرة من صفحة الويب (navigator.mediaDevices.getUserMedia)
      // مع نظام صلاحيات أندرويد، مع قصر الموافقة على المايكروفون فقط (AudioCapture)
      await androidController.setOnPlatformPermissionRequest(
        (PlatformWebViewPermissionRequest request) async {
          final bool wantsAudio = request.types.contains(
            WebViewPermissionResourceType.audioCapture,
          );

          if (!wantsAudio) {
            // رفض أي طلبات غير صوتية (مثل الكاميرا) لأن اللعبة صوتية فقط
            await request.deny();
            return;
          }

          final bool granted = await _ensureAndroidMicrophonePermission();
          if (granted) {
            await request.grant();
          } else {
            await request.deny();
          }
        },
      );
    }

    // 2. تحميل رابط اللعبة المباشر فوراً
    await _controller.loadRequest(Uri.parse(_gameUrl));

    // 3. طلب صلاحية المايكروفون من نظام أندرويد عند بدء التطبيق ليكون جاهزاً قبل دخول الغرفة
    await _ensureAndroidMicrophonePermission();
  }

  /// التحقق من صلاحية المايكروفون في أندرويد وطلبها عند الحاجة بشكل آمن دون إغلاق التطبيق
  Future<bool> _ensureAndroidMicrophonePermission() async {
    try {
      PermissionStatus status = await Permission.microphone.status;

      if (status.isGranted) {
        return true;
      }

      if (status.isDenied || status.isRestricted || status.isLimited) {
        status = await Permission.microphone.request();
      }

      return status.isGranted;
    } catch (_) {
      // في حال حدوث أي خطأ أو بيئة غير مدعومة، لا يتعطل التطبيق ويستمر بالعمل
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (bool didPop, Object? result) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          await _controller.goBack();
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF050A12),
        body: SafeArea(
          child: WebViewWidget(controller: _controller),
        ),
      ),
    );
  }
}
