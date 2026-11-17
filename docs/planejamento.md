# Planejamento da v1: próximas etapas

Escrito em 16/11/2026 a partir do board do Miro (os 7 documentos e os wireframes), do `main`, do PR #2 e dos arquivos em `docs/`. É o roteiro das sessões de desenvolvimento das próximas semanas, inclusive as feitas com modelos mais baratos.

Quando dois documentos discordarem, vale esta ordem:

1. Resposta de Bruna na conversa
2. `docs/design.md`
3. Este arquivo (ordem de trabalho, riscos, decisões pendentes)
4. `docs/prompt-inicial.md` (fases e regras de trabalho)
5. Board do Miro (contexto e histórico)

Os arquivos `docs/fase-N.md` descrevem o que foi construído. Eles não definem o que construir.

## 1. Instruções para o modelo que vai executar

1. Leia nesta ordem: `CLAUDE.md`, as seções 2 e 4 deste arquivo, a seção da fase atual, `docs/design.md` e o `docs/fase-N.md` da fase anterior.
2. Antes de escrever código de uma fase, devolva o plano da fase e faça as perguntas da seção 4 que bloqueiam aquela fase. Espere a resposta.
3. Uma tarefa por vez, na ordem em que aparecem. Cada uma tem um "pronto quando". Só marque `[x]` depois de conferir o resultado no emulador ou nos testes.
4. Pare e pergunte quando: a tarefa depende de uma decisão pendente, precisa de dependência nova, precisa de credencial, o design conflita com o que foi pedido, ou a mesma abordagem falhou duas vezes.
5. Nunca decida sozinho um item da seção 4. A coluna "enquanto não decidir" diz o que fazer até a resposta chegar.
6. Não escreva API de Expo, Supabase, Mapbox ou Skia de memória. Abra a documentação da versão instalada (regra do `AGENTS.md`). O projeto usa Expo SDK 58 e React Native 0.88, e a Expo muda API a cada versão.
7. Não altere sem pedido explícito: `src/features/fog/fogShader.ts`, as constantes de calibração em `FogOverlay.tsx` (`PIPELINE_MS` e vizinhas), `src/theme/tokens.ts` e nada em `docs/referencias/`. Foram ajustados à mão, olhando a tela.
8. Antes de dar algo por pronto: `npm.cmd run typecheck`, `lint`, `format:check` e `npm.cmd test`. Se a tarefa mexe em tela, abra no emulador e olhe.
9. Fim de fase: escreva `docs/fase-N.md` no formato dos anteriores, abra o PR, diga como testar e pare.
10. Mantenha este arquivo vivo: marque as tarefas feitas e, quando uma decisão for respondida, registre a resposta na seção 4 e leve para o `design.md`.

Cada tarefa traz um nível:

- **[rotina]** A especificação está completa. Qualquer modelo executa.
- **[cuidado]** Exige ler documentação atual e testar no emulador. Erro aqui custa retrabalho.
- **[revisão]** Antes do merge, peça a revisão do diff a um modelo mais forte ou a Bruna. São os pontos em que um erro vaza dado, apaga dado ou quebra o momento do destrave.

## 2. Onde o projeto está

| Fase | Estado em 16/11/2026 |
| --- | --- |
| 0, setup | Concluída. PR #1 no `main` desde 15/11. |
| 1, mapa e névoa | Implementada na branch `fase-1-mapa-nevoa`. PR #2 aberto, sem revisão. Critérios da fase cumpridos no emulador. |
| 2, Supabase | Não começou. |
| 3, viagens e lugares | Não começou. |
| 4, proximidade e check-in | Não começou. |
| 5, gamificação e conta | Não começou. |

O que existe no código da branch da Fase 1:

- Tema em TypeScript espelhando os tokens, fontes embarcadas (Hanken Grotesk e Fraunces com SOFT 45 e WONK 1), tab bar com as 4 abas. Viagens, Conquistas e Perfil são placeholders.
- Mapa Mapbox isolado em `src/features/map/`, com contrato próprio (`types.ts`). Mercator plano, sem rotação nem inclinação. Estilos padrão do Mapbox (`dark-v11` e `light-v11`).
- Névoa em `src/features/fog/`: overlay Skia com shader, duas camadas (véu fino e cúmulo denso), só sobre a terra (máscara embarcada), buracos permanentes com fusão tipo metaball, toque que afasta o cúmulo e previsão de pan.
- Lógica pura com testes em `src/lib/geo/` (projeção, metros por pixel, distância, "dentro do raio") e `fogMath.ts`. São 28 testes.
- A aba Mapa ainda tem controles de teste: contador de fps, três chips e o botão de abrir buraco. Os buracos vivem em memória.

Conferido hoje na cópia `C:\dev\planejador_viagens`: os 28 testes passam, e typecheck, lint e format:check também.

O que a Fase 1 deixou sem verificar, segundo o próprio PR: zoom com dois dedos, parada brusca do arrasto, tema claro com a máscara de terra, e tudo em celular real (fps e a calibração `PIPELINE_MS`).

O que não existe em lugar nenhum: backend, login, qualquer tela além do mapa, pinos, CI, ícone e splash definitivos, política de privacidade, build de iPhone.

Sobre as pastas: o trabalho acontece em `C:\dev\planejador_viagens` (caminho curto, exigido pelo build no Windows). A cópia em `Documents\Arquivos\Planejador de viagens\planejador_viagens` parou no commit de 03/11 e não serve para desenvolver. A pasta `design\` ao lado dela tem os mesmos tokens que já estão em `docs/referencias/tokens/`.

## 3. O que o Miro diz e o repositório não diz

O `design.md` avisa que ele vence o board. Mesmo assim, o documento "MVP, Escopo v1" do Miro lista como **decisões fechadas** alguns pontos que não chegaram ao `design.md` nem ao prompt inicial, e dois deles contradizem o que está no repositório. Nenhum modelo deve escolher um lado: cada linha aponta para a decisão correspondente na seção 4.

| Tema | No Miro | No repositório | Decisão |
| --- | --- | --- | --- |
| Check-in fora do raio | "É registrado, não bloqueado", com a distância gravada para tratar fraude depois | Botão desabilitado fora dos 100 m; não salvar localização bruta | D2 |
| Horários do lugar | Horário de chegada e de saída | "Horário opcional" e "nota ou limite". O wireframe 07 mostra `11:00` e "até 12:00" | D3 |
| Reordenar lugares | Arrasto dentro do dia e entre dias | Só "arrastar pra reordenar" | D4 |
| Foto depois do check-in | "Pode ser adicionada depois pelo pino" | Não aparece. O toque no pino não está especificado | D5 |
| Chip do mapa | Reflete o zoom ("Mundo · 4%" longe, "Lisboa · 34%" perto) e leva a Conquistas | Só aparece na recompensa, com a cidade | D6 |
| Mapa com duas portas | Pela aba abre no local atual; pelo planejamento abre no destino da viagem | Não aparece. Hoje abre sempre no Brasil | Tarefa F3.10 |
| Contador por dia | Cabeçalho de cada dia mostra quantos lugares foram destravados | Não está no texto, mas o wireframe 07 mostra "1 de 3" | Tarefa F3.5 |
| Medir a validação | Três perguntas de validação e métricas com analytics | Nenhuma fase cobre | D9 |
| Pesquisas | "Como conheceu o app" depois do primeiro check-in; pesquisa de 7 dias | Nenhuma fase cobre | D10 |
| Alerta de gasto do Mapbox | "Configurar desde o dia um", porque não há teto de gasto | Não aparece | Tarefa A4 |
| Percentual por país | "% desbloqueado por cidade/país" | Só cidade, viagem e mundo | Fica fora da v1, salvo pedido |

Dois pontos do Miro que já estão resolvidos e não precisam de pergunta: login só com Google (Facebook e Apple ficam para depois) e nada de adicionar lugares visitados antes do app (decisão registrada em SCRUM-79).

A análise de concorrência muda a prioridade do trabalho em três coisas:

- O diferencial é o plano virar quadro de missões (pino trancado que destrava ao chegar). A névoa é estilo visual. Daqui em diante, hora gasta polindo névoa sai da conta das Fases 3 e 4, que são onde o diferencial aparece.
- Tempo até o beta é fator competitivo. A combinação é copiável por quem já tem base de usuários.
- A pergunta de validação é "depois de ver isso, você abriria o app para planejar a próxima viagem?". Ela entra no roteiro do beta (Fase 6).

## 4. Decisões pendentes

### De produto (quem decide: Bruna)

| ID | Pergunta | Recomendação | Bloqueia | Enquanto não decidir |
| --- | --- | --- | --- | --- |
| D1 | Estados do pino: três (planejado, trancado, desbloqueado) ou dois (trancado, destravado)? | Dois, com o destravado em duas aparências (check ou foto). O doc de MVP diz que lugar planejado já aparece trancado, então "planejado" e "trancado" são o mesmo estado. | F3.9 | Não implementar pinos. |
| D2 | GPS ruim ou fora do raio: bloquear, ou registrar com a distância? | Manter os dois raios e o botão desabilitado. Se a precisão do GPS vier pior que um limite (a definir, sugestão 50 m) e a pessoa estiver dentro do raio de aproximação, oferecer "fazer check-in mesmo assim" e gravar `distancia_m` e `precisao_m`, sem coordenada. | F2.2, F4 | Seguir o `design.md`. Criar as duas colunas como opcionais. |
| D3 | Lugar tem horário de chegada e de saída, ou um horário só? | Dois campos opcionais (chegada e saída) mais a nota. É o que o wireframe 07 mostra. | F2.2, F3 | Criar os dois campos no banco. |
| D4 | Arrastar lugar entre dias entra na v1? | Arrasto só dentro do dia. Para trocar de dia, ação "Mover para outro dia" no item. Arrastar entre abas custa caro e não muda a validação. | F3.7 | Implementar só dentro do dia. |
| D5 | O que abre ao tocar num pino? Dá para adicionar ou trocar a foto depois? | Folha curta com nome, viagem e dia. Trancado: distância, se houver GPS. Destravado: foto, nota, data e "adicionar ou trocar foto". | F3.9, F4 | Pino sem ação de toque. |
| D6 | O chip do mapa muda com o zoom, como no Miro? Qual cidade mostrar com várias na tela? | Sim. Acima de um zoom de corte (ajustar na tela, começar em 9), mostra a cidade do lugar planejado mais próximo do centro. Abaixo, "Mundo". Sem nenhum lugar por perto, "Mundo". | F5.4 | Chip só com a cidade, na recompensa. |
| D7 | Quais conquistas por contador existem e como se chamam? | Bruna escreve os nomes (o tom faz parte da marca). Ponto de partida: lugares 1, 5, 10, 25, 50; cidades 1, 3, 5, 10; países 1, 3, 5, 10. | F5.1 | Regras prontas e testadas, com nomes provisórios marcados. |
| D8 | Qual é a décima opção do onboarding 1 (cortada na imagem)? O subtítulo promete "conquistas personalizadas para o seu estilo", e a v1 só tem contador: o texto fica? | Trocar a promessa por algo verdadeiro na v1, por exemplo "assim a gente conhece o seu jeito de viajar". Guardar as respostas para as conquistas por perfil, depois. | F5.5 | Não implementar a tela. |
| D9 | Como medir se o MVP validou? | Consultas SQL no Supabase (pessoas com viagem criada, com 1 check-in, com check-ins em dias diferentes). Sem SDK de analytics na v1: menos dependência e menos dado pessoal. | F6 | Garantir `created_at` em todas as tabelas. |
| D10 | "Como conheceu o app" e a pesquisa de 7 dias entram no código da v1? | Não. Com beta pequeno, um formulário enviado à mão resolve. | F6 | Não implementar. |
| D11 | Nome definitivo do app e identificador `com.brooksbru.planejadorviagens`. | Decidir antes do primeiro envio à Play Store. Depois de publicado, o package não muda nunca. O cliente OAuth do Google também fica preso a ele. | F6 (ideal: antes de F2.6) | Seguir com o provisório. |
| D12 | Onde ficam a política de privacidade e os termos (URL pública)? E a página de pedido de exclusão de conta? | GitHub Pages do próprio repositório ou um site simples. A tela de entrada e o Perfil apontam para essas URLs, e a loja exige. | F5.6, F6 | Links apontando para placeholders marcados. |
| D13 | Estilo próprio do mapa com as cores `terrain-*` lavadas: quem faz e quando? | Bruna monta no Mapbox Studio em paralelo à Fase 3. O código só troca a URL do estilo. | Nada | Estilos padrão. |
| D14 | Há um celular Android real para testar? | Sim, o quanto antes. Emulador usa a GPU do computador e não tem GPS de verdade. | A1, F4.10 | Registrar como não verificado. |
| D15 | Apagar uma viagem com lugares destravados fecha a névoa desses lugares? | Não fecha. O check-in guarda cópia do nome, da coordenada, da cidade e do país do lugar, e sobrevive à exclusão da viagem. O "mapa da vida" não pode encolher por faxina. | F2.2 | Modelar assim. É o caminho reversível. |
| D16 | Viagem futura aparece onde? O wireframe 04 só tem "Agora" e "Anteriores", e planejar de casa é o uso principal antes da viagem. | Seção "Próximas", entre as duas. | F3.3 | Implementar com "Próximas". |
| D17 | Check-in sem internet (roaming desligado é comum em viagem): o que acontece? | Mínimo para o loop não quebrar: guardar no aparelho os lugares da viagem em andamento e uma fila de check-ins que sincroniza quando a rede voltar. Offline completo continua fora do escopo. | F4.7 | Erro claro com "tentar de novo", sem perder foto e nota. |

### Técnicas (o modelo apresenta opções com prós e contras no plano da fase; Bruna aprova)

| ID | Questão | Ponto de partida |
| --- | --- | --- |
| T1 | Login com Google: nativo com ID token ou OAuth pelo navegador | A doc do Supabase recomenda o nativo quando possível: uma biblioteca nativa devolve o ID token e o app chama `signInWithIdToken`. Conferir na página atual qual biblioteca ela indica para Expo. |
| T2 | Busca de lugares: a Search Box API do Mapbox não permite guardar o resultado sem contrato | Ver o risco 5 da seção 6. Resolver antes de escrever a tela de busca. Bruna precisa aprovar a saída, porque mexe na stack decidida. |
| T3 | Mais de 32 buracos na tela | O shader recebe no máximo 32. Proposta: escolher os visíveis mais próximos do centro e agrupar vizinhos no zoom longe, em função pura com teste. |
| T4 | Lugar planejado em ilha ou no litoral, fora da máscara de terra | A máscara tem cerca de 20 km por ponto. Proposta do `fase-1.md`: forçar névoa em volta de todo lugar planejado. |
| T5 | Pinos e ponto azul ficam embaixo da névoa | Ver o risco 1 da seção 6. |
| T6 | Fonte da localização na Fase 4: o contrato do mapa (`onUserLocation`, que já entrega precisão) ou `expo-location` | Reusar o contrato do mapa evita dependência nova. Só trocar se faltar leitura sob demanda para o "tentar de novo". |
| T7 | Dados do servidor nas telas: hooks próprios ou biblioteca de cache | Começar com hooks próprios. Biblioteca só com justificativa. |
| T8 | Arrastar para reordenar, seletor de data, folha inferior | Cada um é dependência nova ou componente próprio. Testar no emulador antes de adotar: o projeto usa Reanimated 4 e a Nova Arquitetura, e biblioteca antiga quebra. |
| T9 | Monitoramento de erro no beta | Decidir na Fase 6. |

## 5. Etapas

Estimativas em dias de trabalho com assistente, supondo que Bruna testa e responde no mesmo dia. São chute informado, não compromisso.

### Etapa A: fechar a Fase 1 (1 a 2 dias)

Objetivo: PR #2 no `main`, com o que faltou verificar resolvido ou registrado.

- [ ] **A1** [rotina] Bruna testa à mão o que a automação não cobriu: zoom com dois dedos (a névoa acompanha?), parada brusca do arrasto (a névoa passa do ponto?), toque e buraco perto do litoral. Em celular real, se houver (D14). Pronto quando: resultado anotado no PR.
- [ ] **A2** [rotina] Tema claro: não existe tela para trocar o tema antes da Fase 5. Adicionar um chip de teste "Tema" junto dos outros controles do spike e conferir névoa, contorno (`fogOutline`) e máscara no claro. Pronto quando: captura de tela dos dois temas no PR.
- [ ] **A3** [cuidado] Corrigir o que A1 e A2 mostrarem. Se o problema for no shader ou na previsão de pan, descrever o sintoma e pedir revisão antes de mexer.
- [ ] **A4** [rotina] Bruna configura o alerta de gasto na conta do Mapbox. O plano não tem teto.
- [ ] **A5** [rotina] Merge do PR #2.

### Etapa B: preparação (1 dia)

Objetivo: rede de segurança para as próximas fases, que serão feitas com modelos mais baratos.

- [ ] **B1** [rotina] CI no GitHub Actions rodando typecheck, lint, format:check e testes em todo PR. Não precisa compilar o Android. Pronto quando: um PR de teste mostra os checks.
- [ ] **B2** [rotina] Este arquivo no `main`, e uma linha no `CLAUDE.md` apontando para ele e para a regra 5 da seção 1.
- [ ] **B3** [rotina] Levar para o `design.md` as decisões de produto que nasceram na Fase 1 e só estão no `fase-1.md`: duas camadas de névoa (toque espia, check-in revela), névoa só sobre a terra, abertura no Brasil, raio do buraco de 300 m com mínimo de 5 px na tela.
- [ ] **B4** [rotina] Bruna responde as decisões que bloqueiam as Fases 2 e 3: D1, D2, D3, D4, D5, D15, D16. Registrar as respostas no `design.md`.

### Fase 2: Supabase (5 a 7 dias)

Objetivo: login com Google funcionando, banco com RLS, e a névoa carregada dos check-ins salvos.

O que pedir a Bruna, com passo a passo, logo no plano da fase: projeto no Supabase (região de São Paulo), projeto no Google Cloud com os clientes OAuth, e os valores para o `.env`. A chave `service_role` nunca entra no app nem no `.env` do app.

- [ ] **F2.0** Plano da fase, com T1, T3 e o modelo de dados para aprovação.
- [ ] **F2.1** [cuidado] Supabase CLI no repositório: pasta `supabase/`, migrations versionadas, instrução de como aplicar. Pronto quando: um banco vazio chega ao esquema atual com um comando.
- [ ] **F2.2** [revisão] Primeira migration. Tabelas: perfil, preferências, viagens, dias, lugares, check-ins. Em todas: `user_id` com default `auth.uid()`, `created_at`, RLS ligado, políticas de select, insert, update e delete por `user_id`, e `on delete cascade` a partir do usuário. Pontos que não podem faltar:
  - Datas de viagem e de dia como `date`; horários de lugar como `time`. Nada de `timestamptz` para data de viagem: 10 de agosto em Lisboa não pode virar dia 9 no fuso do Brasil.
  - Lugar com nome, coordenada (PostGIS), cidade, código ISO do país, chegada, saída, nota, posição no dia e origem (busca ou manual).
  - Check-in com cópia de nome, coordenada, cidade e país (D15), instante, nota, caminho da foto e as colunas opcionais de D2. Nenhuma coluna com a posição da pessoa.
  - Um jeito de o app ler latitude e longitude sem decodificar binário do PostGIS (view, função ou colunas numéricas). Testar a leitura pelo cliente antes de fechar a tarefa.
- [ ] **F2.3** [revisão] Teste de RLS: script com dois usuários em que o segundo tenta ler, alterar e apagar dados do primeiro em cada tabela. Pronto quando: todas as tentativas falham e o script roda com um comando.
- [ ] **F2.4** [revisão] Bucket privado para as fotos, com caminho `{user_id}/...` e políticas no Storage. Entra no mesmo teste de dois usuários.
- [ ] **F2.5** [cuidado] Cliente do Supabase em `src/lib/`, com sessão persistida conforme a doc atual para Expo, e tipos gerados do banco.
- [ ] **F2.6** [cuidado] Login com Google (T1). Armadilha conhecida: o cliente OAuth Android é amarrado ao package e ao SHA-1 da chave que assinou o APK. Chave de debug, chave do EAS e chave da Play Store têm SHA-1 diferentes, e cada uma precisa estar cadastrada. Erro de configuração aqui aparece como falha genérica de login.
- [ ] **F2.7** [rotina] Tela de entrada conforme `01-entrada.png` e proteção das rotas: sem sessão, só a entrada. Ver na doc do Expo Router da SDK 58 o padrão atual para rotas protegidas.
- [ ] **F2.8** [rotina] Perfil criado no primeiro login.
- [ ] **F2.9** [cuidado] Névoa carregada do banco. Como viagens e lugares só chegam na Fase 3, criar um seed (uma viagem, lugares e alguns check-ins do usuário de teste). Pronto quando: fechar e reabrir o app mantém os buracos, e outro usuário não vê nenhum.
- [ ] **F2.10** [cuidado] Estratégia para mais de 32 buracos (T3), com teste e um seed de 100 check-ins para conferir no zoom longe.
- [ ] **F2.11** `docs/fase-2.md`, PR, parar.

### Fase 3: viagens e lugares (8 a 10 dias)

Objetivo: planejar uma viagem inteira e ver os lugares como pinos trancados no mapa. É aqui que o diferencial do produto aparece pela primeira vez.

Depende de: D1, D3, D4, D5, D16, T2, T4, T5, T7, T8.

- [ ] **F3.0** Plano da fase com as decisões técnicas.
- [ ] **F3.1** [cuidado] Resolver T2 antes de qualquer tela de busca. A busca fica atrás de um contrato próprio (como o mapa), para o provedor ser trocável.
- [ ] **F3.2** [rotina] Lógica pura com testes em `src/lib/`: situação da viagem pela data (agora, próxima, anterior), dias gerados a partir das datas ("9 dias de viagem, vamos criar os dias 1 a 9"), contagens "x de y destravados" por viagem e por dia, e "ficaram para a próxima".
- [ ] **F3.3** [rotina] Lista de viagens (`04-viagens-lista.png`), com estado vazio para quem ainda não tem viagem.
- [ ] **F3.4** [rotina] Nova viagem (`06-nova-viagem.png`): destino por busca, datas, criação dos dias.
- [ ] **F3.5** [rotina] Detalhe da viagem (`07-viagem-detalhe.png`): cabeçalho com "3 de 8 destravados", abas por dia com adicionar, remover e renomear, contador do dia ("1 de 3"), lista com horário, nota e selo de trancado ou destravado. Sem tempo de deslocamento e sem "Otimizar percurso", que são fase 2 do produto.
- [ ] **F3.6** [rotina] Adicionar lugar (`08-adicionar-lugar.png`): busca e "Adicionar manualmente" (marcar o ponto no mapa e dar nome). O lugar manual também precisa de cidade e país, que alimentam contadores e o chip.
- [ ] **F3.7** [cuidado] Arrastar para reordenar dentro do dia (D4, T8).
- [ ] **F3.8** [cuidado] Névoa garantida em volta de todo lugar planejado (T4). Pronto quando: um lugar em Fernando de Noronha e um na orla de Copacabana aparecem cobertos.
- [ ] **F3.9** [revisão] Pinos no mapa (D1, D5, T5): anel de 2 px na cor `surface`, ícone diferente por estado, alvo de toque de 48 por 48, visíveis por cima da névoa e sem escorregar em relação a ela no arrasto.
- [ ] **F3.10** [rotina] Mapa com duas portas: pela aba, abre no local atual. Pelo planejamento, abre no destino da viagem. O Miro não diz o que fazer sem permissão ou sem GPS; proposta a confirmar no plano da fase: destino da viagem em andamento e, sem viagem, o Brasil.
- [ ] **F3.11** `docs/fase-3.md`, PR, parar.

### Fase 4: proximidade e check-in (8 a 10 dias)

Objetivo: o loop completo. Chegar perto, a pílula aparece, check-in, a névoa abre e o pino vira foto.

Depende de: D2, D5, D14, D17, T6, T8.

- [ ] **F4.0** Plano da fase.
- [ ] **F4.1** [cuidado] Máquina de estados da pílula como lógica pura com testes: longe, aproximando (400 m), liberado (100 m), dispensada. Incluir margem na saída do raio, senão o tremor do GPS na borda faz a pílula piscar. "Dispensada" só volta ao sair do raio e entrar de novo, ou ao chegar em outro lugar.
- [ ] **F4.2** [cuidado] Localização só em primeiro plano, só com a aba Mapa em foco. Parar de ouvir o GPS ao sair da aba ou minimizar o app. Hoje o mapa pede a permissão assim que abre: trocar por um pedido com explicação, no contexto. O app precisa funcionar com a permissão negada (planeja, mas não faz check-in).
- [ ] **F4.3** [rotina] Pílula nos quatro estados de `10-pilula-estados.png`, com dispensa por arrasto em qualquer direção. Entre os dois raios, botão desabilitado e texto amigável.
- [ ] **F4.4** [rotina] Folha de captura (`11-checkin-captura-recompensa.png`): foto opcional por câmera ou galeria, nota opcional, "Destravar este lugar", "Agora não".
- [ ] **F4.5** [revisão] Foto: comprimir antes do upload, remover EXIF, enviar ao bucket privado, gerar miniatura para o pino. Pronto quando: o arquivo baixado do bucket foi inspecionado e não tem metadado de localização.
- [ ] **F4.6** [cuidado] Precisão do GPS (D2): leitura imprecisa pede para tentar de novo, não recusa direto.
- [ ] **F4.7** [cuidado] Gravação do check-in e comportamento sem rede (D17).
- [ ] **F4.8** [revisão] Recompensa no mapa: a folha fecha, a névoa abre, o pino vira foto com os anéis pulsando (ou check, sem foto), o chip troca o valor sem animar a contagem. Nada de confete nem de `achievement` em botão.
- [ ] **F4.9** [rotina] Remover os controles de teste do spike da aba Mapa.
- [ ] **F4.10** [cuidado] Teste em celular real, andando na rua: calibração do `PIPELINE_MS`, comportamento do GPS, pílula. Simulação de posição no emulador serve para desenvolver, não para validar.
- [ ] **F4.11** `docs/fase-4.md`, PR, parar.

### Fase 5: gamificação e conta (6 a 8 dias)

Objetivo: percentuais, conquistas, onboarding e Perfil, com exclusão de conta que apaga tudo de verdade.

Depende de: D6, D7, D8, D12.

- [ ] **F5.0** Plano da fase.
- [ ] **F5.1** [rotina] Lógica pura com testes: percentual de viagem e de cidade (destravados sobre planejados), percentual do mundo (países com check-in sobre 195), contadores de lugares, cidades e países, regras das conquistas e data em que cada uma foi destravada (a data do check-in que cruzou a meta).
- [ ] **F5.2** [rotina] Tela de Conquistas (`12-conquistas.png`). As conquistas temáticas da imagem ("Sommelier de vinhos", "Rei das cachoeiras") são exemplo do futuro: na v1, só contador.
- [ ] **F5.3** [rotina] Card de conquista no mapa quando uma destrava.
- [ ] **F5.4** [cuidado] Chip do mapa (D6), que leva a Conquistas, e "Ver no mapa" no sentido contrário.
- [ ] **F5.5** [rotina] Onboarding em dois passos (`02` e `03`), depois do primeiro login, terminando em "Ver meu mapa".
- [ ] **F5.6** [rotina] Perfil (`13-perfil.png`): editar nome, preferências de viagem, tema com a escolha salva, links legais, sair.
- [ ] **F5.7** [revisão] Excluir conta: função no servidor que apaga as fotos do bucket e o usuário, com cascata no banco, e confirmação na tela. Pronto quando: depois de excluir, uma consulta com acesso de administrador não acha linha, arquivo nem usuário.
- [ ] **F5.8** [rotina] Rascunho da política de privacidade e dos termos em `docs/`, para Bruna revisar. Rascunho escrito por modelo não é parecer jurídico.
- [ ] **F5.9** `docs/fase-5.md`, PR, parar.

### Fase 6: beta fechado (5 dias de trabalho, mais a janela de teste da Play Store)

Esta fase não está no prompt inicial. Sem ela o MVP não chega a ninguém e não valida nada.

- [ ] **F6.1** Bruna abre a conta de desenvolvedor na Play Store e começa a recrutar testadores **já**, em paralelo às fases de código. Conta pessoal criada depois de novembro de 2023 só libera produção depois de um teste fechado com pelo menos 12 testadores inscritos por 14 dias seguidos ([regra do Google](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)). São duas semanas de calendário que nenhum código encurta. A contagem só começa com um build publicado no teste fechado, então vale subir o build do fim da Fase 4 e deixar os 14 dias correrem durante a Fase 5. Isso antecipa F6.2 e a decisão D11 para o fim da Fase 4.
- [ ] **F6.2** [cuidado] EAS Build para Android, assinatura, e o SHA-1 da chave de produção cadastrado no cliente OAuth do Google.
- [ ] **F6.3** [rotina] Nome (D11), ícone e splash definitivos.
- [ ] **F6.4** [rotina] URLs públicas da política, dos termos e do pedido de exclusão de conta (D12). Formulário de segurança de dados da loja.
- [ ] **F6.5** [rotina] Consultas de validação (D9): quem criou viagem, quem fez o primeiro check-in, quem voltou.
- [ ] **F6.6** [cuidado] Conferir o manifesto final do APK: só localização em primeiro plano, nenhuma permissão que o app não usa.
- [ ] **F6.7** [rotina] Roteiro do beta com a pergunta de validação da análise de concorrência.
- [ ] **F6.8** iPhone, quando for a hora: conta Apple Developer, build pelo EAS, permissão de localização (o código atual usa uma chamada só de Android), recalibrar a névoa. Conferir antes a regra atual da App Store para apps que só oferecem login social de terceiros: ela costuma exigir uma alternativa como o Sign in with Apple.

### Ordem e total

A e B primeiro, depois as fases em ordem, sem pular. F6.1 e D13 correm em paralelo desde já, porque não dependem de código. Somando as estimativas, são 34 a 43 dias de trabalho, ou 7 a 9 semanas. Os 14 dias da Play Store cabem dentro desse prazo se o teste fechado começar no fim da Fase 4 com os 12 testadores já recrutados.

Se o prazo apertar, a ordem de corte é: D17 reduzido a erro com "tentar de novo", chip por zoom (D6), tema claro polido, card de conquista no mapa. O que não se corta: RLS, exclusão de conta, remoção de EXIF, o momento do destrave.

## 6. Pontos de atenção

1. **Pinos e ponto azul ficam embaixo da névoa.** A névoa é uma camada desenhada por cima do mapa. Tudo que o Mapbox desenha (marcador, ponto azul da posição) fica escondido pelo cúmulo, e pino trancado mora justamente em área coberta. Os wireframes e a regra 3 das cores mostram o pino sobre a névoa. Caminho recomendado: desenhar os pinos na mesma camada Skia da névoa (ficam no mesmo quadro, sem escorregar um em relação ao outro) e tratar o toque pelo `onPress` do mapa com uma função pura de acerto (alvo de 48 px), com teste. O ponto azul precisa da mesma solução na Fase 4.
2. **Litoral e ilhas.** A máscara de terra tem cerca de 20 km por ponto. Boa parte dos destinos brasileiros é ilha ou orla (Florianópolis, Ilha Grande, Noronha, Copacabana). Se o lugar planejado ficar fora da máscara, o check-in não abre névoa nenhuma e o momento principal do produto falha em silêncio. É a tarefa F3.8, e precisa estar pronta antes da Fase 4.
3. **Limite de 32 buracos.** Passou disso, os excedentes somem. Com o mapa acumulando viagens, o limite chega rápido no zoom longe. Tarefa F2.10.
4. **Viagem sem internet.** O app de viagem é usado onde o roaming está desligado. Sem tratar isso, o check-in falha no momento em que mais importa. Decisão D17.
5. **Guardar resultado de busca do Mapbox.** A [doc do Mapbox](https://docs.mapbox.com/help/dive-deeper/understand-temporary-vs-permanent-geocoding/) separa geocodificação temporária da permanente: o padrão é temporário, e guardar o resultado exige `permanent=true` e cartão cadastrado. A [página da Search Box API](https://docs.mapbox.com/api/search/search-box/), que é a que devolve pontos de interesse, diz que os dados são "only available for temporary use" e manda falar com o comercial para guardar posição. Um resumo de terceiros diz ainda que a geocodificação permanente não devolve pontos de interesse (isso não confirmei na fonte). O app guarda nome e coordenada de lugares como "Castelo de São Jorge", então a stack decidida ("Mapbox Search, só nome e coordenada") esbarra nos termos como está. Resolver em F3.1, antes da tela de busca. Saídas a avaliar: a busca só leva o mapa até a região e a pessoa confirma o ponto (a coordenada e o nome passam a ser dela), a geocodificação permanente se ela cobrir o que o app precisa, ou outro provedor de busca atrás do mesmo contrato.
6. **Sincronia calibrada no emulador.** `PIPELINE_MS = -8` foi medido no emulador. Em celular real a névoa pode adiantar ou atrasar. O primeiro ajuste de desempenho, se precisar, é `renderScale`.
7. **Package e nome são para sempre** depois do primeiro envio à loja (D11).
8. **Chaves do login com Google.** Três SHA-1 diferentes ao longo do projeto (debug, EAS, Play). Ver F2.6.
9. **Datas e fuso.** Viagem acontece em outro fuso. Data de viagem é `date`, e "hoje" para decidir se a viagem está em andamento precisa de regra explícita e testada.
10. **Nomes de cidade.** Contador de cidades e chip dependem do nome da cidade vir sempre igual. Fixar o idioma da busca e, se a API der um identificador estável da cidade, guardar e contar por ele. "Lisboa" e "Lisbon" não podem virar duas cidades.
11. **Chave pública no app.** Tudo que começa com `EXPO_PUBLIC_` pode ser lido por quem abrir o APK. A proteção dos dados é o RLS, e por isso F2.3 é teste automatizado e não conferência visual.
12. **Supabase no plano gratuito.** Projetos sem uso costumam ser pausados depois de alguns dias. Conferir a regra atual antes do beta, para o app não cair no meio do teste.
13. **Ambiente Windows.** Build só funciona em `C:\dev\planejador_viagens`, com caminhos longos ativos e CMake 4.1.2. No PowerShell, `npm.cmd` e `npx.cmd`. Detalhes no `CLAUDE.md`.
14. **Bateria.** "Controle de uso da bateria" é must-have no Miro. Na prática: GPS desligado fora da aba Mapa e animação da névoa parada com o app em segundo plano.
15. **Escopo.** A lista de fora do escopo no `CLAUDE.md` continua valendo mesmo quando o item parecer fácil. As tentações mais prováveis nas próximas fases: sugerir lugares, conquistas temáticas (os wireframes mostram exemplos), tempo de deslocamento, e mais polimento na névoa.

## 7. Práticas

- Regra de negócio nasce como função pura em `src/lib/`, com teste, antes da tela que a usa. Vale para status de viagem, proximidade, percentuais e conquistas.
- Nada fora de `src/features/map/` importa o SDK do Mapbox. Recurso novo do mapa entra primeiro no contrato em `types.ts`. A busca de lugares segue a mesma ideia.
- Toda cor, fonte e medida vem de `useTheme()`. As 14 regras dos tokens estão no `CLAUDE.md`. As mais fáceis de quebrar sem perceber: `achievement` em botão comum, Fraunces abaixo de 20 px, número com contagem animada.
- Texto de interface no tom do `design.md`: leve, sem culpa. Texto novo que não está nos wireframes vai para Bruna aprovar.
- Toda mudança de banco é migration no repositório. Nada de alterar tabela pelo painel do Supabase.
- Tabela nova só entra com RLS, políticas e uma linha a mais no teste de dois usuários.
- Dependência nova: explicar o porquê, instalar com `npx.cmd expo install`, e conferir se funciona com a Nova Arquitetura antes de construir em cima dela.
- Biblioteca com código nativo exige recompilar o app (`npm.cmd run android`). Planejar para juntar essas mudanças no começo da fase.
- Desempenho se mede em build de release, nunca em debug.
- Commits pequenos no formato `tipo(escopo): resumo`. Uma branch por fase, PR no fim.
- No fim de cada tarefa, dizer o que foi verificado e como, e o que não foi.

## 8. O que este plano não verificou

- Os tickets do Jira citados no board (SCRUM-13, 14, 79, 91) não foram lidos.
- O app não foi aberto no emulador para este plano. Os números de desempenho da Fase 1 vêm do PR #2.
- Das 15 imagens em `docs/referencias/telas/`, 6 foram abertas (02, 04, 07, 09, 11, 12). As outras entraram pela descrição do `design.md`.
- A restrição da Search Box API (risco 5) foi lida na página de documentação, não nos termos de serviço completos. A regra da App Store sobre login social e a política de pausa do Supabase não foram conferidas na fonte.
- As estimativas de dias não têm histórico por trás. A única referência é a Fase 1, cujos commits são todos de 15 e 16/11, e não sei com qual modelo ela foi feita.
