# Auditplay

Projeto desenvolvido como MVP da disciplina **Ferramentas de Desenvolvimento para Web (FDW)** - Fatec São Caetano do Sul.

## Integrantes
- Gabriela Nascimento da Silva
- André Lucio Carneiro da Silva

## Descrição
um software para ajudar na auditoria das emprersas , facilitando o uso ganhando tempo e centralizando as informacoes,
nosso projeto ajuda na pre-auditora onde o usuario faz um cadastro reponde as perguntas relacionadas a ISO 27002 
assim um auditor consegue analizar as respostas e justificativas e avaliar ajudando a empresa saber que esta pronta ou nao para a auditoria oficial

# Instruções de Teste do MVP – AuditPlay

Este documento descreve, passo a passo, como executar e testar o projeto **AuditPlay** 
## 1. Pré-requisitos
Para executar o projeto, é necessário:
1. ter Git instalado
   - Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)  
   - Durante a instalação no Windows, manter a opção padrão  
     **“Git from the command line and also from 3rd-party software”**.
2. **Docker Desktop instalado**  
   - Download: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)  
   - Após instalar, abrir o Docker Desktop e aguardar até aparecer como **“Running”**.

## 2. Clonar o repositório

1. Abrir o **PowerShell** ou **Terminal**.
2. Escolher uma pasta de trabalho, por exemplo:
 	 cd C:\Users\SeuUsuario\Desktop
3. Clonar o repositório:
Copiar código
git clone https://github.com/gabrielasn2312-bit/fatec-scs-fdw-2025-2-auditplay.git
4.Entrar na pasta do projeto:
Copiar código:
cd fatec-scs-fdw-2025-2-auditplay\auditplay
digite: ls
Dentro desta pasta devem aparecer os arquivos  :
backend/
frontend/
Dockerfile
.dockerignore
.gitignore
README.md

3. Construir a imagem Docker da aplicação
Com o Docker Desktop em execução e ainda dentro da pasta auditplay:
Copiar código
docker build -t auditplay-app .
Esse comando irá:
Copiar o código do backend (Node.js),
Instalar as dependências (npm install),
Copiar o frontend para dentro da imagem,
Preparar a imagem para rodar a aplicação.
Ao final, a saída esperada inclui algo como:
Successfully built <id_da_imagem>
Successfully tagged auditplay-app:latest

4. Executar o container da aplicação
Ainda na pasta auditplay, executar:
docker run -p 3000:3000 --name auditplay-app-container auditplay-app

A porta 3000 do container será exposta na porta 3000 da máquina local.
O backend será executado usando node server.js.
Se tudo ocorrer bem, o log deve mostrar algo similar a:
> auditplay-backend@1.0.0 start
> node server.js
API server running on http://localhost:3000


5. Acessar o sistema no navegador

Abrir o navegador e acessar:  http://localhost:3000
É para abrir a tela de login/cadastro do auditplay

