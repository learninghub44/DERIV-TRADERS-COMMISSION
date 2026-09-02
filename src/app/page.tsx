import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  LineChart,
  PieChart,
  FileText
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Markup Analytics',
    description: 'Track your Deriv API markup earnings with detailed breakdowns and trends.',
  },
  {
    icon: TrendingUp,
    title: 'Commission Tracking',
    description: 'Monitor all commission types from your Deriv-powered applications.',
  },
  {
    icon: Users,
    title: 'Client Insights',
    description: 'Understand your trader base with activity metrics and engagement data.',
  },
  {
    icon: LineChart,
    title: 'Trading Activity',
    description: 'View contract details, volumes, and performance across your platform.',
  },
  {
    icon: PieChart,
    title: 'Earnings Dashboard',
    description: 'Unified view of all verified earnings from your Deriv integrations.',
  },
  {
    icon: FileText,
    title: 'Professional Reports',
    description: 'Generate CSV and PDF reports for markup, commissions, and earnings.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Authorize Deriv',
    description: 'Connect your Deriv account securely.',
  },
  {
    step: '02',
    title: 'Connect Deriv App',
    description: 'Securely connect your Deriv OAuth application.',
  },
  {
    step: '03',
    title: 'Sync Data',
    description: 'Automatically sync your Deriv API data.',
  },
  {
    step: '04',
    title: 'Monitor & Grow',
    description: 'Track performance and optimize your business.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">DERIV TECH</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-surface-400 hover:text-white transition-colors text-sm">Features</a>
              <a href="#how-it-works" className="text-surface-400 hover:text-white transition-colors text-sm">How It Works</a>
              <a href="#pricing" className="text-surface-400 hover:text-white transition-colors text-sm">Pricing</a>
              <a href="#faq" className="text-surface-400 hover:text-white transition-colors text-sm">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/settings/deriv-integration" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg text-sm font-medium transition-colors">
                Connect Deriv
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-600/20 text-brand-400 text-xs font-medium mb-6">
            <CheckCircle2 className="w-3 h-3" />
            Independent analytics platform for Deriv API operators
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            Monitor Your Deriv API Business
            <span className="text-brand-500"> From One Dashboard</span>
          </h1>
          <p className="text-lg md:text-xl text-surface-400 max-w-2xl mx-auto mb-10">
            Track markup, commissions, trading activity and earnings from your Deriv-powered applications. 
            All your data, beautifully organized.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/settings/deriv-integration"
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Connect Deriv
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/dashboard"
              className="px-6 py-3 border border-surface-700 hover:border-surface-600 rounded-lg font-medium transition-colors text-surface-300"
            >
              Explore Dashboard
            </Link>
          </div>
          <p className="text-xs text-surface-500 mt-6">
            This is an independent third-party platform. Not affiliated with or endorsed by Deriv.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-surface-800">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-500">3%</div>
            <div className="text-sm text-surface-400 mt-1">Max Markup</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-500">24/7</div>
            <div className="text-sm text-surface-400 mt-1">Market Access</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-500">Real-time</div>
            <div className="text-sm text-surface-400 mt-1">Analytics</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-500">Secure</div>
            <div className="text-sm text-surface-400 mt-1">OAuth 2.0</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-surface-400 max-w-2xl mx-auto">
              Comprehensive tools to monitor and manage your Deriv API business from one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="p-6 rounded-xl border border-surface-800 bg-surface-900/50 hover:border-surface-700 transition-colors"
              >
                <feature.icon className="w-10 h-10 text-brand-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-surface-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-surface-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-surface-400 max-w-2xl mx-auto">
              Get started in four simple steps.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-600/10 border border-brand-600/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-brand-500 font-bold">{step.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-surface-400 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for Security</h2>
              <p className="text-surface-400 mb-8">
                Your Deriv credentials are never stored in plain text. We use OAuth 2.0 with PKCE 
                for secure authentication. All data is encrypted at rest and in transit.
              </p>
              <div className="space-y-4">
                {[
                  'OAuth 2.0 with PKCE authentication',
                  'Encrypted token storage',
                  'Row-level security isolation',
                  'No Deriv passwords stored',
                  'Server-side API calls only',
                  'Regular security audits',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0" />
                    <span className="text-surface-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-2xl border border-surface-800 bg-surface-900/50">
              <Shield className="w-16 h-16 text-brand-500 mb-6" />
              <h3 className="text-xl font-semibold mb-3">Enterprise-Grade Security</h3>
              <p className="text-surface-400 text-sm">
                DERIV TECH implements industry-standard security practices including 
                encrypted credential storage, role-based access control, and strict multi-tenant 
                data isolation. Your business data stays yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-surface-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Free while in beta</h2>
            <p className="text-surface-400 max-w-2xl mx-auto">
              DERIV TECH is free to use during beta. Paid tiers with higher limits are coming later —
              nothing changes on your account until you're notified in advance.
            </p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="p-6 rounded-xl border border-brand-600 bg-brand-600/5">
              <h3 className="text-lg font-semibold">Starter</h3>
              <div className="text-3xl font-bold mt-2 mb-4">Free</div>
              <ul className="space-y-2 text-sm text-surface-400">
                <li>1 connected Deriv app</li>
                <li>3 users</li>
                <li>30 days data history</li>
                <li>Basic analytics</li>
              </ul>
              <Link
                href="/settings/deriv-integration"
                className="block mt-6 py-2 text-center rounded-lg text-sm font-medium transition-colors bg-brand-600 hover:bg-brand-700 text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6">
            {[
              {
                q: 'Is this an official Deriv product?',
                a: 'No. DERIV TECH is an independent third-party analytics platform. We are not affiliated with or endorsed by Deriv.',
              },
              {
                q: 'How do I connect my Deriv application?',
                a: 'We use OAuth 2.0 with PKCE to securely connect your Deriv application. You will be redirected to Deriv to authorize access, and we never see your Deriv password.',
              },
              {
                q: 'What data can I track?',
                a: 'You can track markup statistics, commissions, trading activity, client data, and earnings from your connected Deriv applications, based on what the official Deriv API provides.',
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. Deriv credentials are encrypted at rest, and every request is scoped to your organization with strict multi-tenant isolation. Your data is never shared with other organizations.',
              },
            ].map((faq) => (
              <div key={faq.q} className="p-6 rounded-xl border border-surface-800 bg-surface-900/50">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-surface-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-surface-400 mb-8">
            Join Deriv API operators who are already tracking their business with DERIV TECH.
          </p>
          <Link 
            href="/settings/deriv-integration"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-lg font-medium transition-colors"
          >
            Connect Deriv
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-surface-800 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">DERIV TECH</span>
            </div>
            <p className="text-surface-500 text-xs text-center md:text-right">
              Independent analytics platform for Deriv API application operators. Not affiliated with Deriv.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
