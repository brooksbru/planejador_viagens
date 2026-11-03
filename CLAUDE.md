# Planejador de viagens (nome provisório)

App de viagem gamificado. O coração é um mapa-múndi pessoal coberto por uma névoa de nuvens que se abre conforme a pessoa faz check-in nos lugares visitados. O mapa persiste entre viagens: é o "mapa da sua vida".

Loop do MVP: login com Google → onboarding de 2 perguntas → criar viagem (destino + datas, dias automáticos) → adicionar lugares aos dias (pinos trancados) → chegar perto e fazer check-in (foto e nota opcionais) → pino destrava, névoa abre, foto vira o ícone do pino → percentual e conquistas atualizam.

Fundador solo: **disciplina de escopo é regra**. Responder sempre em português. O fundador é SRE/DevOps experiente e novo em mobile: explicar decisões de mobile quando forem relevantes.

Instruções completas e fases: `docs/prompt-inicial.md`. Fonte de verdade visual: `docs/design.md` + `docs/referencias/`. Regras gerais do Expo para agentes: @AGENTS.md

## Stack

- Expo SDK 58, React Native 0.88, TypeScript estrito, Expo Router (rotas em `src/app/`)
- Development build (`expo-dev-client`), não Expo Go: o mapa usa módulo nativo
- Mapa: Mapbox via `@rnmapbox/maps`, isolado em `src/features/map/` (MapLibre é a rota de fuga de custo)
- Névoa: overlay `@shopify/react-native-skia` com shader (ruído fractal + metaball), em `src/features/fog/`
- Backend (Fase 2+): Supabase (Postgres + PostGIS, Auth Google, Storage privado)
- Busca de lugares: só nome + coordenada (Mapbox Search). Nada de fotos/avaliações/horários do Google
- Ambiente: Windows 11, emulador Android. iPhone depois via EAS Build

## Estrutura

```
src/app/            rotas (Expo Router). (tabs)/ = Mapa, Viagens, Conquistas, Perfil
src/theme/          tokens.ts (cores, tipografia, espaço) + ThemeProvider/useTheme
src/components/     componentes compartilhados
src/features/<x>/   código por funcionalidade (map, fog, ...)
src/lib/            lógica pura, com testes (geo, raios, percentuais, conquistas)
assets/fonts/       TTFs embarcados pelo plugin do expo-font
scripts/fonts/      gera as instâncias estáticas da Fraunces
docs/               design, referências, prompt inicial. Não mover nem apagar
```

## Design: resumo do docs/design.md

- Wireframes são cinza de propósito: definem estrutura e comportamento, não cor. Toda cor, fonte e medida sai dos tokens (`src/theme/tokens.ts`, espelho de `docs/referencias/tokens/`)
- O momento mais importante é o destrave (névoa abrindo, pino virando foto). Nada pode competir com ele: sem confete, sem contador animado
- Tom dos textos leve e sem culpa ("3 ficaram para a próxima", não "3 não visitados")
- Tema escuro é o padrão; claro e "Sistema" no Perfil
- Tab bar com 4 abas: Mapa, Viagens, Conquistas, Perfil
- Dois raios configuráveis: aproximação (400 m, mostra a pílula) e check-in (100 m, libera o botão)
- Conquistas na v1 só por contador (lugares, cidades, países). % de cidade/viagem = destravados / planejados. % do mundo = países com check-in / 195
- **Em aberto:** estados do pino (planejado/trancado/desbloqueado vs. só trancado/destravado). Perguntar antes de implementar pinos

### Regras obrigatórias dos tokens

Cores:

1. `achievement` só em check-in feito, % desbloqueado e conquista. Nunca em botão comum
2. `action` é ação, `achievement` é conquista. Nunca inverter
3. Todo pino tem anel de 2px na cor `surface`
4. Estados do pino mudam de ícone, não só de cor
5. `terrain*` só no estilo do mapa (versões lavadas), nunca na interface
6. No tema claro, não intensificar `action`/`achievement`
7. No tema claro, `fogOutline` é obrigatório na névoa

Tipografia:

1. Fraunces só em número, nome de lugar e título de conquista
2. Nada de Fraunces abaixo de 20px
3. Nenhum texto abaixo de 11px; 11px só em rótulo curto maiúsculo; corpo nunca abaixo de 15px
4. Alvo de toque mínimo 48x48 (`layout.touchMin`)
5. Só os pesos 400/500/600 (Hanken) e 600/700 (Fraunces)
6. Toda medida na grade de 4
7. Nunca animar a contagem de números

Números: `numbers.numHero` (Fraunces, container com largura mínima) para número isolado; `numbers.numList` (Hanken, `tabular-nums`) para número em coluna.

## Fora do escopo da v1 (não implementar)

GPS em segundo plano ou névoa por movimento, notificações de proximidade, tempo de deslocamento e otimização de percurso, conquistas temáticas, sugestão dos lugares que "ficaram para a próxima", importação de reservas, voos e bagagem, IA, mascote, orçamento, PDF, desktop/offline/web, social e compartilhamento, compras e assinaturas.

## Privacidade (LGPD)

Foto + localização são dado pessoal: RLS em todas as tabelas, fotos em bucket privado sem EXIF de localização, nunca salvar a localização bruta (só "check-in no lugar X em tal hora"), exclusão de conta apaga tudo de verdade. Localização só em primeiro plano.

## Convenções

- Trabalhar uma fase por vez; no fim de cada fase parar, mostrar o que foi feito e como testar, e esperar o ok
- Uma branch por fase (`fase-N-...`) com PR para `main` no fim
- Commits pequenos, mensagem em português no formato `tipo(escopo): resumo`
- Não adicionar dependência sem explicar o porquê. Instalar com `npx expo install`
- Testes automatizados para lógica pura (projeção, distância/raios, percentuais, conquistas). Telas sem teste automatizado por enquanto
- Tokens/segredos só em `.env` (fora do git); `.env.example` documenta as variáveis
- Nunca editar `android/`/`ios/` à mão: são gerados (prebuild). Configuração nativa via `app.json` e config plugins
- Fontes: no Android cada peso é uma família (nome do arquivo); use `typography.*`/`fonts.*`, nunca `fontWeight`
- Antes de dar algo por pronto: `npm run typecheck`, `npm run lint`, `npm run format:check`

## Comandos

```bash
npm install
python -m pip install -r scripts/fonts/requirements.txt && python scripts/fonts/instanciar_fraunces.py  # gera a Fraunces (só se mudar)
npm run android           # compila e instala o development build no emulador
npm start                 # Metro para o development build já instalado
npm run android:release   # build release (para medir desempenho)
npm run typecheck && npm run lint && npm run format:check
```
