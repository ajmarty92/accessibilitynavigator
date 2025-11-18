export default function MinimalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <header className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Accessibility Navigator</h1>
        <p className="text-xl text-gray-600">Enterprise WCAG Compliance</p>
      </header>
      
      <main className="max-w-7xl mx-auto mt-12">
        <section className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Make Your Website Accessible
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered WCAG 2.2 compliance scanning that reduces accessibility work by 25-40% while minimizing legal risk.
          </p>
          
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Start Your Free Scan</h3>
            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="https://example.com" 
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Scan Now
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}