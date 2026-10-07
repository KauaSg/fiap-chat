# FIAP Chat — React Native + Firebase

Aplicativo de chat individual e em grupo desenvolvido em React Native com TypeScript e Expo SDK 57.

O projeto utiliza Firebase Authentication, Cloud Firestore e Firebase Realtime Database. As fotos são armazenadas no Cloudinary, e a API Node.js/Express está na pasta `server`.

## Estado atual

A base funcional do projeto já contém:

- autenticação por e-mail e senha;
- cadastro com nome, celular, nascimento e foto;
- diretório de usuários;
- criação de conversa individual sem duplicidade;
- criação/edição de grupos;
- limite de integrantes validado no backend com transação;
- mensagens no Firebase Realtime Database;
- listeners em tempo real;
- perfis, grupos, conversas e tokens no Firestore;
- upload de imagens no Cloudinary, persistindo apenas as URLs no Firestore;
- API própria em Node.js + Express + TypeScript;
- validação de Firebase ID Token no backend;
- políticas de notificação;
- proteção contra envio duplicado de push;
- Firebase Cloud Messaging (FCM) para tokens Android e Expo Push Service como fallback/caminho iOS;
- regras iniciais de Firestore e Realtime Database;
- projeto sem `any`.

## Integrantes

- RM 559044 — Kauã Soares Guimarães
- RM 557283 — Pietro Vitor Pezzente
- RM 557082 — Eric Darakjian
- RM 558887 — Enzo Mikael Sanches Baptista Paes Fontes

## Requisitos locais

- Node.js 20.19 ou superior;
- npm;
- conta Firebase;
- conta Expo/EAS para development build e notificações.

## 1. Firebase

Crie um projeto Firebase e ative:

1. Authentication → Email/Password;
2. Cloud Firestore;
3. Realtime Database;
4. Firebase Cloud Messaging para notificações;

O Cloudinary é configurado separadamente para o armazenamento das fotos de perfil e de grupo.

Copie a configuração do SDK cliente para `firebaseConfig.json`. **Não** coloque chave privada, service account ou credenciais do Admin SDK nesse arquivo.

Publique as regras:

```bash
firebase deploy --only firestore:rules,database
```

## 2. Aplicativo

Crie `.env` a partir de `.env.example`:

```env
EXPO_PUBLIC_API_URL=https://fiap-chat.onrender.com
```

Instale as dependências:

```bash
npm install
npx expo install --fix
```

Configure o projeto EAS e substitua `CONFIGURAR_COM_EAS` em `app.json` pelo `projectId` gerado:

```bash
npx eas-cli init
```

Para notificações remotas, use development build:

```bash
npx eas-cli build --profile development --platform android
```

Depois:

```bash
npm start
```

## 3. API

A API está publicada no Render em:

```text
https://fiap-chat.onrender.com
```

Health check público:

```text
GET https://fiap-chat.onrender.com/health
```

Resposta esperada:

```json
{"ok":true,"service":"fiap-chat-api"}
```

Na pasta `server`, crie `.env` com base em `server/.env.example` para desenvolvimento local.

Os valores administrativos devem existir **somente** nas variáveis secretas da hospedagem:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_DATABASE_URL=...
```

Nunca publique a chave privada no GitHub.

Para desenvolvimento local:

```bash
cd server
npm install
npm run dev
```

### Endpoints autenticados

- `POST /conversations/direct`
- `POST /groups`
- `PATCH /groups/:groupId`
- `GET /profiles/:uid`
- `POST /notifications/messages`

Todos exigem `Authorization: Bearer <firebase-id-token>`.

## 4. Bancos

### Firestore

- `users/{uid}` — perfil completo, acessível diretamente apenas pelo próprio usuário;
- `users/{uid}/devices/{deviceId}` — tokens de dispositivo;
- `userDirectory/{uid}` — nome/foto para usuários autenticados;
- `directConversations/{conversationId}` — participantes;
- `groups/{groupId}` — metadados e integrantes;
- `notificationDispatches/{conversationId--messageId}` — idempotência do push.

### Realtime Database

- `messages/{conversationId}/{messageId}` — mensagens;
- `conversationAccess/{conversationId}/{uid}` — autorização sincronizada pelo backend.

## 5. Políticas de notificação

- `all_group_messages`: todos os integrantes atuais, exceto o remetente;
- `mentioned_members`: somente usuários mencionados/selecionados;
- `direct_messages_only`: mensagens de grupo não geram push;
- `disabled`: o grupo não gera push.

Conversas individuais notificam o outro participante.

## 6. Proteção do limite de integrantes

A criação e alteração de grupos ocorre pela API. Atualizações usam transação do Firestore e rejeitam operações em que `memberIds.length > memberLimit`. Depois da confirmação, a API sincroniza `conversationAccess` no Realtime Database. Isso impede que o cliente contorne a validação apenas manipulando a interface.

## 7. Notificações

O aplicativo registra:

- Expo Push Token;
- token nativo do dispositivo;
- plataforma e provider.

No Android, a API prioriza o token nativo FCM via Firebase Admin SDK. Nos demais casos usa Expo Push Service. O payload contém `conversationId` e `conversationType`, e o aplicativo direciona o usuário para a conversa correta ao tocar na notificação.

## 8. Segurança

- regras abertas permanentemente não são utilizadas;
- mensagens só podem ser criadas por usuários presentes em `conversationAccess`;
- `senderId` deve corresponder ao `auth.uid`;
- conversas/grupos são gravados pelo backend autenticado;
- perfis completos de terceiros são fornecidos pela API somente quando existe conversa individual ou grupo em comum;
- credenciais administrativas ficam fora do aplicativo e do GitHub.

## 9. Pontos que dependem do ambiente de entrega

- API pública configurada e disponível em `https://fiap-chat.onrender.com`;
- configurar o projeto EAS e o development build para validar notificações remotas;
- credenciais administrativas do Firebase configuradas somente nas variáveis secretas da hospedagem.

### Firebase configurado

O cliente está configurado para o projeto Firebase `fiap-chat-f28b5`, incluindo a URL do Realtime Database. O arquivo `firebaseConfig.json` contém somente a configuração pública do SDK cliente; credenciais administrativas continuam proibidas no repositório.

## Configuração do Cloudinary

As fotos de perfil e de grupo são enviadas ao Cloudinary. O aplicativo usa um upload preset unsigned restrito e armazena apenas a URL HTTPS resultante no Firestore.

Configuração cliente versionada em `cloudinaryConfig.json`:

```json
{
  "cloudName": "mbrxdkrq",
  "uploadPreset": "fiap_chat_unsigned"
}
```

O preset deve permanecer com `Signing mode: Unsigned`, usando a pasta de assets `fiap-chat`. Não é necessário nem permitido colocar API Secret do Cloudinary no aplicativo.

## Testes no Expo Go

O aplicativo detecta quando está sendo executado no Expo Go e não inicializa o registro de push remoto nesse ambiente. Isso permite testar autenticação, Firestore, Realtime Database, Cloudinary, conversas e grupos no Expo Go.

As notificações push remotas continuam implementadas e devem ser validadas em um **development build**, pois o Expo Go no Android não oferece suporte a push remoto desde o SDK 53.
