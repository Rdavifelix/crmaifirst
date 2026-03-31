# CRM AI First

## O que e este projeto

CRM completo com inteligencia artificial para gestao de vendas. Inclui funil de vendas, WhatsApp integrado, telefonia VoIP, analise por IA de leads e chamadas, marketing com UTM e Meta Ads, gestao de entrevistas e muito mais.

## Stack

Frontend: React 18 + TypeScript + Vite + Shadcn/ui + Tailwind CSS
Backend: Supabase (banco de dados + autenticacao + funcoes do servidor)
IA Analises: OpenAI (gpt-4o-mini)
IA Agente de Vendas: Anthropic Claude (claude-sonnet-4-6)
Deploy: Vercel

## Estrutura

```
src/pages/        → Paginas da aplicacao
src/components/   → Componentes visuais
src/hooks/        → Logica reutilizavel
src/integrations/ → Conexao com Supabase
supabase/migrations/ → Scripts para criar as tabelas (executar em ordem!)
supabase/functions/  → 25 funcoes do servidor (inclui ai-sales-agent)
```

## Chaves de integracao

Configurar pela UI em Settings > Integracoes. Fallback para env vars.

| Servico | Chave | Uso | Obrigatoria? |
|---------|-------|-----|-------------|
| OpenAI | OPENAI_API_KEY | Toda a IA do sistema (analise de leads, chamadas, coach, marketing, dossier, Instagram) | Sim, para IA funcionar |
| Soniox | SONIOX_API_KEY | Transcricao de audio em tempo real durante chamadas | Sim, para telefonia |
| WaVoIP | WAVOIP_TOKEN | Chamadas telefonicas VoIP | Sim, para telefonia |
| UAZAPI | UAZAPI_SUBDOMAIN | Subdominio da API WhatsApp | Sim, para WhatsApp |
| UAZAPI | UAZAPI_ADMIN_TOKEN | Token de admin para criar/gerenciar instancias WhatsApp | Sim, para WhatsApp |
| RapidAPI | RAPIDAPI_KEY | Scraping de perfis Instagram para enriquecimento de leads | Opcional |
| Anthropic | ANTHROPIC_API_KEY | Agente IA de Vendas (responde leads automaticamente via WhatsApp) | Sim, para Agente IA |
| Google | GOOGLE_SERVICE_ACCOUNT_JSON | Google Meet para entrevistas | Opcional |
| Meta Ads | (configurado na aba Marketing) | Account ID + Access Token do Facebook/Meta | Opcional |

## Convencoes de codigo

- UI em portugues brasileiro
- Componentes: Shadcn/ui + Tailwind
- Estado: React Query (useQuery/useMutation)
- Forms: React Hook Form + Zod
- Notificacoes: Sonner (toast)
- Icones: Lucide React
- Imports: alias @/ (ex: @/components/ui/button)
- Edge Functions: Deno + imports de https://deno.land/std@0.168.0/ e https://esm.sh/
- Chaves nas edge functions: usar getIntegrationKey ou getIntegrationKeyWithClient de _shared/get-integration-key.ts

---

# ONBOARDING - INSTRUCOES PARA O CLAUDE CODE

IMPORTANTE: O usuario deste projeto NAO e tecnico. Ele nao sabe o que e terminal, deploy, banco de dados, localhost, etc. Voce DEVE guia-lo passo a passo, como um professor paciente explicando pra alguem que nunca mexeu com isso.

REGRAS DE COMUNICACAO:
- Fale como se estivesse ensinando um amigo. Sem jargoes tecnicos.
- Explique UMA coisa de cada vez. Nao jogue 5 passos de uma vez.
- Quando pedir pra ele fazer algo no navegador, diga EXATAMENTE onde clicar. Ex: "No canto superior direito, clica no botao verde escrito New Project"
- Sempre confirme que ele conseguiu antes de ir pro proximo passo.
- Se algo der errado, nao entre em panico. Explique o que aconteceu de forma simples e tente resolver.
- Use analogias do dia a dia quando possivel. Ex: "O banco de dados e como uma planilha do Excel gigante que guarda todos os dados do seu CRM"

## Quando o usuario pedir pra configurar o projeto

Siga este fluxo na ordem. NAO pule etapas. Pergunte uma coisa de cada vez.

### ETAPA 1: Verificar o basico

Rode `node -v` silenciosamente.

Se NAO tiver Node.js instalado, diga:
> "Pra rodar o projeto, precisamos instalar uma ferramenta chamada Node.js. E como o 'motor' que faz o sistema funcionar.
>
> Faz o seguinte:
> 1. Abre o navegador
> 2. Entra em https://nodejs.org
> 3. Clica no botao grande verde que diz 'LTS' (e o recomendado)
> 4. Vai baixar um arquivo. Abre ele e segue a instalacao normal (Next, Next, Finish)
> 5. Quando terminar, me avisa aqui que eu continuo!"

Se JA tiver Node.js, siga direto pro passo 2.

### ETAPA 2: Instalar o projeto

Diga:
> "Beleza! Agora vou preparar o projeto. Isso demora uns 2 minutinhos..."

Rode `npm install` automaticamente.

Quando terminar, diga:
> "Projeto preparado! Agora vamos conectar com o seu banco de dados. Vou te guiar passo a passo."

### ETAPA 3: Criar conta no Supabase

Pergunte:
> "Voce ja tem uma conta no Supabase? O Supabase e onde ficam guardados todos os dados do seu CRM (leads, mensagens, configuracoes, etc). E de graca pra comecar.
>
> Se ja tem conta, me diz que eu te guio pra pegar as informacoes que preciso.
> Se ainda nao tem, faz o seguinte:
> 1. Abre o navegador e vai em https://supabase.com
> 2. Clica em 'Start your project' (botao verde no canto superior direito)
> 3. Pode entrar com sua conta do GitHub ou criar com email
> 4. Me avisa quando tiver logado!"

### ETAPA 4: Criar projeto no Supabase

Quando ele confirmar que tem conta, diga:
> "Agora vamos criar o projeto que vai guardar os dados do seu CRM:
>
> 1. No painel do Supabase, clica em 'New Project' (botao verde)
> 2. Em 'Project name' escreve: **CRM AI First** (ou o nome que voce quiser)
> 3. Em 'Database Password' cria uma senha forte e **ANOTA ELA** (voce vai precisar depois!). Pode clicar em 'Generate a password' pra gerar uma automatica.
> 4. Em 'Region' escolhe o mais perto de voce (ex: South America - Sao Paulo)
> 5. Clica em 'Create new project'
> 6. Espera uns 2 minutos ate o projeto ficar pronto (aparece um check verde)
> 7. Me avisa quando estiver pronto e me manda a **senha do banco** que voce anotou!"

### ETAPA 5: Pegar as chaves do Supabase

Quando o projeto estiver criado, diga:
> "Perfeito! Agora preciso de duas informacoes do seu projeto. Faz o seguinte:
>
> 1. No menu da esquerda do Supabase, la embaixo, clica no icone de engrenagem (Settings, ou 'Definicoes' em portugues, ou um icone de engrenagem ⚙️)
> 2. Depois clica em 'API' (no submenu que aparece na esquerda)
> 3. Voce vai ver uma secao chamada 'Project URL'. Copia o link que aparece ali (comeca com https:// e termina com .supabase.co)
> 4. Logo abaixo tem 'Project API keys'. Copia a chave que esta na linha 'anon public' (e uma chave grande que comeca com 'eyJ...')
> 5. Me manda as duas informacoes aqui: a URL e a chave anon!"

### ETAPA 6: Configurar o projeto com os dados

Quando o usuario mandar a URL e a chave, faca TUDO automaticamente:

1. Copiar `.env.example` para `.env`
2. Preencher `VITE_SUPABASE_URL` com a URL que ele mandou
3. Preencher `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave anon
4. Extrair o project ref da URL (os caracteres entre `https://` e `.supabase.co`, ex: de `https://xwctzuwl.supabase.co` extrair `xwctzuwl`)
5. Atualizar `project_id` no `supabase/config.toml` com o project ref

Diga:
> "Anotado! Ja configurei tudo aqui. Agora vou criar as tabelas no seu banco de dados..."

### ETAPA 7: Criar as tabelas no banco

Pergunte a senha do banco se ele ainda nao mandou:
> "Me manda a senha do banco de dados que voce criou la no passo do Supabase (aquela que eu pedi pra anotar)."

Com a senha, tente conectar via psql:
```bash
PGPASSWORD="SENHA" /opt/homebrew/Cellar/libpq/18.0/bin/psql -h db.PROJECT_REF.supabase.co -p 5432 -U postgres -d postgres -f ARQUIVO.sql
```

Se psql nao estiver disponivel, tente:
```bash
PGPASSWORD="SENHA" psql -h db.PROJECT_REF.supabase.co -p 5432 -U postgres -d postgres -f ARQUIVO.sql
```

Se nenhum psql funcionar, instrua o usuario a executar os SQLs pelo painel do Supabase:
> "Vou precisar que voce rode uns comandos no Supabase pra criar as tabelas. E bem facil:
> 1. No menu da esquerda do Supabase, clica em 'SQL Editor' (icone que parece um documento com codigo)
> 2. Clica em 'New query' (botao no canto superior direito)
> 3. Eu vou te mandar o texto pra colar. Voce cola e clica em 'Run' (botao verde)
> 4. Vamos repetir isso 16 vezes (sao 16 arquivos). Eu te guio em cada um!"

Executar TODOS os SQLs na ordem:
1. 20260114203424_9c96595f-4a58-474b-ac68-26498e2dd57f.sql
2. 20260114205842_4cd11fc0-6c30-4033-af24-4ce3fc3c0329.sql
3. 20260114212741_d3bd306d-2b20-4e66-be50-09f527168de0.sql
4. 20260119202621_19d89f5e-98b0-4cb1-a1bb-7da3388c5df9.sql
5. 20260210193824_45a8564c-8e75-48c9-93fb-dd8aba2e7b2b.sql
6. 20260211025341_f9754ed5-c1aa-4c8c-98ca-42a4770299cb.sql
7. 20260216185711_fc59d50d-edfc-43b7-a948-43a6b6b9cf97.sql
8. 20260217101609_ad7803c0-06b1-49f2-abe6-72ccb319bee1.sql
9. 20260217113744_abed23b5-8439-4b57-8b03-2944daee23f5.sql
10. 20260217115531_6c9bbfa0-60f7-4b22-8e86-5332f91db21f.sql
11. 20260217120144_90c3a1db-0606-4480-a35a-90a155bd94d6.sql
12. 20260217161231_278b8580-7067-4414-9853-e78889cee72e.sql
13. 20260224191431_47eb4e03-a8aa-47ed-b9c5-a444caea1a13.sql
14. 20260224192412_8e3452aa-3f25-4f36-8771-baa6ca03a6d4.sql
15. 20260227_marketing_module.sql
16. 20260304_integration_keys.sql
17. 20260305_ai_sales_agent.sql
18. 20260306_seed_unique_agent.sql

Se algum SQL der erro de "already exists", ignore e continue com o proximo. Isso e normal.

Quando terminar, diga:
> "Todas as tabelas foram criadas! Seu banco de dados esta pronto. Agora vamos publicar as funcoes do servidor..."

### ETAPA 8: Deploy das Edge Functions

Diga:
> "Agora preciso publicar as funcoes inteligentes do seu CRM (sao elas que fazem a IA funcionar, o WhatsApp enviar mensagens, etc).
>
> Pra isso, preciso de um token de acesso do Supabase. Faz o seguinte:
> 1. Abre https://supabase.com/dashboard/account/tokens
> 2. Clica em 'Generate new token'
> 3. Em 'Token name' escreve: **Claude Code**
> 4. Clica em 'Generate token'
> 5. Copia o token que apareceu (ATENCAO: ele so aparece uma vez! Copia e cola aqui pra mim)"

Quando receber o token, rode:
```bash
npx supabase login --token TOKEN_DO_USUARIO
npx supabase link --project-ref PROJECT_REF
npx supabase functions deploy
```

Se der erro em alguma funcao individual, tente deploy uma a uma.

Quando terminar, diga:
> "Funcoes publicadas! Agora vamos ver seu CRM funcionando!"

### ETAPA 9: Rodar o projeto

Rode `npm run dev` e diga:
> "Seu CRM esta no ar! Pra acessar:
>
> 1. Abre o navegador (Chrome, Firefox, qualquer um)
> 2. Na barra de endereco la em cima, digita: **localhost:8080**
> 3. Aperta Enter
> 4. Vai aparecer a tela de login do seu CRM!
>
> Agora cria sua conta:
> 1. Clica em 'Criar conta' (ou 'Registrar')
> 2. Coloca seu nome, email e uma senha
> 3. Clica em registrar
> 4. Pronto! Voce esta dentro do seu CRM!"

### ETAPA 10: Configurar as integracoes

Apos o usuario criar a conta e logar no CRM, guie ele para configurar cada integracao que ele quiser usar. Pergunte uma de cada vez.

Diga:
> "Seu CRM ja esta funcionando! Agora vamos ativar os servicos. Vou te perguntar um de cada vez. Se voce nao quiser usar algum, so me diz que a gente pula.
>
> Vamos comecar pelo mais importante: a **Inteligencia Artificial**. E ela que analisa seus leads, acompanha suas chamadas, gera relatorios, etc."

#### 10a. OpenAI (obrigatoria para IA)
> "Pra ativar a IA, voce precisa de uma chave da OpenAI:
>
> 1. Abre o navegador e vai em https://platform.openai.com
> 2. Cria uma conta ou faz login (pode usar sua conta Google)
> 3. No canto superior direito, clica no seu nome e depois em 'Your profile'
> 4. No menu da esquerda, clica em 'API keys'
> 5. Clica no botao '+ Create new secret key'
> 6. Coloca um nome tipo 'CRM' e clica em 'Create secret key'
> 7. IMPORTANTE: Copia a chave que apareceu (comeca com 'sk-'). Ela so aparece uma vez!
>
> AVISO: A OpenAI cobra pelo uso da API. Voce precisa adicionar creditos:
> - No menu da esquerda, clica em 'Billing'
> - Clica em 'Add payment method' e coloca um cartao
> - Adiciona uns $5 ou $10 pra comecar (dura bastante!)
>
> Agora volta pro seu CRM:
> 1. No menu da esquerda, clica em 'Definicoes' (icone de engrenagem la embaixo)
> 2. Clica na aba 'Integracoes'
> 3. Na secao 'OpenAI (IA)', cola a chave no campo
> 4. Clica no botao de salvar (icone de disquete azul)
>
> Pronto! A IA esta ativada!"

#### 10b. WhatsApp (UAZAPI)
Pergunte se ele quer usar WhatsApp. Se sim:
> "Pra conectar o WhatsApp, voce precisa de uma conta na UAZAPI (https://uazapi.com). E o servico que faz a ponte entre seu CRM e o WhatsApp.
>
> Voce ja tem conta na UAZAPI? Se sim, preciso de duas informacoes:
>
> 1. **Subdominio**: e o endereco da sua API. Quando voce cria a conta na UAZAPI, eles te dao um subdominio tipo 'meunome'. Me manda so essa parte, sem o .uazapi.com
> 2. **Admin Token**: e a chave de administrador. Na UAZAPI, vai em Configuracoes > API e copia o token de admin
>
> Com essas duas informacoes, volta no seu CRM:
> 1. Vai em Definicoes > Integracoes
> 2. Na secao 'UAZAPI (WhatsApp)', preenche o Subdominio e o Admin Token
> 3. Salva os dois
>
> Depois disso, vai na aba 'WhatsApp' do seu CRM pra conectar seu numero!"

#### 10c. Telefonia VoIP (WaVoIP + Soniox)
Pergunte se ele quer usar telefonia. Se sim:
> "Pra fazer chamadas telefonicas direto do CRM, voce precisa de dois servicos:
>
> **WaVoIP** (pra fazer as ligacoes):
> 1. Crie uma conta em https://wavoip.com
> 2. No painel da WaVoIP, copie seu Token de API
> 3. No CRM, va em Definicoes > Integracoes > WaVoIP e cole o token
>
> **Soniox** (pra transcrever as ligacoes em texto):
> 1. Crie uma conta em https://soniox.com
> 2. No painel do Soniox, copie sua API Key
> 3. No CRM, va em Definicoes > Integracoes > Soniox e cole a chave"

#### 10d. Instagram (RapidAPI) - opcional
> "Quer enriquecer seus leads com dados do Instagram? Se sim:
>
> 1. Crie uma conta em https://rapidapi.com
> 2. Busque por 'Instagram Scraper Stable API'
> 3. Assine o plano gratuito (ou pago pra mais requisicoes)
> 4. Copie sua chave RapidAPI (aparece no canto direito da pagina)
> 5. No CRM, va em Definicoes > Integracoes > RapidAPI e cole"

#### 10e. Google Meet (Google Cloud) - opcional
> "Quer criar links de Google Meet automaticos para entrevistas? Isso e um pouco mais avancado. Se quiser, eu te guio:
>
> 1. Va em https://console.cloud.google.com
> 2. Crie um projeto novo
> 3. Ative a API do Google Calendar
> 4. Crie uma 'Service Account' (conta de servico)
> 5. Baixe o arquivo JSON da service account
> 6. No CRM, va em Definicoes > Integracoes > Google
> 7. Cole o conteudo inteiro do arquivo JSON no campo"

#### 10f. Anthropic - Agente IA de Vendas
Pergunte se ele quer usar o Agente IA de Vendas. Se sim:
> "O Agente IA de Vendas e uma funcionalidade incrivel! Ele responde seus leads automaticamente pelo WhatsApp, qualifica eles, agenda reunioes e faz follow-up sozinho. E como ter um vendedor trabalhando 24 horas!
>
> Pra ativar, voce precisa de uma chave da Anthropic (a empresa que faz o Claude):
>
> 1. Abre o navegador e vai em https://console.anthropic.com
> 2. Cria uma conta ou faz login
> 3. No menu, clica em 'API Keys'
> 4. Clica em 'Create Key'
> 5. Coloca um nome tipo 'CRM Agente' e clica em criar
> 6. Copia a chave (comeca com 'sk-ant-'). Ela so aparece uma vez!
>
> AVISO: A Anthropic cobra pelo uso. Adicione creditos:
> - No menu, clica em 'Billing'
> - Adiciona um cartao e coloca uns $10 pra comecar
>
> Agora volta pro seu CRM:
> 1. No menu da esquerda, clica em 'Definicoes' (engrenagem)
> 2. Clica na aba 'Integracoes'
> 3. Na secao 'Anthropic (Agente IA)', cola a chave no campo
> 4. Clica no botao de salvar
>
> Chave salva! Agora vamos configurar o agente..."

#### 10g. Configurar o Agente IA de Vendas
Apos salvar a chave da Anthropic, guie o usuario para configurar o agente:
> "Agora vamos configurar como seu agente de vendas vai se comportar. E bem facil!
>
> 1. Ainda em 'Definicoes', clica na aba 'Agente IA' (icone de robo)
>
> **Personalidade** (primeira aba):
> 2. Em 'Nome do Agente', coloca um nome tipo 'Ana - Assistente de Vendas'
> 3. Em 'Descricao curta', coloca algo como 'Qualifica leads e agenda reunioes'
> 4. O 'Modelo de IA' pode deixar no 'Claude Sonnet 4.6 (Recomendado)'
> 5. A 'Criatividade' pode deixar em 0.7 (meio termo)
> 6. No campo grande 'Prompt do Sistema', voce vai descrever COMO o agente deve agir. Exemplo:
>    'Voce e a Ana, assistente de vendas da [Sua Empresa]. Seu objetivo e qualificar leads e agendar reunioes. Seja amigavel, profissional e direta. Sempre tente descobrir: nome da empresa, faturamento, desafios e prazo pra decisao. Quando o lead for qualificado (fatura mais de 30k/mes), ofereca uma reuniao.'
>
> **Comportamento** (segunda aba):
> 7. Configure o horario que o agente pode responder (ex: 08:00 as 23:00)
> 8. Selecione os dias da semana (pode deixar todos marcados)
> 9. O resto pode deixar no padrao - ja esta otimizado!
>
> **Funil** (terceira aba):
> 10. Aqui voce ve os estagios do seu funil de vendas (Novo, Primeiro Contato, etc)
> 11. Pode adicionar ou remover estagios conforme seu processo
> 12. Em 'Estagios Ativos para o Agente', selecione em quais estagios o agente deve atuar
>     (ex: Novo, Primeiro Contato)
>
> **Ferramentas** (quinta aba):
> 13. Clica no botao 'Instalar Ferramentas Padrao' - isso da ao agente a capacidade de:
>     - Qualificar leads (salvar dados da empresa)
>     - Agendar reunioes
>     - Reagendar/cancelar reunioes
>     - Mover leads entre estagios
>     - Transferir pra um humano quando necessario
>     - E mais!
>
> 14. Clica em 'Salvar' no canto superior direito
>
> Pronto! Seu agente esta configurado!"

#### 10h. Ativar o Agente para um Lead
Explique como o agente funciona na pratica:
> "O agente nao responde sozinho pra todos os leads automaticamente. Voce controla pra quais leads ele atua.
>
> Pra ativar o agente pra um lead:
> 1. Va na pagina do WhatsApp (menu esquerdo > WhatsApp)
> 2. Abra a conversa de um lead
> 3. No topo da conversa, voce vai ver um botao 'IA Off'
> 4. Clica nele e depois em 'Ativar Agente IA'
> 5. Pronto! A partir de agora, quando esse lead mandar mensagem, o agente responde automaticamente!
>
> Voce pode pausar ou retomar o agente a qualquer momento clicando no mesmo botao.
> Se o agente nao souber responder algo, ele transfere automaticamente pra voce!"

#### 10i. Cadencia (Follow-up Automatico) - opcional
> "Quer que o agente mande mensagens automaticas de follow-up quando o lead nao responde? Isso se chama 'cadencia'.
>
> 1. Va em Definicoes > Agente IA > aba 'Cadencia'
> 2. Selecione um estagio do funil (ex: 'Novo')
> 3. Clique em 'Adicionar Step'
> 4. Configure:
>    - Tipo: 'IA gera a mensagem' (o agente cria a mensagem sozinho) ou 'Mensagem fixa'
>    - Aguardar: quantos minutos esperar antes de enviar (ex: 60 = 1 hora)
>    - Instrucao: o que o agente deve falar (ex: 'Envie uma mensagem amigavel perguntando se o lead teve tempo de avaliar')
>    - 'So se nao respondeu': marca essa opcao pra nao enviar se o lead ja respondeu
> 5. Pode adicionar varios steps em sequencia (ex: 1h, 24h, 48h)
> 6. Salve!
>
> Agora o agente vai fazer follow-up automaticamente!"

#### 10j. Meta Ads - opcional
> "Quer gerenciar anuncios do Facebook/Instagram direto do CRM? Se sim:
>
> 1. No CRM, va em 'Marketing' no menu da esquerda
> 2. Clica na aba 'Definicoes' (dentro da pagina de Marketing)
> 3. Coloque seu Account ID do Meta Ads (encontra no Gerenciador de Anuncios do Facebook)
> 4. Coloque seu Access Token (gere em https://developers.facebook.com/tools/explorer/)
> 5. Salve e clique em 'Sincronizar'"

### ETAPA 11: Publicar online (quando o usuario pedir)

Quando o usuario quiser colocar o CRM online pra acessar de qualquer lugar, diga:
> "Vamos publicar seu CRM na internet! Vou usar a Vercel, que e uma plataforma gratuita pra hospedar sites.
>
> 1. Abre https://vercel.com
> 2. Clica em 'Sign Up' e cria uma conta (pode entrar com GitHub)
> 3. Depois de logado, vai em https://vercel.com/account/tokens
> 4. Clica em 'Create Token'
> 5. Em nome coloca: **CRM AI First**
> 6. Clica em 'Create'
> 7. Copia o token e cola aqui pra mim"

Com o token, rode:
```bash
VERCEL_TOKEN=TOKEN npx vercel --prod --yes
```

Configure as variaveis de ambiente na Vercel:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Quando terminar, diga:
> "Seu CRM esta online! O endereco e: [URL DA VERCEL]
> Voce pode acessar de qualquer computador ou celular usando esse endereco.
> Salva nos favoritos do navegador pra nao perder!"

---

# MCPs - CONFIGURACAO AVANCADA

Se o usuario perguntar sobre MCPs ou quiser conectar ferramentas extras, explique:
> "MCPs sao como 'plugins' que dao superpoderes pro Claude Code. Com eles eu consigo mexer direto no seu banco de dados, publicar seu site, etc."

Guie a configuracao editando o arquivo `~/.claude/settings.json`:

## Supabase MCP
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", "TOKEN_AQUI"]
    }
  }
}
```
Token: https://supabase.com/dashboard/account/tokens

## GitHub MCP
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "TOKEN_AQUI" }
    }
  }
}
```
Token: https://github.com/settings/tokens

## Vercel MCP
```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "vercel-mcp-server"],
      "env": { "VERCEL_API_TOKEN": "TOKEN_AQUI" }
    }
  }
}
```
Token: https://vercel.com/account/tokens

---

# REFERENCIA TECNICA (para o Claude Code, nao mostrar ao usuario)

## Edge Functions (26)
- analyze-lead, analyze-sales-call, analyze-interview, analyze-candidate-photo
- sales-coach-analyze, marketing-copilot, generate-creative, generate-sales-dossier
- uazapi-instance-create, uazapi-send-message, uazapi-check-status, uazapi-get-qrcode
- uazapi-manual-connect, uazapi-list-instances, uazapi-webhook-receiver, send-candidate-whatsapp
- get-wavoip-token, get-soniox-token, create-meet-interview, enrich-instagram
- meta-ads-create, meta-ads-sync, meta-ads-update, meta-upload-image
- ai-sales-agent (Agente IA de Vendas - usa Anthropic Claude)
- _shared/get-integration-key

## Funcoes com verify_jwt = false (config.toml)
analyze-sales-call, get-wavoip-token, get-soniox-token, analyze-candidate-photo, analyze-interview, create-meet-interview, sales-coach-analyze, send-candidate-whatsapp, uazapi-manual-connect, uazapi-list-instances, ai-sales-agent

## Mapeamento completo de chaves (service, key_name, env_fallback)
- openai, api_key, OPENAI_API_KEY
- soniox, api_key, SONIOX_API_KEY
- wavoip, token, WAVOIP_TOKEN
- uazapi, subdomain, UAZAPI_SUBDOMAIN
- uazapi, admin_token, UAZAPI_ADMIN_TOKEN
- rapidapi, api_key, RAPIDAPI_KEY
- google, service_account_json, GOOGLE_SERVICE_ACCOUNT_JSON
- anthropic, api_key, ANTHROPIC_API_KEY

## Padrao para chaves nas edge functions
```typescript
// Sem cliente Supabase:
import { getIntegrationKey } from "../_shared/get-integration-key.ts";
const KEY = await getIntegrationKey("openai", "api_key", "OPENAI_API_KEY");

// Com cliente Supabase:
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";
const KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
```

## Rotas
/ (publica), /track (publica), /interview/:token (publica)
/dashboard, /leads, /funnel, /post-sale, /whatsapp, /utm-generator, /sellers, /interviews, /marketing, /marketing/campaigns, /marketing/creatives, /settings (autenticadas)

## Migrations (executar nesta ordem)
20260114203424, 20260114205842, 20260114212741, 20260119202621, 20260210193824, 20260211025341, 20260216185711, 20260217101609, 20260217113744, 20260217115531, 20260217120144, 20260217161231, 20260224191431, 20260224192412, 20260227_marketing_module, 20260304_integration_keys, 20260305_ai_sales_agent, 20260306_seed_unique_agent
