# AuditPlay - Backend

Este diretório contém uma API Express mínima que usa SQLite para armazenar respostas de auditoria.

Como rodar (Windows PowerShell):

1. Abrir um terminal na pasta `backend`:
   cd backend
2. Instalar dependências:
   npm install
3. Iniciar o servidor:
   npm start

O servidor ficará disponível em http://localhost:3000

Servir o frontend pelo mesmo servidor Node
------------------------------------------------
Depois de iniciar o backend, o servidor Express também serve os arquivos estáticos em `../frontend`.
Abra no navegador:

- http://localhost:3000/menu.html (ou /index.html)

Isso evita precisar rodar `python -m http.server` separadamente.

Endpoints principais:
- GET /api/health
- GET /api/audits/:category  -> retorna { category, data: { key: { answer, justification, updated_at } }}
- POST /api/audits/:category -> body: { data: { key: { answer, justification }, ... } }
Auth endpoints:
- POST /api/auth/signup -> body: { nome, email, empresa, cargo, senha }
   - réponse: { ok: true, user: { id, nome, email } } ou { error }
- POST /api/auth/login -> body: { email, senha }
   - réponse: { ok: true, user: { id, nome, email } } ou { error }

Categories/status:
- GET /api/categories -> retorna { data: { <category>: { status, updated_at } } }

Testando via PowerShell (exemplos)

# health
Invoke-RestMethod 'http://localhost:3000/api/health'

# signup
Invoke-RestMethod -Method POST -Uri 'http://localhost:3000/api/auth/signup' -Body (@{ nome='Seu Nome'; email='teste@ex.com'; empresa='MinhaEmpresa'; cargo='Analista'; senha='123456' } | ConvertTo-Json) -ContentType 'application/json'

# login
Invoke-RestMethod -Method POST -Uri 'http://localhost:3000/api/auth/login' -Body (@{ email='teste@ex.com'; senha='123456' } | ConvertTo-Json) -ContentType 'application/json'

# salvar respostas (exemplo para categoria 'organizacional')
Invoke-RestMethod -Method POST -Uri 'http://localhost:3000/api/audits/organizacional' -Body (@{ data = @{ politica_segurança = @{ answer='conforme'; justification='Política aprovada em 2025' } } } | ConvertTo-Json) -ContentType 'application/json'


Observações:
- O banco fica em `data/auditplay.db` (criado automaticamente). Você pode adicionar `data/` ao .gitignore se não quiser versionar o arquivo.
