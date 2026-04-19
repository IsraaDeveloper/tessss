import './style.css';

document.addEventListener('DOMContentLoaded', () => {

  const landingPage = document.getElementById('landing-page');
  const dashboardLayout = document.getElementById('dashboard-layout');

  // --- 1. SUPER SIMPLE ROUTER ---
  const route = () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
      landingPage.style.display = 'flex';
      dashboardLayout.style.display = 'none';
      document.title = "Vennpay - Payment Gateway Aggregator";
    } 
    else if (path === '/dashboard') {
      landingPage.style.display = 'none';
      dashboardLayout.style.display = 'flex';
      document.title = "Dashboard | Vennpay";
      // Panggil fungsi render ulang dashboard jika perlu
    } 
    else {
      // 404 Fallback to home
      window.history.replaceState({}, '', '/');
      route();
    }
  };

  // Listen to browser navigation
  window.addEventListener('popstate', route);
  // Run router on load
  route();

  // --- 2. ACTION HANDLERS ---
  
  // Landing Page -> Dashboard (Simulasi Login / Masuk)
  const navigateToDashboard = () => {
    window.history.pushState({}, '', '/dashboard');
    route();
  };

  document.getElementById('btn-goto-login')?.addEventListener('click', navigateToDashboard);
  document.getElementById('btn-goto-register')?.addEventListener('click', navigateToDashboard);
  
  // Dashboard -> Landing Page (Simulasi Logout)
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    route();
  });

  // --- 3. DASHBOARD INTERNAL SPA NAVIGATION ---
  const navLinks = document.querySelectorAll('.nav-link');
  const views = document.querySelectorAll('.view');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      e.target.classList.add('active');

      // Hide all views
      views.forEach(v => v.classList.remove('active'));

      // Show target view
      const targetId = e.target.getAttribute('data-target');
      document.getElementById(`view-${targetId}`).classList.add('active');
    });
  });

  console.log("Vennpay Frontend (Routing) Initialized! 🚀");
});
