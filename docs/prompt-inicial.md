Oi! Vamos começar o desenvolvimento da v1 de um app meu. Já planejei bastante, agora quero ver funcionando. Me responda sempre em português.

## O app
"Planejador de viagens" (nome provisório): app de viagem gamificado. O coração é um mapa-múndi pessoal coberto por uma névoa de nuvens que vai se abrindo conforme a pessoa faz check-in nos lugares que visitou. O mapa persiste entre todas as viagens, é o "mapa da sua vida".

Loop do MVP:
login com Google → onboarding de 2 perguntas → criar viagem (destino + datas, dias criados automaticamente) → adicionar lugares aos dias (aparecem como pinos trancados) → chegar perto de um lugar e fazer check-in, com foto e nota opcionais → o pino destrava, a névoa abre ao redor e a foto vira o ícone do pino → percentual e conquistas atualizam.

Sou solo founder, então disciplina de escopo é regra. Sou SRE/DevOps com bastante experiência em infra, cloud e pipelines, mas pouca experiência com desenvolvimento mobile. Explique as decisões de mobile quando forem relevantes.

## Repositório e referências visuais
Repositório: https://github.com/brooksbru/planejador_viagens. Ele já tem a pasta docs/; crie o projeto Expo na raiz sem apagar nem mover o que está em docs/.

Antes de qualquer código, leia docs/design.md inteiro e veja as imagens em docs/referencias/telas/. Eles são a fonte de verdade visual:
- os wireframes estão em cinza de propósito, definem estrutura e comportamento, não cor
- toda cor, fonte e medida sai de docs/referencias/tokens/, e as regras de uso no fim desses arquivos são obrigatórias
- transforme os tokens num tema TypeScript (escuro como padrão, claro e "Sistema"), mantendo os mesmos nomes
- as decisões de produto já tomadas estão em "Decisões tomadas" no design.md. A única em aberto é a dos estados do pino: me pergunte antes de implementar os pinos

## Stack já decidida
- React Native + Expo, TypeScript, Expo Router
- Development build (não Expo Go), porque o mapa usa módulo nativo
- Mapa: Mapbox via @rnmapbox/maps. MapLibre é a rota de fuga de custo no futuro, então mantenha o código do mapa isolado num módulo próprio pra facilitar uma troca
- Backend: Supabase (Postgres + PostGIS, Auth com Google, Storage pras fotos)
- Busca de lugares: só nome + coordenada (Mapbox Search/Geocoding). Nada de fotos, avaliações ou horários do Google
- Fontes: Hanken Grotesk e Fraunces. O React Native não aplica os eixos variáveis da Fraunces, então gere instâncias estáticas com SOFT 45 e WONK 1 (pesos 600 e 700) e embarque os arquivos, como explicado no design.md
- Meu ambiente: Windows 11, testes no emulador Android. iPhone vem depois via EAS Build

## A névoa (o diferencial, precisa ficar bonita)
- Nuvem densa e volumétrica, estilo cúmulo, na cor do token de névoa. NÃO é overlay escuro e NÃO são círculos ou formas geométricas separadas
- Precisa parecer uma massa única (fusão tipo metaball), com textura de ruído fractal e bordas suaves e esfiapadas
- Animação viva de "respiração", sutil e contínua
- Comportamento temporário: ao tocar, a nuvem se afasta radialmente do ponto tocado e depois volta devagar
- Comportamento permanente: check-in abre um buraco fixo na névoa ao redor do lugar (raio em metros, configurável)
- O toque na névoa não pode atrapalhar os gestos do mapa (pan, zoom)
- No tema claro, a névoa usa o contorno definido nos tokens

Minha sugestão de abordagem: overlay com @shopify/react-native-skia usando shader (ruído fractal + metaball), com as áreas abertas projetadas de coordenada geográfica pra coordenada de tela a cada mudança de câmera. Se você enxergar uma abordagem melhor, me apresente os prós e contras antes de seguir.

## Fases
Trabalhe uma fase por vez. No fim de cada fase pare, me mostre o que foi feito, como testar, e espere meu ok antes de seguir.

**Fase 0, setup:** projeto Expo com TypeScript e Expo Router, ESLint/Prettier, estrutura de pastas, .env.example (tokens nunca vão pro repositório), development build rodando no emulador Android. Tema em TypeScript a partir dos tokens, fontes configuradas e tab bar com as 4 abas (Mapa, Viagens, Conquistas, Perfil) ainda vazias. Crie um CLAUDE.md com o contexto deste projeto, um resumo do design.md e as convenções que combinarmos.

**Fase 1, spike do mapa + névoa (maior risco técnico):** mapa Mapbox com a névoa por cima, toque dissipando temporariamente, e um botão de teste que abre o buraco permanente na posição atual. Dados só locais, sem backend ainda. Critério de pronto: roda fluido no emulador (me diga o fps), a névoa parece uma massa única e o buraco acompanha o mapa no pan e no zoom sem descolar. Se a performance não ficar boa, pare e me traga alternativas.

**Fase 2, Supabase:** login com Google (tela de entrada conforme 01-entrada.png), tabelas (perfil, preferências, viagens, dias, lugares, check-ins) com PostGIS pras coordenadas, RLS em todas as tabelas, migrations versionadas no repositório. A névoa passa a ser carregada dos check-ins salvos.

**Fase 3, viagens e lugares:** lista de viagens (agora e anteriores), nova viagem com dias criados pelas datas, detalhe da viagem com abas por dia, horário opcional, nota e arrastar pra reordenar, adicionar lugar por busca ou marcando no mapa. Pinos trancados no mapa. Tempo de deslocamento e "Otimizar percurso" são fase 2 do produto: não implemente.

**Fase 4, proximidade e check-in:** localização só em primeiro plano ("ao usar o app"), nunca em segundo plano. Dois raios configuráveis: aproximação (padrão 400 m), que faz a pílula contextual aparecer com nome e distância, e check-in (padrão 100 m), que libera o botão. Entre os dois, botão desabilitado com texto amigável. A pílula segue os quatro estados de 10-pilula-estados.png (aparece deslizando, dispensa arrastando em qualquer direção, fica quieta até sair e voltar ao raio). Trate a precisão do GPS: se a leitura vier imprecisa demais, peça pra tentar de novo em vez de recusar direto. Não salve a localização bruta da pessoa, só que o check-in aconteceu naquele lugar e quando.
Folha de captura conforme 11-checkin-captura-recompensa.png: foto opcional pela câmera ou galeria, nota opcional, "Destravar este lugar" e "Agora não". Foto comprimida antes do upload, bucket privado no Storage, metadados de localização (EXIF) removidos. Recompensa no mapa: névoa abre, pino vira a foto (ou ícone de check sem foto), chip da cidade atualiza o percentual sem animar a contagem.

**Fase 5, gamificação e conta:** percentuais e conquistas só por contador, como em "Decisões tomadas" no design.md. Tela de conquistas, card de conquista no mapa quando destrava uma. Onboarding conforme as telas 02 e 03. Perfil conforme a tela 13: preferências de viagem, troca de tema, links legais, sair e excluir conta apagando todos os dados (com confirmação).

## Fora do escopo (não implemente, mesmo que pareça fácil)
GPS em segundo plano ou névoa por movimento, notificações de proximidade, tempo de deslocamento e otimização de percurso, conquistas temáticas, sugestão automática dos lugares que "ficaram para a próxima", importação de reservas por e-mail, voos e bagagem, qualquer recurso de IA, mascote, orçamento, PDF, versão desktop/offline, social e compartilhamento, compras e assinaturas.

## LGPD
Foto + localização são dado pessoal. RLS em tudo, fotos privadas, exclusão de conta de verdade, e deixe um rascunho de política de privacidade em docs/ pra eu revisar.

## Como quero trabalhar
- Antes de codar, leia tudo isso e o design.md e me devolva um plano da Fase 0 e da Fase 1. Se algo aqui estiver ambíguo ou parecer uma má ideia, me fale antes
- Commits pequenos e com mensagem clara
- Testes pra lógica pura (projeção de coordenadas, distância e raios, cálculo de percentual, regras de conquista); tela não precisa de teste automatizado agora
- Quando precisar de algo meu (token do Mapbox, projeto no Supabase, credencial do Google), me peça com o passo a passo
- Não adicione dependência sem me dizer o porquê
