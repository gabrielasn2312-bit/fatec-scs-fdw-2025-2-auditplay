FROM node:18

# Vamos trabalhar a partir da pasta /app/backend
WORKDIR /app/backend

# Copia apenas os manifests do backend (onde está o package.json)
COPY backend/package*.json ./

# Instala as dependências do backend
RUN npm install

# Agora copia TODO o código do backend para /app/backend
COPY backend/. .

# ⬇️ AQUI ESTÁ A MUDANÇA IMPORTANTE
# Antes estava: COPY frontend /frontend
# Agora vamos copiar para /app/frontend (que é o que o seu código espera ao usar ..\frontend)
COPY frontend /app/frontend

# Porta em que o Node está ouvindo (ajuste se não for 3000)
EXPOSE 3000

# Usa o script "start": "node server.js"
CMD ["npm", "start"]
