export default function StaticPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Accessibility Navigator - Enterprise WCAG Compliance</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="font-sans antialiased bg-white">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Header */}
          <header className="border-b border-gray-200 bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">♿</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Accessibility Navigator</h1>
                    <p className="text-sm text-gray-600">Enterprise WCAG Compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="py-20 lg:py-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                  Make Your Website
                  <span className="block text-blue-600 mt-2">Accessible</span>
                </h2>
                
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  AI-powered WCAG 2.2 compliance scanning that reduces accessibility work by 
                  <span className="font-semibold text-blue-600"> 25-40%</span> while minimizing legal risk.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <a href="#scanner" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 shadow-xl">
                    Start Free Scan
                  </a>
                  <button className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 shadow-lg border border-gray-200">
                    Watch Demo
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Scanner Section */}
          <section id="scanner" className="py-20 bg-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Scan Your Website for WCAG Violations
                </h2>
                <p className="text-xl text-gray-600">
                  Get instant insights into your website's accessibility compliance
                </p>
              </div>
              
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <form className="space-y-6">
                    <div>
                      <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-3">
                        Website URL
                      </label>
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          id="url" 
                          placeholder="https://example.com" 
                          className="flex-1 px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                          type="submit" 
                          className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700"
                        >
                          Scan Now
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Enterprise-Grade Accessibility Solutions
                </h2>
                <p className="text-xl text-gray-600">
                  Comprehensive tools for modern development teams
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-white text-2xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Scanning</h3>
                  <p className="text-gray-600">Comprehensive WCAG 2.2 Level AA compliance analysis in seconds</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-white text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">AI Prioritization</h3>
                  <p className="text-gray-600">Smart violation ranking based on legal risk and user impact</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-white text-2xl">💻</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Code Fix Generation</h3>
                  <p className="text-gray-600">Framework-specific, production-ready code fixes</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Compliance Tracking</h3>
                  <p className="text-gray-600">Monitor progress with detailed analytics and reporting</p>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Trusted by Industry Leaders
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">500+</div>
                  <div className="text-blue-100">Enterprise Clients</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">10M+</div>
                  <div className="text-blue-100">Pages Scanned Monthly</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">95%</div>
                  <div className="text-blue-100">Customer Satisfaction</div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-gray-400 text-sm">
                © 2025 Accessibility Navigator. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}