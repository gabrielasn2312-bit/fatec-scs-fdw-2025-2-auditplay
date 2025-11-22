document.addEventListener('DOMContentLoaded', () => {
  const API = 'http://localhost:3000/api';
  const listEl = document.getElementById('pending-list');
  const uaArea = document.getElementById('user-audit-area');
  const uaTitle = document.getElementById('ua-title');
  const uaList = document.getElementById('ua-list');
  const categorySelect = document.getElementById('auditor-category');

  function flash(msg){ alert(msg); }

  function getCurrentUser(){
    try { return JSON.parse(localStorage.getItem('ap_user') || 'null'); } catch(e){return null;}
  }

  async function loadPending(){
    listEl.innerHTML = '<em>Carregando...</em>';
    const user = getCurrentUser();
    if (!user) { listEl.innerHTML = '<div>Faça login como auditor.</div>'; return; }
    const cat = categorySelect.value;
    const res = await fetch(`${API}/user_audits/pending_for_auditor/${user.id}/${cat}`);
    const data = await res.json();
    if (!data || !data.data) { listEl.innerHTML = '<div>Erro ao carregar.</div>'; return; }
    if (data.data.length === 0) { listEl.innerHTML = '<div>Nenhuma auditoria pendente nesta categoria.</div>'; return; }
    listEl.innerHTML = '';
    data.data.forEach(u => {
      const d = document.createElement('div');
      d.className = 'menu-box';
      d.style.display = 'flex';
      d.style.justifyContent = 'space-between';
      d.style.alignItems = 'center';
      d.style.margin = '6px 0';
      // mostrar nome, email e empresa com a cor primária do projeto
      const nameHtml = `<div><strong class="ap-text-primary">${u.name}</strong><br><small class="ap-text-primary">${u.email}</small><br><small class="ap-text-primary">${u.company || ''}</small></div>`;
      d.innerHTML = nameHtml;
      const btn = document.createElement('button');
      btn.textContent = 'Ver e Avaliar';
      btn.className = 'ap-button-primary';
      btn.addEventListener('click', () => openUserAudit(u.user_id, u.name, cat));
      d.appendChild(btn);
      listEl.appendChild(d);
    });
  }

  async function openUserAudit(userId, userName, category){
    uaTitle.textContent = `Respostas de ${userName} — ${category}`;
    uaArea.style.display = 'block';
    uaList.innerHTML = '<em>Carregando respostas...</em>';
    const res = await fetch(`${API}/user_audits/${category}/${userId}`);
    const data = await res.json();
    if (!data || !data.data) { uaList.innerHTML = '<div>Erro ao carregar respostas.</div>'; return; }
    uaList.innerHTML = '';
    data.data.forEach(r => {
      const row = document.createElement('div');
      row.className = 'ap-card';
      row.style.marginBottom = '10px';
      row.innerHTML = `
        <div><strong>Pergunta:</strong> ${r.key}</div>
        <div><strong>Resposta:</strong> ${r.answer || '<i>sem resposta</i>'}</div>
        <div><strong>Justificativa:</strong> ${r.justification || '<i>sem justificativa</i>'}</div>
        <div style="margin-top:8px;">
          <label>Avaliação:</label>
          <select data-urid="${r.user_response_id}" class="eval-select">
            <option value="conforme">Em conformidade</option>
            <option value="parcial">Conforme parcialmente</option>
            <option value="nao_conforme">Não conforme</option>
          </select>
          <input type="text" placeholder="Comentário (opcional)" data-urid-comment="${r.user_response_id}" style="width:50%; margin-left:8px;" />
        </div>
      `;
      uaList.appendChild(row);
    });
    
    // adicionar botão único para salvar todas as avaliações
    const saveAllWrap = document.createElement('div');
    saveAllWrap.style.marginTop = '12px';
    const saveAllBtn = document.createElement('button');
    saveAllBtn.className = 'ap-button-primary';
    saveAllBtn.textContent = 'Salvar avaliações';
    saveAllWrap.appendChild(saveAllBtn);
    uaArea.appendChild(saveAllWrap);

    saveAllBtn.addEventListener('click', async () => {
      const user = getCurrentUser();
      if (!user) { flash('Faça login como auditor para salvar avaliações'); return; }
      // coletar todas as avaliações presentes na lista
      const items = [];
      uaList.querySelectorAll('.ap-card').forEach(card => {
        const sel = card.querySelector('select.eval-select');
        const urid = sel ? sel.getAttribute('data-urid') : null;
        const commentInp = card.querySelector('input[data-urid-comment]');
        const verdict = sel ? sel.value : null;
        const comment = commentInp ? commentInp.value : null;
        if (urid && verdict) items.push({ userResponseId: parseInt(urid,10), verdict, comment });
      });
      if (items.length === 0) { flash('Nenhuma avaliação encontrada para salvar'); return; }
      saveAllBtn.disabled = true;
      try {
        const promises = items.map(it => fetch(`${API}/evaluations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditorId: user.id, userResponseId: it.userResponseId, verdict: it.verdict, comment: it.comment })
        }).then(r => r.json()));
        const results = await Promise.all(promises);
        const failed = results.filter(r => !r || !r.ok);
        if (failed.length === 0) {
          flash('Todas as avaliações salvas');
          // desabilitar controles
          uaList.querySelectorAll('select, input').forEach(el => el.disabled = true);
          saveAllBtn.disabled = true;
          // reload pending list
          loadPending();
        } else {
          flash('Algumas avaliações falharam ao salvar');
          saveAllBtn.disabled = false;
        }
      } catch (err) {
        flash('Erro de rede ao salvar avaliações');
        saveAllBtn.disabled = false;
      }
    });
  }

  categorySelect.addEventListener('change', loadPending);
  loadPending();
});