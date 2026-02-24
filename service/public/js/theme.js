// FadNote Theme Manager
(function() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const themeBtns = themeToggle.querySelectorAll('.theme-btn');
  const html = document.documentElement;

  // Load saved theme or default to light
  const savedTheme = localStorage.getItem('fadnote-theme') || 'light';
  setTheme(savedTheme);

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      setTheme(theme);
      localStorage.setItem('fadnote-theme', theme);
    });
  });

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }
})();
