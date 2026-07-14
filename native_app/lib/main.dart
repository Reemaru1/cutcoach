import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:health/health.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CutCoachApp());
}

class CutCoachApp extends StatelessWidget {
  const CutCoachApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CutCoach',
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF080C15),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF72E3A6),
          brightness: Brightness.dark,
        ),
      ),
      home: const TodayScreen(),
    );
  }
}

class TodayScreen extends StatefulWidget {
  const TodayScreen({super.key});

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen>
    with WidgetsBindingObserver {
  final Health _health = Health();
  int? _steps;
  bool _loading = true;
  bool _authorized = false;
  String? _error;
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadSteps(requestPermission: true);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _authorized) {
      _loadSteps();
    }
  }

  Future<void> _loadSteps({bool requestPermission = false}) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await _health.configure();
      const types = [HealthDataType.STEPS];

      bool authorized = _authorized;
      if (requestPermission || !authorized) {
        authorized = await _health.requestAuthorization(types);
      }

      if (!authorized) {
        setState(() {
          _authorized = false;
          _loading = false;
          _error = 'Apple-Health-Zugriff wurde nicht erlaubt.';
        });
        return;
      }

      final now = DateTime.now();
      final midnight = DateTime(now.year, now.month, now.day);
      final steps = await _health.getTotalStepsInInterval(midnight, now);

      if (!mounted) return;
      setState(() {
        _authorized = true;
        _steps = steps ?? 0;
        _lastUpdated = DateTime.now();
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Health-Daten konnten nicht geladen werden: $error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadSteps,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
            children: [
              const Text(
                'Heute',
                style: TextStyle(fontSize: 34, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              Text(
                'Dein täglicher Fortschritt',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.62)),
              ),
              const SizedBox(height: 22),
              _HealthCard(
                steps: _steps,
                loading: _loading,
                authorized: _authorized,
                error: _error,
                lastUpdated: _lastUpdated,
                onConnect: () => _loadSteps(requestPermission: true),
                onRefresh: _loadSteps,
              ),
              const SizedBox(height: 16),
              const _PlaceholderCard(
                title: 'Kalorien',
                subtitle: 'Wird aus der bestehenden CutCoach-Logik übernommen',
                icon: CupertinoIcons.flame_fill,
              ),
              const SizedBox(height: 12),
              const _PlaceholderCard(
                title: 'Wasser',
                subtitle: 'Natives Tracking folgt im nächsten Schritt',
                icon: CupertinoIcons.drop_fill,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HealthCard extends StatelessWidget {
  const _HealthCard({
    required this.steps,
    required this.loading,
    required this.authorized,
    required this.error,
    required this.lastUpdated,
    required this.onConnect,
    required this.onRefresh,
  });

  final int? steps;
  final bool loading;
  final bool authorized;
  final String? error;
  final DateTime? lastUpdated;
  final VoidCallback onConnect;
  final VoidCallback onRefresh;

  String _format(int value) {
    final raw = value.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < raw.length; i++) {
      if (i > 0 && (raw.length - i) % 3 == 0) buffer.write('.');
      buffer.write(raw[i]);
    }
    return buffer.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [Color(0xFF16372F), Color(0xFF101A27)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(color: const Color(0x5572E3A6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5F74),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: const Icon(CupertinoIcons.heart_fill),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Apple Health', style: TextStyle(color: Colors.white60)),
                    Text(
                      'Direkt verbunden',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              Icon(
                authorized ? CupertinoIcons.check_mark_circled_solid : CupertinoIcons.exclamationmark_circle,
                color: authorized ? const Color(0xFF72E3A6) : Colors.orangeAccent,
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (loading)
            const Center(child: CircularProgressIndicator())
          else if (!authorized)
            FilledButton.icon(
              onPressed: onConnect,
              icon: const Icon(CupertinoIcons.heart_fill),
              label: const Text('Apple Health erlauben'),
            )
          else ...[
            Text(
              _format(steps ?? 0),
              style: const TextStyle(fontSize: 38, fontWeight: FontWeight.w900),
            ),
            const Text('Schritte heute', style: TextStyle(color: Colors.white60)),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Text(
                    lastUpdated == null
                        ? 'Noch nicht aktualisiert'
                        : 'Aktualisiert ${TimeOfDay.fromDateTime(lastUpdated!).format(context)}',
                    style: const TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                ),
                IconButton(
                  onPressed: onRefresh,
                  icon: const Icon(CupertinoIcons.refresh),
                  tooltip: 'Aktualisieren',
                ),
              ],
            ),
          ],
          if (error != null) ...[
            const SizedBox(height: 10),
            Text(error!, style: const TextStyle(color: Colors.orangeAccent)),
          ],
        ],
      ),
    );
  }
}

class _PlaceholderCard extends StatelessWidget {
  const _PlaceholderCard({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF28324A)),
      ),
      child: Row(
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
