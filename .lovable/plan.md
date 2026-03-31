

# Transcrição de Reuniões Google Meet com Leads

## Resumo

Implementar um sistema que permite ao vendedor iniciar a transcrição em tempo real de reuniões Google Meet com leads, reutilizando a infraestrutura Soniox ja existente. O vendedor clica num botao no header do chat ou no modal do lead, o sistema captura o microfone + audio da aba do Meet via `getDisplayMedia`, e transcreve tudo em tempo real. A transcrição e guardada na base de dados para consulta posterior.

## Fluxo do Utilizador

```text
1. Vendedor agenda reunião com lead (externa ao sistema, por enquanto)
2. Vendedor abre a aba do Google Meet no browser
3. No WhatsApp CRM, clica no botão de vídeo (já existe no LeadSmartHeader)
4. Abre um modal/painel de "Reunião ao Vivo"
5. Clica em "Iniciar Transcrição" -> permissão do mic + selecção da aba Meet
6. Transcrição aparece em tempo real (vendedor vs lead)
7. Ao terminar, clica "Parar" -> transcrição é guardada e pode ser analisada por IA
```

## Plano Técnico

### 1. Criar tabela `lead_meetings` no banco de dados

Nova tabela para armazenar sessões de reunião com leads:

- `id` (uuid, PK)
- `lead_id` (uuid, FK leads)
- `profile_id` (uuid, referencia profiles)
- `status` (text: 'active', 'ended')
- `transcriptions` (jsonb, array de segmentos)
- `ai_summary` (text, resumo gerado por IA)
- `ai_key_points` (jsonb)
- `ai_sentiment` (text)
- `duration_seconds` (integer)
- `started_at` (timestamptz)
- `ended_at` (timestamptz)
- `created_at` (timestamptz)

RLS: Admins e sellers podem ver/inserir/actualizar as suas reunioes.

### 2. Criar hook `useMeetingTranscription`

Reutiliza a mesma lógica do `useInterviewTranscription` (canal duplo Soniox), adaptado para o contexto de vendas:

- Captura microfone (vendedor) via `getUserMedia`
- Captura áudio do Meet (lead) via `getDisplayMedia`
- Dois WebSockets Soniox em paralelo (mesmo padrão existente)
- Auto-save a cada 10 segundos na tabela `lead_meetings`
- Labels: "Vendedor" (local) e nome do lead (remote)

### 3. Criar componente `MeetingTranscriptionModal`

Modal acessivel a partir do botao de video no `LeadSmartHeader`:

- Estado inicial: botao "Iniciar Transcrição" com instrucoes
- Durante transcrição: painel de transcrição em tempo real (reutiliza layout do `InterviewTranscriptionPanel`)
- Ao parar: salva a sessão final e fecha o modal
- Botao opcional "Analisar com IA" pos-reunião (invoca edge function existente `analyze-sales-call`)

### 4. Actualizar `LeadSmartHeader`

O botão de vídeo (já existe, linha 68-70) passa a abrir o `MeetingTranscriptionModal` em vez de não fazer nada.

### 5. Mostrar histórico de reuniões no `LeadDetailModal`

Adicionar uma secção na tab "Histórico" ou nova tab "Reuniões" mostrando:
- Lista de reuniões passadas com data, duração e resumo IA
- Transcrição completa expansivel

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migração SQL (lead_meetings) | Criar tabela + RLS |
| `src/hooks/useMeetingTranscription.ts` | Novo hook (baseado em useInterviewTranscription) |
| `src/components/whatsapp/MeetingTranscriptionModal.tsx` | Novo componente modal |
| `src/components/whatsapp/LeadSmartHeader.tsx` | Ligar botão vídeo ao modal |
| `src/hooks/useLeads.ts` | Adicionar query para lead_meetings |
| `src/components/leads/LeadDetailModal.tsx` | Mostrar histórico de reuniões |

## Segurança

- API key Soniox nunca exposta no front-end (obtida via edge function `get-soniox-token` existente)
- RLS na tabela `lead_meetings` garante isolamento por perfil
- Audio processado localmente, apenas texto vai para o banco de dados

