document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".ap-tab-button");
  const forms = document.querySelectorAll(".ap-form");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      // ativa botão
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // mostra o form correto
      forms.forEach((form) => {
        if (form.id === `form-${tab}`) {
          form.classList.add("active");
        } else {
          form.classList.remove("active");
        }
      });
    });
  });

  // Conectar formulários de login / signup ao backend
  const API_BASE = 'http://localhost:3000/api';

  // Helper para mostrar mensagens simples
  function flash(msg){ alert(msg); }

  // Login form
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const senha = document.getElementById('login-senha').value;
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      }).then(r => r.json()).then(res => {
        if (res && res.ok) {
          // armazenar usuário simples no localStorage e redirecionar
          localStorage.setItem('ap_user', JSON.stringify(res.user));
          window.location.href = 'menu.html';
        } else {
          flash(res.error || 'Falha no login');
        }
      }).catch(()=> flash('Erro de rede ao conectar com o servidor'));
    });
  }

  // Signup form
  const signupForm = document.getElementById('form-signup');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('signup-nome').value;
      const email = document.getElementById('signup-email').value;
      const empresa = document.getElementById('signup-empresa').value;
      const cargo = document.getElementById('signup-cargo').value;
      const perfil = document.getElementById('signup-perfil').value;
      const senha = document.getElementById('signup-senha').value;
      const senha2 = document.getElementById('signup-senha2').value;
      if (senha !== senha2) { flash('As senhas não coincidem'); return; }

      fetch(`${API_BASE}/auth/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, empresa, cargo, senha, perfil })
      }).then(r => r.json()).then(res => {
        if (res && res.ok) {
          localStorage.setItem('ap_user', JSON.stringify(res.user));
          window.location.href = 'menu.html';
        } else {
          flash(res.error || 'Falha no cadastro');
        }
      }).catch(()=> flash('Erro de rede ao conectar com o servidor'));
    });
  }

  // Mostrar link de auditor no menu quando o usuário for auditor
  try {
    const raw = localStorage.getItem('ap_user');
    if (raw) {
      const u = JSON.parse(raw);
      // comportamento de menu por perfil
      const menuGrid = document.querySelector('.menu-grid');
      const linkProgresso = document.getElementById('link-progresso');
      const linkPendentes = document.getElementById('link-auditor-pendentes');
      const linkFeitas = document.getElementById('link-auditor-feitas');

      if (u && u.perfil === 'auditor') {
        // auditor: esconder opções de responder e mostrar só pendentes / feitas
        if (menuGrid) menuGrid.style.display = 'none';
        if (linkProgresso) linkProgresso.style.display = 'none';
        if (linkPendentes) linkPendentes.style.display = 'inline-block';
        if (linkFeitas) linkFeitas.style.display = 'inline-block';
        return;
      }

      // auditado (ou outros): mostrar as auditorias (menu-grid) e progresso
      if (menuGrid) menuGrid.style.display = '';
      if (linkProgresso) linkProgresso.style.display = (u && u.perfil === 'auditado') ? 'inline-block' : '';
    }
  } catch (e) { /* ignore */ }
});
