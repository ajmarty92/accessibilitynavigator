// Theme detection and management
(function() {
  // Check for saved theme preference or default to light
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addListener((e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
})();

// Error tracking for debugging
window.addEventListener('error', function(e) {
  console.error('Accessibility Navigator Error:', e.error);
});
