import { Link, Navigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Headphones,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import './LandingPage.css';

const FEATURES = [
  {
    icon: Calendar,
    title: 'Smart Booking Management',
    description:
      'Track every inquiry from first contact to completion with an intuitive workflow that keeps your team aligned.',
  },
  {
    icon: MapPin,
    title: 'Itinerary Builder',
    description:
      'Create stunning day-by-day itineraries with destinations, activities, and transport — all in one place.',
  },
  {
    icon: FileText,
    title: 'Document Generation',
    description:
      'Generate professional invoices, hotel vouchers, and travel confirmations with one click.',
  },
  {
    icon: Users,
    title: 'Client Profiles',
    description:
      'Maintain detailed client records with passport details, preferences, and complete booking history.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description:
      'Real-time dashboards showing bookings, revenue, and team performance across multiple currencies.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description:
      'Handle EUR, USD, INR, and LKR seamlessly with automatic FX conversion for accurate reporting.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Capture Inquiries',
    description:
      'Custom itinerary requests from your website flow directly into your inbox with SLA tracking.',
  },
  {
    number: '02',
    title: 'Build & Quote',
    description:
      'Design personalized itineraries, manage costs, and send professional quotes to clients.',
  },
  {
    number: '03',
    title: 'Confirm & Operate',
    description:
      'Coordinate hotels, transport, and activities across your team until the trip is complete.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'during beta',
    description: 'Perfect for small agencies getting started',
    features: [
      'Up to 50 bookings/month',
      '2 team members',
      'Basic itinerary builder',
      'Email support',
    ],
    cta: 'Start Free',
    featured: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For growing agencies with multiple planners',
    features: [
      'Unlimited bookings',
      '10 team members',
      'Advanced itinerary builder',
      'Document generation',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Get Started',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large operators with custom needs',
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

const FOOTER_LINKS = {
  Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Resources: ['Documentation', 'Help Center', 'API Reference', 'Status'],
  Legal: ['Privacy', 'Terms', 'Security'],
};

export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__logo" onClick={closeMobileMenu}>
            <Sparkles className="landing-nav__logo-icon" />
            <span>VSL360</span>
          </Link>

          <nav className={`landing-nav__links ${mobileMenuOpen ? 'landing-nav__links--open' : ''}`}>
            <a href="#features" onClick={closeMobileMenu}>
              Features
            </a>
            <a href="#how-it-works" onClick={closeMobileMenu}>
              How it Works
            </a>
            <a href="#pricing" onClick={closeMobileMenu}>
              Pricing
            </a>
            <Link to="/login" className="landing-nav__login" onClick={closeMobileMenu}>
              Log in
            </Link>
            <Link to="/login" className="btn btn--primary btn--sm" onClick={closeMobileMenu}>
              Get Started
            </Link>
          </nav>

          <button
            type="button"
            className="landing-nav__toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero__bg">
          <div className="hero__gradient" />
          <div className="hero__pattern" />
        </div>
        <div className="container hero__content">
          <div className="hero__badge">
            <Zap size={14} />
            <span>Built for Sri Lanka tour operators</span>
          </div>
          <h1 className="hero__title">
            Run your travel agency
            <span className="hero__title-accent"> smarter</span>
          </h1>
          <p className="hero__subtitle">
            The all-in-one platform for managing bookings, building itineraries, and delighting
            clients — from inquiry to unforgettable journey.
          </p>
          <div className="hero__actions">
            <Link to="/login" className="btn btn--primary btn--lg">
              Start Free Trial
              <ChevronRight size={20} />
            </Link>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              See How It Works
            </a>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-value">500+</span>
              <span className="hero__stat-label">Bookings managed</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-value">12h</span>
              <span className="hero__stat-label">Avg. response SLA</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-value">4.9</span>
              <span className="hero__stat-label">Customer rating</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <span className="section-header__label">Features</span>
            <h2>Everything you need to run your agency</h2>
            <p>
              From the first inquiry to the final invoice, VSL360 streamlines every step of your
              tour operation workflow.
            </p>
          </div>
          <div className="features__grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="feature-card">
                <div className="feature-card__icon">
                  <feature.icon size={24} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="steps">
        <div className="container">
          <div className="section-header">
            <span className="section-header__label">How It Works</span>
            <h2>From inquiry to adventure in three steps</h2>
            <p>
              Our streamlined workflow helps you convert more inquiries and deliver exceptional
              travel experiences.
            </p>
          </div>
          <div className="steps__grid">
            {STEPS.map((step) => (
              <article key={step.number} className="step-card">
                <span className="step-card__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing">
        <div className="container">
          <div className="section-header">
            <span className="section-header__label">Pricing</span>
            <h2>Simple, transparent pricing</h2>
            <p>Start free during our beta period. No credit card required.</p>
          </div>
          <div className="pricing__grid">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`}
              >
                {plan.featured && <span className="pricing-card__badge">Most Popular</span>}
                <h3>{plan.name}</h3>
                <div className="pricing-card__price">
                  <span className="pricing-card__amount">{plan.price}</span>
                  {plan.period && <span className="pricing-card__period">{plan.period}</span>}
                </div>
                <p className="pricing-card__description">{plan.description}</p>
                <ul className="pricing-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={16} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={`btn ${plan.featured ? 'btn--primary' : 'btn--outline'} btn--block`}
                >
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta__inner">
          <div className="cta__content">
            <h2 className="cta__title">Ready to transform your tour operations?</h2>
            <p className="cta__subtitle">
              Join travel agencies across Sri Lanka who trust VSL360 to manage their bookings and
              delight their clients.
            </p>
            <Link to="/login" className="btn btn--white btn--lg">
              Get Started Free
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="cta__features">
            <div className="cta__feature">
              <Shield size={20} />
              <span>Secure & reliable</span>
            </div>
            <div className="cta__feature">
              <Clock size={20} />
              <span>Setup in minutes</span>
            </div>
            <div className="cta__feature">
              <Headphones size={20} />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__brand">
              <Link to="/" className="footer__logo">
                <Sparkles size={24} />
                <span>VSL360</span>
              </Link>
              <p className="footer__tagline">
                The modern platform for Sri Lanka tour operators.
              </p>
              <div className="footer__contact">
                <a href="mailto:info@vsl360.com">
                  <Mail size={16} />
                  info@vsl360.com
                </a>
                <a href="tel:+61483909556">
                  <Phone size={16} />
                  +61 483 909 556
                </a>
              </div>
            </div>
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category} className="footer__column">
                <h4>{category}</h4>
                <ul>
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="footer__bottom">
            <p>&copy; {new Date().getFullYear()} VSL360. All rights reserved.</p>
            <div className="footer__social">
              <a href="https://visitsrilanka360.com" target="_blank" rel="noopener noreferrer">
                visitsrilanka360.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
