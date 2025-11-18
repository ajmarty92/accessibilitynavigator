'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Zap, 
  Code, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Users,
  Globe,
  BarChart3,
  Lock,
  Clock,
  Award,
  ArrowRight,
  Star,
  Play,
  ChevronDown,
  Menu,
  X
} from 'lucide-react'
import ScanForm from '@/components/ScanForm'
import DashboardStats from '@/components/DashboardStats'
import RecentScans from '@/components/RecentScans'

export default function HomePage() {
  const [isScanning, setIsScanning] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO at TechCorp",
      company: "TechCorp Solutions",
      content: "Accessibility Navigator reduced our compliance work by 40% and helped us avoid potential ADA lawsuits. The AI prioritization is game-changing.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Head of Product",
      company: "FinanceFlow",
      content: "We've scanned 500+ sites and the insights are invaluable. The code fixes save our dev team countless hours.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "Accessibility Lead",
      company: "EduTech Global",
      content: "Finally, a tool that understands both WCAG requirements and business impact. Essential for any enterprise team.",
      rating: 5
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Enhanced Header */}
      <header className="border-b border-secondary-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold" aria-hidden="true">♿</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-secondary-900">Accessibility Navigator</h1>
                <p className="text-sm text-secondary-600">Enterprise WCAG Compliance</p>
              </div>
            </motion.div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('features')}
                className="text-secondary-700 hover:text-primary-600 font-medium transition-colors duration-200"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-secondary-700 hover:text-primary-600 font-medium transition-colors duration-200"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-secondary-700 hover:text-primary-600 font-medium transition-colors duration-200"
              >
                Testimonials
              </button>
              <button className="text-secondary-700 hover:text-primary-600 font-medium transition-colors duration-200">
                Documentation
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 shadow-lg"
              >
                Get Started
              </motion.button>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary-100 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mt-4 pt-4 border-t border-secondary-200"
            >
              <div className="flex flex-col space-y-3">
                <button className="text-secondary-700 hover:text-primary-600 font-medium text-left">
                  Features
                </button>
                <button className="text-secondary-700 hover:text-primary-600 font-medium text-left">
                  Pricing
                </button>
                <button className="text-secondary-700 hover:text-primary-600 font-medium text-left">
                  Testimonials
                </button>
                <button className="text-secondary-700 hover:text-primary-600 font-medium text-left">
                  Documentation
                </button>
                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200">
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-100/20 via-transparent to-accent-100/20" aria-hidden="true" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Breadcrumb */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center space-x-2 text-sm text-secondary-600 mb-6"
              >
                <Shield className="w-4 h-4 text-success-600" />
                <span>Trusted by 500+ Enterprise Companies</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>

              <h2 className="text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 leading-tight">
                Make Your
                <span className="block bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mt-2">
                  Website Accessible
                </span>
              </h2>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-secondary-600 mb-8 leading-relaxed"
              >
                AI-powered WCAG 2.2 compliance scanning that reduces accessibility work by 
                <span className="font-semibold text-primary-600"> 25-40%</span> while minimizing legal risk. 
                Enterprise-grade scanning with <span className="font-semibold text-success-600">95% accuracy</span>.
              </motion.p>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center gap-6 mb-8"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
                  <span className="text-secondary-700 font-medium">ADA Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
                  <span className="text-secondary-700 font-medium">Section 508 Ready</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success-600" aria-hidden="true" />
                  <span className="text-secondary-700 font-medium">GDPR Aligned</span>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-xl hover:shadow-2xl flex items-center justify-center space-x-2"
                  onClick={() => scrollToSection('scanner')}
                >
                  <Search className="w-5 h-5" />
                  <span>Start Free Scan</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto bg-white text-secondary-900 px-8 py-4 rounded-xl font-semibold hover:bg-secondary-50 transition-all duration-200 shadow-lg hover:shadow-xl border border-secondary-200 flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Watch Demo</span>
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Visual Element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-secondary-200">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-danger-500" aria-hidden="true" />
                  <div className="w-3 h-3 rounded-full bg-warning-500" aria-hidden="true" />
                  <div className="w-3 h-3 rounded-full bg-success-500" aria-hidden="true" />
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-success-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '95%' }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                  </div>
                  <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-warning-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '70%' }}
                      transition={{ duration: 1.5, delay: 0.7 }}
                    />
                  </div>
                  <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1.5, delay: 0.9 }}
                    />
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="mt-6 text-center"
                >
                  <div className="text-3xl font-bold text-secondary-900">95%</div>
                  <div className="text-sm text-secondary-600">WCAG Compliance Score</div>
                </motion.div>
              </div>
              
              {/* Floating Elements */}
              <motion.div
                animate={{ float: true }}
                className="absolute -top-4 -right-4 bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg"
              >
                AI Powered
              </motion.div>
              <motion.div
                animate={{ float: true, transition: { delay: 0.2 } }}
                className="absolute -bottom-4 -left-4 bg-accent-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg"
              >
                Enterprise Ready
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scanner Section */}
      <section id="scanner" className="py-20 bg-gradient-to-b from-transparent to-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Scan Your Website for WCAG Violations
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Get instant insights into your website's accessibility compliance with our AI-powered scanner
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <ScanForm onScanStart={() => setIsScanning(true)} />
          </motion.div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Enterprise-Grade Accessibility Solutions
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Comprehensive tools designed for modern development teams and compliance requirements
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Search,
                title: "Automated Scanning",
                description: "Comprehensive WCAG 2.2 Level AA compliance analysis in seconds, not hours",
                features: ["500+ test rules", "JavaScript support", "SPA compatibility"]
              },
              {
                icon: Zap,
                title: "AI Prioritization",
                description: "Smart violation ranking based on legal risk, user impact, and business value",
                features: ["Legal risk scoring", "User impact analysis", "Effort estimation"]
              },
              {
                icon: Code,
                title: "Code Fix Generation",
                description: "Framework-specific, production-ready code fixes with step-by-step guides",
                features: ["React, Vue, Angular", "Before/after comparison", "Testing instructions"]
              },
              {
                icon: TrendingUp,
                title: "Compliance Tracking",
                description: "Monitor progress over time with detailed analytics and reporting",
                features: ["Trend analysis", "Team collaboration", "Custom dashboards"]
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-white border border-secondary-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-secondary-900 mb-3">{feature.title}</h3>
                <p className="text-secondary-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, i) => (
                    <li key={i} className="flex items-center text-sm text-secondary-700">
                      <CheckCircle className="w-4 h-4 text-success-500 mr-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-primary-100 text-lg">
              Join hundreds of companies making accessibility a competitive advantage
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-primary-100">Enterprise Clients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">10M+</div>
              <div className="text-primary-100">Pages Scanned Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-primary-100">Customer Satisfaction</div>
            </div>
          </div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8"
          >
            <div className="flex items-center justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-warning-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-xl text-white text-center mb-6 italic">
              "{testimonials[activeTestimonial].content}"
            </blockquote>
            <div className="text-center">
              <div className="font-semibold text-white">{testimonials[activeTestimonial].name}</div>
              <div className="text-primary-200">{testimonials[activeTestimonial].role}</div>
              <div className="text-primary-300">{testimonials[activeTestimonial].company}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Stats */}
      {!isScanning && (
        <section className="py-20 bg-secondary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <DashboardStats />
          </div>
        </section>
      )}

      {/* Recent Scans */}
      {!isScanning && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <RecentScans />
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-accent-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Achieve Full WCAG Compliance?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Start scanning today and join the companies that trust Accessibility Navigator for their accessibility needs
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-secondary-50 transition-all duration-200 shadow-xl hover:shadow-2xl inline-flex items-center space-x-2"
            >
              <span>Start Your Free Trial</span>
              <ArrowRight className="w-5 h-5" />
            </motion.button>
            <p className="text-primary-200 mt-4 text-sm">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-secondary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl font-bold" aria-hidden="true">♿</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Accessibility Navigator</h3>
                  <p className="text-secondary-400 text-sm">Enterprise Compliance</p>
                </div>
              </div>
              <p className="text-secondary-400 text-sm">
                Making the web accessible for everyone through AI-powered compliance solutions.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Enterprise</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white transition-colors">WCAG Guidelines</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ADA Compliance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Best Practices</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-secondary-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-secondary-400 text-sm">
              © 2025 Accessibility Navigator. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-secondary-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-secondary-400 hover:text-white transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-secondary-400 hover:text-white transition-colors text-sm">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}