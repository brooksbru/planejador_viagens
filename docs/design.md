# Design do app

Fonte de verdade visual do Planejador de Viagens. Veio do board do Miro e foi trazido pra cá pra não depender do board. Se algo aqui conflitar com o board, vale este arquivo.

## Como ler as referências

- `referencias/telas/`: wireframes das telas. Eles estão em **cinza neutro de propósito**. Definem estrutura, hierarquia, textos e comportamento, **não** cor.
- `referencias/tokens/`: cores, tipografia e espaçamento. É daqui que sai toda cor, fonte e medida do app. Os comentários no fim de cada arquivo são **regras de uso obrigatórias**, não decoração.
- `telas/00-paleta-aplicada.png`: mostra como a paleta entra num layout real, nos dois temas.
- Os números brancos em círculo nas imagens (1, 2, 3...) são anotações do board, não fazem parte da interface.

## Princípios

- O momento mais importante do app é o destrave: a névoa abrindo e o pino virando foto. Tudo que compete com isso (cor de conquista em botão comum, contador animado, confete) está proibido pelas regras dos tokens.
- Tom dos textos: leve, próximo, sem culpa. Exemplo da tela de viagem anterior: "3 ficaram para a próxima" em vez de "3 não visitados".
- Tema escuro é o padrão. Claro e "Sistema" disponíveis no perfil.

## Navegação

Tab bar inferior com Mapa, Viagens e Perfil. As telas de Conquistas e Perfil mostram uma quarta aba (Conquistas). Ver decisão em aberto 2.

## Telas

### 01 Entrada (`01-entrada.png`, `01-entrada-alt.png`)
Login só com Google. Fundo com formas de nuvem, título "Um mundo inteiro a descobrir", subtítulo, botão "Entrar com Google" e aviso de termos e política. Duas versões no board, ver decisão em aberto 9.

### 02 e 03 Onboarding (`02-onboarding-interesses.png`, `03-onboarding-estilo.png`)
Dois passos com barra de progresso de 2 segmentos. Chips de múltipla escolha com limite.
- **O que te faz escolher um destino?** Até 3: Natureza, Praia, Gastronomia, História, Vida noturna, Trilha, Arte, Compras, Vinho (há mais uma opção cortada na imagem). Serve pra personalizar as conquistas. Botão "Continuar".
- **O que é mais importante pra você em uma viagem?** Até 2: Conforto, Economia, Luxo, Aventura, Tranquilidade, Vida local, Praticidade, Espontaneidade. Botão "Ver meu mapa", que leva direto pro mapa.
As respostas podem ser editadas depois em Perfil > Preferências de viagem.

### 04 Lista de viagens (`04-viagens-lista.png`)
Seções "Agora" (viagem em andamento, com barra de progresso e "3 de 8 lugares destravados") e "Anteriores" (período e "x de y destravados"). Botão flutuante "+ Nova viagem".

### 05 Viagem anterior (`05-viagem-anterior.png`)
Card de viagem encerrada com o que faltou: "4 de 7 destravados" e "3 ficaram para a próxima". Mantém a contagem e nomeia o que faltou sem virar culpa. Os lugares que sobraram viram sugestão pra próxima viagem ao mesmo destino (gancho de retorno). Ver decisão em aberto 8.

### 06 Nova viagem (`06-nova-viagem.png`)
Destino (busca: cidade, país ou região) e datas de ida e volta. Mostra "9 dias de viagem, vamos criar os dias 1 a 9" e cria os dias automaticamente; dá pra adicionar, remover e renomear depois. Botão "Criar viagem".

### 07 Detalhe da viagem (`07-viagem-detalhe.png`)
Cabeçalho com destino, período e "3 de 8 destravados". Abas por dia (Dia 1, Dia 2... e "+"). Cada lugar do dia tem horário opcional, nome, nota ou limite ("até 12:00"), estado (check se destravado, cadeado se trancado) e alça pra arrastar e reordenar. Botão "Adicionar ao dia 1".
**Marcado como fase 2, não implementar:** tempo de deslocamento entre lugares e "Otimizar percurso do dia".

### 08 Adicionar lugar (`08-adicionar-lugar.png`)
Folha com busca. Resultado mostra nome e bairro/cidade, com "+" pra adicionar. Último item: "Adicionar 'termo' manualmente" pra lugares que a busca não encontra. Ver decisão em aberto 6.

### 09 e 10 Mapa e pílula contextual (`09-mapa-pilula.png`, `10-pilula-estados.png`)
O mapa é a tela principal. A névoa está especificada no prompt inicial (nuvem volumétrica, massa única, respiração, toque dissipa temporariamente, check-in abre permanente). Nos wireframes ela aparece só como áreas cinza.
A pílula de check-in é contextual e tem quatro estados:
- **Mapa limpo:** padrão, nada cobre o mapa quando você está longe de tudo.
- **Chegou:** ao entrar no raio de um lugar planejado, a pílula sobe deslizando de baixo com nome, distância e botão "Check-in".
- **Dispensada:** arrastar em qualquer direção, ela voa junto com o dedo. Sem botão de fechar, sem limiar rígido.
- **Fica quieta:** depois de dispensada, não volta enquanto a pessoa estiver ali. Só reaparece se sair do raio e voltar, ou ao chegar em outro lugar planejado.
Detectar "entrou no raio" exige localização em primeiro plano enquanto o app está aberto. Nada de localização em segundo plano. Ver decisão em aberto 3.

### 11 Check-in: captura e recompensa (`11-checkin-captura-recompensa.png`)
**Captura (rápida e dispensável):** folha com nome do lugar, "Você está aqui · a 40 m", área de foto opcional (câmera ou galeria), nota opcional, botão "Destravar este lugar" e "Agora não".
**Recompensa (acontece no mapa):** a folha fecha, a névoa abre ao redor do lugar, o pino vira a foto (com anéis pulsando), o chip do topo atualiza a cidade e o percentual ("Lisboa 41%") e, se houver, um card de conquista aparece embaixo. Sem foto, o pino destravado mostra o ícone de check.
O percentual troca de valor sem animar a contagem (regra 7 da tipografia).

### 12 Conquistas (`12-conquistas.png`)
Destaque "4% do mundo, aberto até agora" com atalho "Ver no mapa". Linha de números: lugares, cidades, países. Lista "Destravadas" (nome, lugar e data) e "A destravar" com barra de progresso ("1 de 3 vinícolas", "5 de 10 países"). Conquistas temáticas dependem de saber a categoria do lugar, ver decisões em aberto 4 e 5.

### 13 Perfil (`13-perfil.png`)
Avatar com iniciais, nome, e-mail e editar. Preferências de viagem (respostas do onboarding). Tema: Escuro, Claro, Sistema. Legal: Política de privacidade e Termos de uso (links externos). Conta: Sair e "Excluir minha conta" (visual discreto, mas funciona de verdade, com confirmação e apagando todos os dados). Versão do app no rodapé.

## Tokens no React Native

Os arquivos em `referencias/tokens/` estão em CSS porque vieram do board. No app eles viram um objeto de tema em TypeScript, com tema escuro (padrão) e claro, trocado por contexto e respeitando a opção "Sistema" via `useColorScheme`. Mantenha os mesmos nomes dos tokens pra ficar fácil comparar.

Pontos técnicos que precisam de atenção:
- **Fraunces com eixos SOFT 45 e WONK 1:** React Native não aplica `font-variation-settings` de forma confiável, e os pacotes `@expo-google-fonts` trazem só instâncias estáticas sem esses eixos. Pra manter o visual, gere instâncias estáticas da fonte variável (por exemplo com `fonttools varLib.instancer`) nos pesos 600 e 700 com SOFT 45 e WONK 1, e embarque os TTF no app. A fonte é OFL, pode embarcar.
- **Números em coluna:** Hanken Grotesk com `fontVariant: ['tabular-nums']`.
- **Números isolados de destaque:** Fraunces, com largura mínima no container pra não empurrar o layout.
- **Cores de terreno** (`--terrain-*`): são do estilo do mapa no Mapbox, em versões mais lavadas, nunca da interface.
- **Pinos:** anel de 2px na cor da superfície, ícone diferente por estado, alvo de toque mínimo de 48x48.

## Decisões em aberto

Pergunte antes de implementar qualquer parte que dependa destas.

1. **Planner por dia ou lista simples?** O escopo original do MVP dizia lista simples, mas as telas mostram dias com horário e reordenação.
2. **Tab bar com 3 ou 4 abas?** Conquistas como aba própria ou acessada de outro lugar.
3. **Raios de proximidade:** a pílula aparece a 400 m no wireframe e a captura mostra "a 40 m". São dois raios (aparecer e permitir check-in) ou um só?
4. **Categoria dos lugares:** conquistas como "Sommelier de vinhos" e "Rei das cachoeiras" precisam saber que o lugar é vinícola ou cachoeira. Vem da categoria do Mapbox, a pessoa escolhe, ou essas conquistas ficam pra depois?
5. **"% do mundo":** exige cálculo por área aberta. Na v1 pode ser uma métrica mais simples?
6. **Adicionar manualmente:** como pegar a coordenada? Marcar no mapa?
7. **Estados do pino:** os tokens falam em planejado, trancado e desbloqueado. Qual a diferença entre planejado e trancado?
8. **"Ficaram para a próxima":** os lugares não visitados viram sugestão automática na próxima viagem ao destino já na v1?
9. **Entrada:** qual das duas versões vale? Na `01-entrada-alt.png` o título branco sobre fundo claro fica sem contraste.
