# Fase 0: o que foi construído e como funciona

Documentação da base do app ao fim da Fase 0. Escrita para quem vem de infra/SRE e precisa entender a estrutura sem viver no código do dia a dia.

**Estado:** o app abre no emulador Android com tema, fontes e quatro abas vazias. Não há mapa, login, banco de dados nem regra de negócio ainda. A Fase 0 é só a fundação.

## Sumário

1. [Visão geral em um minuto](#1-visão-geral-em-um-minuto)
2. [Como um app React Native é montado](#2-como-um-app-react-native-é-montado)
3. [Stack e versões](#3-stack-e-versões)
4. [Mapa do repositório](#4-mapa-do-repositório)
5. [O que acontece quando o app abre](#5-o-que-acontece-quando-o-app-abre)
6. [Navegação](#6-navegação)
7. [Tema: cores, tipografia e espaçamento](#7-tema-cores-tipografia-e-espaçamento)
8. [Fontes](#8-fontes)
9. [Configuração do app e segredos](#9-configuração-do-app-e-segredos)
10. [Build e execução](#10-build-e-execução)
11. [Qualidade de código](#11-qualidade-de-código)
12. [Dependências e o porquê de cada uma](#12-dependências-e-o-porquê-de-cada-uma)
13. [Decisões tomadas](#13-decisões-tomadas)
14. [Problemas encontrados no caminho](#14-problemas-encontrados-no-caminho)
15. [O que ainda não existe](#15-o-que-ainda-não-existe)
16. [Glossário](#16-glossário)

## 1. Visão geral em um minuto

- O app é escrito em **TypeScript** com **React Native**, usando o framework **Expo**.
- A interface é descrita em código (`src/`). O Expo gera o projeto Android nativo a partir da configuração, e o Gradle compila tudo num APK.
- Hoje existem quatro telas vazias (Mapa, Viagens, Conquistas, Perfil) ligadas por uma barra de abas.
- Cores, fontes e medidas vêm de um único arquivo de tema, que espelha os tokens de design em `docs/referencias/tokens/`.
- As fontes vão embarcadas dentro do APK.
- Nenhum dado sai do aparelho: não há backend, rede nem armazenamento nesta fase.

## 2. Como um app React Native é montado

Um app React Native tem duas metades, e entender a divisão explica quase todo o fluxo de trabalho.

```
┌──────────────────────────── APK instalado no aparelho ────────────────────────────┐
│                                                                                    │
│  Metade nativa (Kotlin/C++)                 Metade JavaScript                      │
│  ─────────────────────────                  ──────────────────                     │
│  Runtime do React Native                    Nosso código em src/                   │
│  Módulos nativos (navegação,                (telas, tema, lógica)                  │
│  fontes, e depois mapa e Skia)                                                     │
│                                                                                    │
│  Muda pouco. Exige recompilar.              Muda o tempo todo. Recarrega na hora.  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

| Conceito | O que é | Paralelo com infra |
| --- | --- | --- |
| **Metade nativa** | Código compilado para Android. Inclui o runtime e as bibliotecas com código nativo. | A imagem base de um container: demora para construir, muda raramente. |
| **Metade JavaScript** | O código em `src/`, empacotado num "bundle". | A aplicação que roda sobre a imagem: muda a cada commit. |
| **Metro** | Servidor de desenvolvimento que empacota o JavaScript e envia para o app aberto. Recarrega a tela quando um arquivo é salvo. | Um dev server com hot reload. |
| **Development build** | Um APK nosso, de desenvolvimento, que contém a metade nativa e busca o JavaScript no Metro. | Uma imagem de dev que monta o código por volume. |
| **Prebuild** | Passo em que o Expo gera a pasta `android/` a partir do `app.json` e dos plugins. | Geração de código a partir de uma declaração: `android/` é artefato, `app.json` é a fonte. |
| **Config plugin** | Extensão que altera o projeto nativo durante o prebuild. | Um módulo que aplica mudanças na geração, em vez de editar o resultado à mão. |

Duas consequências práticas:

- **A pasta `android/` não vai para o git e nunca é editada à mão.** Ela é regenerada. Toda configuração nativa mora no `app.json`.
- **Só é preciso recompilar quando a metade nativa muda**, ou seja, quando entra uma biblioteca com código nativo ou muda o `app.json`. Mudanças em `src/` aparecem na hora pelo Metro.

O app não usa o **Expo Go** (o app genérico da loja) porque ele só roda os módulos nativos que já traz. O mapa (Mapbox) e a névoa (Skia), que entram na Fase 1, têm código nativo próprio. Por isso compilamos o nosso development build.

## 3. Stack e versões

| Camada | Tecnologia | Versão |
| --- | --- | --- |
| Linguagem | TypeScript (modo estrito) | 6.0 |
| Framework | Expo SDK | 58 |
| Runtime | React Native | 0.88 |
| Biblioteca de UI | React | 19.3 |
| Navegação | Expo Router (rotas por arquivo) | 58 |
| Gerenciador de pacotes | npm | 11 |
| Build Android | Gradle 9.4, JDK 17, NDK 27.1, CMake 4.1.2 | |
| Alvo de teste | Emulador Android (API 37) | |

Identificadores do app:

- Nome exibido: `Planejador de viagens` (provisório)
- Package Android e bundle iOS: `com.brooksbru.planejadorviagens`
- Esquema de deep link: `planejadorviagens://`

## 4. Mapa do repositório

```
planejador_viagens/
├── app.json                 Configuração do app: nome, ícone, package, plugins nativos
├── package.json             Dependências e scripts (npm run ...)
├── package-lock.json        Versões exatas travadas
├── tsconfig.json            Configuração do TypeScript (atalho @/ → src/)
├── eslint.config.js         Regras de lint
├── .prettierrc.json         Regras de formatação
├── .gitattributes           Força fim de linha LF no repositório
├── .env.example             Lista das variáveis de ambiente (sem valores)
├── CLAUDE.md                Contexto e convenções para o assistente de código
├── AGENTS.md                Regras gerais do Expo para assistentes (veio do template)
│
├── src/
│   ├── app/                 ROTAS: cada arquivo aqui é uma tela
│   │   ├── _layout.tsx      Raiz: liga o tema e define a navegação principal
│   │   └── (tabs)/
│   │       ├── _layout.tsx  Barra de abas
│   │       ├── index.tsx    Aba Mapa (tela inicial)
│   │       ├── viagens.tsx  Aba Viagens
│   │       ├── conquistas.tsx  Aba Conquistas
│   │       └── perfil.tsx   Aba Perfil
│   ├── components/
│   │   └── EmptyScreen.tsx  Tela-placeholder usada pelas abas vazias
│   └── theme/
│       ├── tokens.ts        Cores, tipografia, espaçamento (espelho dos tokens CSS)
│       ├── ThemeProvider.tsx  Escolhe escuro/claro/sistema e entrega o tema às telas
│       └── index.ts         Ponto único de importação do tema
│
├── assets/
│   ├── fonts/               Arquivos .ttf embarcados no app + licenças OFL
│   └── images/              Ícone e splash (ainda os do template)
│
├── scripts/fonts/           Script Python que gera as variações da fonte Fraunces
│
└── docs/                    Design, referências visuais, prompt inicial e este arquivo
```

Pastas que aparecem na máquina mas não vão para o git: `node_modules/` (dependências), `android/` (projeto nativo gerado), `.expo/` (cache).

## 5. O que acontece quando o app abre

```
Android abre o APK
   │
   ▼
Tela de splash (cor de fundo #0C2630, definida no app.json)
   │
   ▼
Runtime carrega o JavaScript (do Metro em desenvolvimento)
   │
   ▼
src/app/_layout.tsx  ── raiz
   │  1. ThemeProvider: decide o esquema de cores (padrão: escuro)
   │  2. Pinta o fundo da janela nativa com a cor do tema
   │  3. Ajusta a cor dos ícones da barra de status
   │  4. Entrega as cores do tema à navegação
   ▼
src/app/(tabs)/_layout.tsx  ── barra de abas
   │  Declara as 4 abas, com ícone e rótulo
   ▼
src/app/(tabs)/index.tsx  ── aba Mapa (primeira tela)
```

As fontes não aparecem nesse fluxo porque não são carregadas em tempo de execução: já estão dentro do APK (seção 8).

## 6. Navegação

O Expo Router usa **rotas por arquivo**: a estrutura de pastas em `src/app/` é o mapa de telas, sem tabela de rotas separada.

| Arquivo | Papel |
| --- | --- |
| `_layout.tsx` | Define o "contêiner" das telas daquela pasta (pilha, abas). |
| `(tabs)/` | Pasta entre parênteses agrupa telas sem aparecer no endereço. |
| `index.tsx` | Tela padrão da pasta. |

As quatro abas estão declaradas numa lista em [`src/app/(tabs)/_layout.tsx`](<../src/app/(tabs)/_layout.tsx>):

| Aba | Arquivo | Ícone | Conteúdo hoje |
| --- | --- | --- | --- |
| Mapa | `index.tsx` | mapa | Placeholder + amostra das fontes |
| Viagens | `viagens.tsx` | avião | Placeholder |
| Conquistas | `conquistas.tsx` | troféu | Placeholder |
| Perfil | `perfil.tsx` | pessoa | Placeholder |

A aba ativa usa a cor `action` (azul). Isso segue a regra do design: navegar é ação, e a cor `achievement` (verde) fica reservada para conquistas.

## 7. Tema: cores, tipografia e espaçamento

O design define **tokens**: nomes para cada cor, tamanho de texto e medida. Eles nasceram em CSS (`docs/referencias/tokens/`) e foram traduzidos para TypeScript em [`src/theme/tokens.ts`](../src/theme/tokens.ts), com os mesmos nomes em camelCase (`--surface-raised` virou `surfaceRaised`). Isso facilita comparar os dois lados.

Nenhuma tela escreve uma cor ou um tamanho direto. Todas pedem ao tema:

```tsx
const { colors, typography, space } = useTheme();
<Text style={[typography.heading, { color: colors.textPrimary }]}>Viagens</Text>;
```

O que o tema entrega:

| Grupo | Conteúdo | Exemplo |
| --- | --- | --- |
| `colors` | 23 cores, em duas versões (escuro e claro) | `bg`, `surface`, `action`, `achievement`, `fog` |
| `typography` | 10 estilos de texto (fonte + tamanho + altura de linha) | `displayXl`, `place`, `heading`, `body` |
| `numbers` | 2 estilos para números | `numHero`, `numList` |
| `space` | Escala de espaçamento em grade de 4 | `space[4]` = 16 |
| `layout` | Medidas fixas | `touchMin` = 48 |
| `radius` | Arredondamentos | `card` = 12 |

**Modos de tema.** O [`ThemeProvider`](../src/theme/ThemeProvider.tsx) aceita três modos: `dark`, `light` e `system` (segue o aparelho). O padrão é `dark`, mesmo que o aparelho esteja no claro. Hoje não há tela para trocar o modo e a escolha não é salva; isso chega com o Perfil, na Fase 5.

**Regras de uso.** Os arquivos de tokens trazem 14 regras obrigatórias (por exemplo: verde só em conquista, Fraunces nunca abaixo de 20px, nunca animar contagem de número). Elas estão resumidas no [`CLAUDE.md`](../CLAUDE.md) e nos comentários do `tokens.ts`.

## 8. Fontes

Duas famílias, ambas com licença livre (OFL):

| Família | Uso | Pesos |
| --- | --- | --- |
| **Hanken Grotesk** | Toda a interface | 400, 500, 600 |
| **Fraunces** | Só números, nomes de lugar e títulos de conquista | 600, 700 |

**Como chegam ao app.** Os arquivos `.ttf` em `assets/fonts/` são embarcados no APK durante o build, pelo plugin `expo-font` declarado no `app.json`. Não há download nem carregamento ao abrir o app. O arquivo de ícones (Ionicons) entra pelo mesmo caminho.

**Por que a Fraunces tem um script.** A Fraunces original é uma fonte variável: um único arquivo com "eixos" ajustáveis. O design pede dois ajustes (SOFT 45 e WONK 1, que dão o aspecto macio e levemente torto das letras). O React Native não aplica esses eixos de forma confiável, então o script [`scripts/fonts/instanciar_fraunces.py`](../scripts/fonts/instanciar_fraunces.py) gera arquivos estáticos já com os ajustes aplicados:

| Arquivo gerado | Peso | Eixos fixados |
| --- | --- | --- |
| `Fraunces-SemiBold.ttf` | 600 | SOFT 45, WONK 1, opsz 24 |
| `Fraunces-Bold.ttf` | 700 | SOFT 45, WONK 1, opsz 36 |

Os arquivos gerados estão no git. O script só precisa rodar de novo se o design mudar os eixos.

**Detalhe do Android.** No Android, cada peso de fonte é tratado como uma família separada, identificada pelo nome do arquivo. Por isso o tema escolhe o peso pelo nome (`HankenGrotesk-SemiBold`) e não por um atributo de peso.

## 9. Configuração do app e segredos

**`app.json`** é a fonte de verdade da configuração nativa. Os plugins declarados nele:

| Plugin | O que faz |
| --- | --- |
| `expo-router` | Ativa a navegação por arquivos. |
| `expo-build-properties` | Fixa o CMake 4.1.2 no build Android (seção 14). |
| `expo-font` | Embarca os arquivos de fonte no APK. |
| `expo-splash-screen` | Define a tela de abertura. |

**Variáveis de ambiente.** Nenhuma é usada na Fase 0. O [`.env.example`](../.env.example) já lista as que virão:

| Variável | Fase | Tipo |
| --- | --- | --- |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | 1 | Pública (vai dentro do app) |
| `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` | 1 | Secreta (só no build, se necessário) |
| `EXPO_PUBLIC_SUPABASE_URL` | 2 | Pública |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 2 | Pública |

Tudo que começa com `EXPO_PUBLIC_` é embutido no bundle e pode ser lido por quem abrir o APK. Isso é esperado para esses valores; a proteção real dos dados virá das regras de acesso no banco (RLS), na Fase 2. O arquivo `.env` está no `.gitignore`.

## 10. Build e execução

### Pré-requisitos da máquina (Windows)

| Item | Detalhe |
| --- | --- |
| Node.js | Instalado em `C:\Program Files\nodejs` |
| JDK 17 | `JAVA_HOME` apontando para ele |
| Android SDK + emulador | `ANDROID_HOME` apontando para o SDK |
| CMake 4.1.2 | Instalado pelo SDK Manager do Android Studio |
| Caminhos longos | `LongPathsEnabled = 1` no registro do Windows |
| Local do projeto | Caminho curto e sem espaços: `C:\dev\planejador_viagens` |
| Python 3 | Só para regenerar a Fraunces |

No PowerShell, use `npx.cmd` e `npm.cmd`: a política de execução bloqueia os scripts `.ps1` equivalentes.

### Comandos

| Objetivo | Comando | Quando usar |
| --- | --- | --- |
| Instalar dependências | `npm.cmd install` | Depois de clonar ou mudar o `package.json` |
| Compilar e instalar o app | `npx.cmd expo run:android` | Primeira vez e quando a metade nativa mudar |
| Subir o Metro | `npx.cmd expo start --dev-client` | Todo dia, com o app já instalado |
| Build de release | `npx.cmd expo run:android --variant release` | Para medir desempenho real |
| Verificações | `npm.cmd run typecheck`, `lint`, `format:check` | Antes de cada commit |

### Fluxo do build

```
app.json + plugins ──prebuild──▶ android/ (gerado)
                                     │
node_modules (código nativo) ────────┤
                                     ▼
                         Gradle + CMake/ninja (C++)
                                     │
                                     ▼
                           app-debug.apk ──adb──▶ emulador
```

O primeiro build leva de 15 a 25 minutos (baixa o Gradle e compila todo o C++). Os seguintes usam cache e levam poucos minutos.

## 11. Qualidade de código

| Ferramenta | Função | Comando |
| --- | --- | --- |
| TypeScript estrito | Pega erros de tipo antes de rodar | `npm run typecheck` |
| ESLint | Aponta padrões problemáticos | `npm run lint` |
| Prettier | Formata o código de forma automática e uniforme | `npm run format` |
| `.gitattributes` | Mantém fim de linha LF, evitando diffs falsos no Windows | automático |

O que **não** existe ainda:

- **Testes automatizados.** Entram na Fase 1, junto com a primeira lógica pura (projeção de coordenadas).
- **CI.** Nenhum pipeline roda essas verificações no GitHub. Hoje elas são manuais.

## 12. Dependências e o porquê de cada uma

### Do app

| Pacote | Para que serve |
| --- | --- |
| `expo` | O framework: ferramentas de build e módulos básicos. |
| `react`, `react-native` | A base da interface. |
| `expo-router` | Navegação por arquivos. |
| `expo-dev-client` | Transforma o APK num development build. |
| `expo-font` | Embarca as fontes. |
| `expo-build-properties` | Fixa a versão do CMake sem editar `android/`. |
| `expo-splash-screen` | Tela de abertura. |
| `expo-status-bar` | Cor dos ícones da barra de status. |
| `expo-system-ui` | Cor de fundo da janela nativa. |
| `expo-constants`, `expo-linking` | Exigidas pelo Expo Router. |
| `@expo/vector-icons` | Ícones das abas (só o conjunto Ionicons vai no APK). |
| `react-native-screens`, `react-native-safe-area-context` | Base nativa da navegação e das margens seguras da tela. |
| `react-native-gesture-handler` | Gestos. Vem do template; será usado em arrastar e na pílula de check-in. |
| `react-native-reanimated`, `react-native-worklets` | Animações fora da thread principal. Vêm do template; serão a base da névoa. |
| `react-dom` | Exigida pelo Expo Router como dependência par. Não é usada pelo app. |

### De desenvolvimento

| Pacote | Para que serve |
| --- | --- |
| `typescript`, `@types/react` | Checagem de tipos. |
| `eslint`, `eslint-config-expo` | Lint com as regras da Expo. |
| `prettier`, `eslint-config-prettier` | Formatação, sem conflito com o lint. |

## 13. Decisões tomadas

| Decisão | Motivo |
| --- | --- |
| Código em `src/`, rotas em `src/app/` | Padrão do template atual da Expo; separa rotas do resto. |
| Suporte a web removido do template | Fora do escopo da v1. |
| Tema próprio em vez de biblioteca de UI | Os tokens já definem tudo; uma biblioteca traria estilos que brigam com o design. |
| Escuro como padrão, independente do sistema | Definido no `design.md`. |
| Fontes embarcadas no build | Texto aparece certo desde o primeiro quadro, sem carregar nada ao abrir. |
| Fraunces em instâncias estáticas | O React Native não aplica os eixos variáveis. |
| Eixo `opsz` da Fraunces: 24 no peso 600, 36 no 700 | Valores próximos dos tamanhos em que cada peso aparece. |
| Abas com ícone + rótulo | Com quatro abas, o ícone ajuda a achar; os wireframes mostravam só texto. |
| Rótulo das abas em 13px | A regra de tipografia só permite 11px em rótulo maiúsculo. |
| Build local, não na nuvem | Ciclo mais rápido para a Fase 1, que recompila várias vezes. |
| Uma branch por fase, com PR para `main` | Revisão antes de cada fase entrar. |

## 14. Problemas encontrados no caminho

**Build falhava com "Filename longer than 260 characters".** O código C++ de uma biblioteca de navegação gera arquivos intermediários com caminho acima do limite padrão do Windows. Mover o projeto para uma pasta curta não bastou. A correção teve três partes: ativar caminhos longos no Windows, instalar o CMake 4.1.2 (que traz uma versão do `ninja` compatível com caminhos longos) e fixar essa versão no `app.json`. O projeto também saiu de uma pasta com espaços no nome para `C:\dev\planejador_viagens`.

**`npx` bloqueado no PowerShell.** A política de execução impede scripts `.ps1`. Contorno: usar `npx.cmd` e `npm.cmd`, sem mudar configuração de segurança.

**Conflito de versão do `react-dom`.** O Expo Router exige `react-dom` como dependência par, e o npm escolhia uma versão diferente da do React. Contorno: fixar a mesma versão do React no `package.json`.

## 15. O que ainda não existe

| Item | Fase |
| --- | --- |
| Mapa e névoa | 1 |
| Testes automatizados | 1 |
| Login, banco de dados, armazenamento de fotos | 2 |
| Viagens, dias e lugares | 3 |
| Localização e check-in | 4 |
| Conquistas, onboarding, Perfil, troca e persistência de tema | 5 |
| Ícone e splash definitivos (hoje são os do template) | a definir |
| CI no GitHub | a definir |
| Build para iPhone | depois, via EAS Build |
| Política de privacidade (rascunho) | a definir |

## 16. Glossário

| Termo | Significado |
| --- | --- |
| **APK** | O pacote instalável do Android. |
| **Bundle** | O JavaScript do app empacotado num arquivo. |
| **CMake / ninja** | Ferramentas que compilam a parte em C++ das bibliotecas. |
| **Componente** | Um bloco de interface reutilizável (uma função que devolve tela). |
| **Config plugin** | Extensão que altera o projeto nativo durante o prebuild. |
| **Development build** | APK de desenvolvimento que busca o JavaScript no Metro. |
| **Expo** | Framework e conjunto de ferramentas sobre o React Native. |
| **Gradle** | Sistema de build do Android. |
| **Hook** | Função do React que dá a um componente acesso a algo (por exemplo, `useTheme`). |
| **Layout** | Arquivo `_layout.tsx` que define como as telas de uma pasta se organizam. |
| **Metro** | Servidor de desenvolvimento que entrega o JavaScript ao app. |
| **Módulo nativo** | Biblioteca com código Kotlin/C++, que exige recompilar o app. |
| **Prebuild** | Geração da pasta `android/` a partir do `app.json`. |
| **Provider** | Componente que disponibiliza um valor (como o tema) para todas as telas abaixo dele. |
| **Token** | Nome dado a um valor de design (uma cor, um tamanho). |
