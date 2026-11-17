# Fase 1: mapa e névoa

Documentação do spike de mapa e névoa ao fim da Fase 1. Segue o formato do [`fase-0.md`](fase-0.md): escrita para quem vem de infra/SRE e precisa entender o que o app faz sem viver no código.

**Estado:** a aba Mapa mostra o mapa-múndi coberto por uma névoa de nuvens que acompanha o contorno dos continentes. Tocar na névoa a afasta por instantes; um botão de teste abre um buraco permanente. Tudo em memória: fechar o app apaga os buracos. As outras três abas continuam vazias.

## Sumário

1. [Visão geral em um minuto](#1-visão-geral-em-um-minuto)
2. [Critérios da fase e resultado](#2-critérios-da-fase-e-resultado)
3. [Arquitetura: duas camadas sobrepostas](#3-arquitetura-duas-camadas-sobrepostas)
4. [O mapa](#4-o-mapa)
5. [A névoa](#5-a-névoa)
6. [Sincronia entre névoa e mapa](#6-sincronia-entre-névoa-e-mapa)
7. [Lógica pura e testes](#7-lógica-pura-e-testes)
8. [Desempenho medido](#8-desempenho-medido)
9. [Como testar](#9-como-testar)
10. [Onde ajustar](#10-onde-ajustar)
11. [Mapa dos arquivos novos](#11-mapa-dos-arquivos-novos)
12. [Dependências novas e o porquê](#12-dependências-novas-e-o-porquê)
13. [Decisões tomadas](#13-decisões-tomadas)
14. [Problemas encontrados no caminho](#14-problemas-encontrados-no-caminho)
15. [Limitações e o que não foi verificado](#15-limitações-e-o-que-não-foi-verificado)
16. [Glossário](#16-glossário)

## 1. Visão geral em um minuto

- O mapa é o **Mapbox**, um componente nativo. Ele cuida de pan, zoom e do desenho das ruas.
- A névoa é um **desenho separado, por cima do mapa**, feito com **Skia** e um **shader** (programa que roda na placa de vídeo e calcula a cor de cada pixel).
- A névoa não recebe toques. Todo gesto atravessa e chega ao mapa.
- A cada movimento, o mapa avisa a posição da câmera e a névoa se redesenha no mesmo lugar geográfico.
- A névoa só cobre terra. O mar fica livre, então o formato dos continentes aparece desenhado pelas nuvens.
- Há duas camadas de névoa: um **véu fino**, que só sai onde o lugar foi destravado, e um **cúmulo denso** por cima, que se afasta ao toque e volta sozinho.
- Nada é salvo. Banco de dados e login chegam na Fase 2.

## 2. Critérios da fase e resultado

| Critério | Resultado |
| --- | --- |
| Rodar fluido no emulador, com fps informado | 60 a 64 fps em build de release. GPU: mediana de 7 ms por quadro, percentil 90 de 9 ms (o orçamento a 60 fps é 16,7 ms). |
| A névoa parecer uma massa só | Um único shader desenha tudo; buracos próximos se fundem (metaball) em vez de virarem círculos soltos. |
| O buraco acompanhar o mapa em pan e zoom | Acompanha. No arrasto mais rápido o desvio fica em até 21 px, contra 75 a 100 px sem a previsão de pan. |

## 3. Arquitetura: duas camadas sobrepostas

```
┌──────────────── Aba Mapa (src/app/(tabs)/index.tsx) ────────────────┐
│                                                                      │
│   Controles de teste (fps, chips, botão)        ← recebem toque     │
│   ───────────────────────────────────────                           │
│   FogOverlay (Skia + shader)                    ← não recebe toque  │
│   ───────────────────────────────────────                           │
│   MapCanvas (Mapbox nativo)                     ← recebe os gestos  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

MapCanvas ──"a câmera mudou" (centro, zoom, instante)──▶ FogOverlay
MapCanvas ──"tocaram aqui" (coordenada)────────────────▶ FogOverlay.dissipate
```

A névoa não faz parte do mapa. Ela é uma pintura transparente colada na frente dele, que recalcula a própria posição toda vez que o mapa se move. Esse desenho foi escolhido porque o Mapbox não oferece um jeito de rodar um shader próprio com este nível de controle, e porque mantém o mapa trocável (seção 4).

O custo dessa escolha é a **sincronia**: são dois sistemas desenhando em momentos ligeiramente diferentes. A seção 6 explica como isso foi tratado.

## 4. O mapa

O Mapbox fica isolado em [`src/features/map/`](../src/features/map/). O resto do app só conhece o contrato em [`types.ts`](../src/features/map/types.ts); nenhum outro arquivo importa o SDK do Mapbox.

| Peça do contrato | Para que serve |
| --- | --- |
| `initialCamera` | Centro e zoom iniciais. Hoje: o Brasil inteiro (`[-54, -15]`, zoom 2,8). |
| `scheme` | Estilo escuro ou claro, conforme o tema. |
| `onCameraChange(camera, instante)` | Dispara continuamente em pan e zoom. É o que alimenta a névoa. |
| `onPress({ lngLat, point })` | Toque simples (não dispara em arrasto ou zoom). |
| `showUserLocation`, `onUserLocation` | Ponto azul e posição do GPS, com pedido de permissão. |
| `flyTo(centro, zoom)` | Voa até um ponto. |

**Por que isolar.** O Mapbox cobra por uso acima da franquia gratuita. Se o custo apertar, a rota de fuga é o MapLibre (código aberto), e a troca fica restrita a reescrever o `MapCanvas.tsx`.

**Restrições impostas ao mapa.** A névoa faz a conta de posição num mapa plano. Por isso o mapa usa projeção Mercator plana (sem globo) e tem rotação e inclinação desligadas.

**Estilo.** Por enquanto são os estilos padrão do Mapbox (`dark-v11` e `light-v11`). O estilo próprio, com as cores `terrain-*` do design, não foi feito.

**Token.** O token público do Mapbox (`pk.`) vem de `EXPO_PUBLIC_MAPBOX_TOKEN` no `.env` e vai embutido no app, como previsto. O token secreto de download não foi necessário.

## 5. A névoa

Mora em [`src/features/fog/`](../src/features/fog/). O componente é o [`FogOverlay.tsx`](../src/features/fog/FogOverlay.tsx) e o desenho em si está no shader, em [`fogShader.ts`](../src/features/fog/fogShader.ts).

### 5.1 Como a nuvem é gerada

A textura de nuvem não é uma imagem: é calculada por uma função de **ruído** (valores aleatórios suaves) somada em quatro escalas, o que dá volumes grandes com detalhes pequenos. A nuvem está presa ao mapa: ao arrastar, ela vai junto, como se estivesse pousada sobre o terreno.

No zoom, um desenho preso ao mapa cresceria até virar um borrão. Para evitar isso, o shader mantém a nuvem em duas escalas vizinhas e mistura uma na outra conforme o zoom avança. O tamanho aparente dos volumes fica sempre parecido.

As duas camadas derivam devagar numa direção e ondulam, para parecer nuvem ao vento.

### 5.2 As duas camadas

| Camada | Aparência | Quando some |
| --- | --- | --- |
| **Véu fino** | Translúcido; deixa ver o mapa de leve. | Só onde há um buraco permanente (lugar destravado). |
| **Cúmulo denso** | Opaco, por cima do véu. | Nos buracos permanentes e, por instantes, onde a pessoa toca. |

Tocar não revela o mapa por completo: afasta o cúmulo e deixa o véu. A abertura leva cerca de um quarto de segundo e começa a fechar em seguida, de forma gradual, por uns 2 segundos.

### 5.3 Buracos permanentes

Um buraco é um ponto geográfico com raio em metros (300 m por padrão). Vários buracos próximos se fundem numa área só, com contorno contínuo, em vez de círculos sobrepostos. Essa técnica se chama **metaball**: cada buraco contribui com um "campo" que decai com a distância, os campos são somados e a névoa abre onde a soma passa de um limiar.

As bordas são recortadas pelo próprio relevo da nuvem, então não há círculo perfeito. Um buraco novo abre crescendo a partir do centro, em 1,4 s.

Limite atual: **32 buracos** na tela ao mesmo tempo (tamanho fixo da lista que o shader recebe). Basta para o spike; a Fase 4 precisa decidir como lidar com mais (seção 15).

### 5.4 Névoa só sobre a terra

O app embarca uma imagem do mundo, [`assets/images/land-mask.png`](../assets/images/land-mask.png): branco é terra, preto é mar, 2048×2048 pixels, 331 KB. O shader consulta essa imagem para cada pixel e só desenha névoa onde é terra.

- A imagem é gerada pelo script [`scripts/fog/gerar_mascara_terra.py`](../scripts/fog/gerar_mascara_terra.py) a partir do Natural Earth (dados públicos, escala 1:50 milhões). O arquivo gerado está no git; o script só roda de novo se a máscara mudar.
- O litoral da névoa é recortado pelo relevo da nuvem, como as outras bordas.
- A névoa passa um pouco da costa de propósito, para nenhum ponto em terra ficar descoberto.

### 5.5 Resolução reduzida

A névoa é desenhada com metade da largura e metade da altura da tela e depois ampliada. São quatro vezes menos pixels para calcular, e a diferença não aparece porque nuvem é uma imagem naturalmente difusa.

## 6. Sincronia entre névoa e mapa

O mapa desenha numa thread nativa. O aviso de "a câmera mudou" precisa atravessar até o JavaScript e depois até o shader. Nesse caminho passa pelo menos um quadro, e num arrasto rápido a névoa ficaria visivelmente para trás: o buraco "escorregava" 75 a 100 px em relação ao ponto do mapa.

A correção é uma **previsão de pan**:

1. Cada aviso de câmera traz o instante em que o mapa o gerou.
2. Com dois avisos seguidos, a névoa calcula a velocidade do arrasto.
3. A cada quadro, ela se adianta: posição avisada + velocidade × tempo decorrido desde o aviso.
4. Sem aviso novo por 90 ms, a previsão some aos poucos, para a névoa não passar do ponto quando o mapa para.

A previsão só age em pan puro. No zoom ela fica desligada.

**Calibração.** A constante `PIPELINE_MS = -8` (em `FogOverlay.tsx`) ajusta o adiantamento. Ela foi medida no emulador assim: o chip "Marcadores" desenha um ponto pelo próprio mapa e uma mira pela névoa no mesmo lugar geográfico; capturas de tela durante arrastos automatizados mostram a distância entre os dois. Sem o ajuste a névoa passava do ponto em cerca de 24 ms de movimento. Com ele, o desvio medido foi de 4, 10 e 21 px em arrastos lento, médio e rápido.

Esse valor depende do aparelho. **Em celular real ele precisa ser conferido de novo.**

## 7. Lógica pura e testes

A matemática que não depende de tela fica separada e tem testes automatizados (Jest). São 28 testes.

| Arquivo | O que faz |
| --- | --- |
| [`src/lib/geo/mercator.ts`](../src/lib/geo/mercator.ts) | Converte latitude/longitude em posição na tela e de volta; metros por pixel em cada zoom e latitude. |
| [`src/lib/geo/distance.ts`](../src/lib/geo/distance.ts) | Distância em metros entre dois pontos e teste "está dentro do raio". Base do check-in na Fase 4. |
| [`src/features/fog/fogMath.ts`](../src/features/fog/fogMath.ts) | Posição e raio de cada buraco na tela; parâmetros do ruído para a câmera atual. |

Rodar: `npm.cmd test`.

O shader e as telas não têm teste automatizado. Foram conferidos por captura de tela no emulador.

## 8. Desempenho medido

Tudo no emulador `Medium_Phone_API_37.0` (1080×2400), com o comando `adb shell dumpsys gfxinfo`.

| Medida | Valor |
| --- | --- |
| Quadros por segundo, build de release | 60 a 64 |
| Tempo de GPU por quadro, com a máscara de terra | mediana 7 ms, percentil 90 de 9 ms, percentil 99 de 14 ms |
| Quadros lentos durante pan e zoom | praticamente nenhum |
| Desvio da névoa no arrasto rápido | até 21 px (75 a 100 px sem previsão) |

Os tempos de GPU da linha 2 foram medidos no build de desenvolvimento, que é mais lento que o de release.

O contador no canto da tela mostra dois números: **UI** (a thread que desenha) e **JS** (a thread do JavaScript). O de JS oscila entre 30 e 60 mesmo em release, e a causa não foi investigada. Como a névoa é animada na thread de UI, isso não afeta a fluidez dela.

**Emulador não é celular.** O emulador usa a placa de vídeo do computador. Um aparelho Android de entrada pode se comportar pior; o primeiro ajuste, se precisar, é `renderScale` (seção 10).

## 9. Como testar

Com o emulador aberto e o app instalado:

```bash
npm.cmd start
```

| Teste | O que esperar |
| --- | --- |
| Abrir o app | Mapa enquadrando o Brasil; névoa cobrindo a América do Sul, mar livre. |
| Arrastar e dar zoom | A névoa acompanha o mapa; o contorno dos continentes se mantém. |
| Tocar na névoa | O cúmulo se afasta com borda irregular, o véu fica, e fecha em cerca de 2 s. |
| Botão "Abrir névoa…" | Abre um buraco permanente (no GPS, ou no centro do mapa se não houver posição). |
| Vários buracos próximos | Fundem-se numa área só. |
| Chip "Marcadores" | Ponto magenta (desenhado pelo mapa) e mira ciano (desenhada pela névoa) no centro de cada buraco. Devem coincidir. |
| Chip "Previsão: sim/não" | Liga e desliga a previsão de pan, para comparar o desvio no arrasto rápido. |
| Chip "Minha posição" | Voa até o GPS. No emulador, defina a posição em Extended controls → Location. |

Os chips, o contador de fps e o botão são **controles de teste**. Saem quando o check-in de verdade existir (Fase 4).

Para medir em release: `npm.cmd run android:release`. Para voltar ao desenvolvimento: `npm.cmd run android`.

## 10. Onde ajustar

Decisões de produto, em [`src/features/fog/config.ts`](../src/features/fog/config.ts):

| Parâmetro | Valor | Efeito |
| --- | --- | --- |
| `holeRadiusMeters` | 300 | Tamanho da área que um check-in abre. |
| `minHoleRadiusPx` | 5 | Tamanho mínimo do buraco na tela, para ele não sumir com o zoom longe. |
| `renderScale` | 2 | Redução da resolução da névoa. Subir para 3 alivia a GPU e deixa a névoa mais difusa. |
| `predictPan` | `true` | Liga a previsão de pan. |

Ajustes finos de aparência:

| Onde | O quê |
| --- | --- |
| `FogOverlay.tsx`: `TAP_RADIUS`, `TAP_OPEN_MS`, `TAP_CLOSE_MS` | Tamanho e tempos da abertura por toque. |
| `FogOverlay.tsx`: `PIPELINE_MS` | Calibração da previsão de pan. |
| `fogShader.ts`: `coastWarp` (`32.0`) | O quanto o litoral é recortado. |
| `fogShader.ts`: limiares `0.27` e `0.17` | O quanto a névoa passa da costa (menor avança mais sobre o mar). |
| `src/theme/tokens.ts`: `fog`, `fogOutline` | Cor da névoa e do contorno em cada tema. |
| `gerar_mascara_terra.py`: `TAMANHO`, `BORRAO` | Resolução e suavidade da máscara de terra. |

## 11. Mapa dos arquivos novos

```
src/
├── app/(tabs)/index.tsx        Aba Mapa: junta mapa, névoa e controles de teste
├── lib/geo/                    Projeção e distância (com testes)
├── features/
│   ├── map/                    Único lugar que conhece o Mapbox
│   │   ├── types.ts            Contrato do mapa
│   │   └── MapCanvas.tsx       Implementação com @rnmapbox/maps
│   ├── fog/
│   │   ├── FogOverlay.tsx      Componente: recebe a câmera, anima, alimenta o shader
│   │   ├── fogShader.ts        O desenho da névoa (SkSL)
│   │   ├── fogMath.ts          Contas de posição e ruído (com testes)
│   │   └── config.ts           Parâmetros de produto
│   └── debug/FpsCounter.tsx    Contador de fps (controle de teste)
assets/images/land-mask.png     Máscara de terra e mar do mundo
scripts/fog/                    Script que gera a máscara
plugins/withCmakePolicyMinimum.js   Ajuste de build para o Skia (seção 14)
```

## 12. Dependências novas e o porquê

| Pacote | Para que serve |
| --- | --- |
| `@rnmapbox/maps` | O mapa. Módulo nativo. |
| `@shopify/react-native-skia` | Motor de desenho 2D com suporte a shader. É onde a névoa é pintada. Módulo nativo. |
| `jest`, `jest-expo`, `@types/jest` (desenvolvimento) | Testes automatizados da lógica pura. |

`react-native-reanimated`, que já vinha do template, passou a ser usada: ela anima os valores da névoa na thread de UI, sem depender do JavaScript.

O `app.json` ganhou as permissões de localização do Android (precisa e aproximada, só em primeiro plano) e os plugins do Mapbox e do ajuste de CMake.

## 13. Decisões tomadas

| Decisão | Motivo |
| --- | --- |
| Névoa como overlay Skia, não como camada do Mapbox | Controle total do desenho e mapa trocável. O custo é a sincronia, tratada na seção 6. |
| Mapa plano, sem rotação nem inclinação | A conta de posição da névoa supõe mapa plano. Simplifica muito e não faz falta no produto. |
| Duas camadas (véu e cúmulo) | Pedido de produto: o toque dá uma espiada, só o check-in revela de verdade. |
| Névoa só sobre a terra, no mundo inteiro | Pedido de produto: a pessoa precisa reconhecer o que está olhando. |
| Máscara de terra como imagem embarcada | Simples e barata na GPU. A alternativa (consultar o mapa) amarraria a névoa ao Mapbox. |
| Meia resolução | Quatro vezes menos trabalho, sem perda visível. |
| Previsão só em pan | Foi onde o atraso aparecia. Zoom não pôde ser medido por automação (seção 15). |
| Visão inicial no Brasil inteiro | Pedido de produto. |

## 14. Problemas encontrados no caminho

**O Skia não compilava com o CMake 4.** O CMake 4.1.2, exigido pela Fase 0, recusa projetos que declaram compatibilidade com versões muito antigas, e o Skia declara. A correção foi um config plugin próprio, [`plugins/withCmakePolicyMinimum.js`](../plugins/withCmakePolicyMinimum.js), que passa ao CMake o parâmetro `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` durante o prebuild. Nada em `android/` é editado à mão.

**A primeira névoa parecia mármore.** O ruído inicial dava veios. Foi trocado por outro tipo (gradiente, com volumes arredondados) e suavizado.

**Medir o atraso a olho não funcionava.** Daí a mira desenhada pelo shader e a medição por captura de tela (seção 6).

**A primeira previsão de pan tremia.** Ela calculava a velocidade pelo momento em que o aviso chegava ao JavaScript, que varia bastante. Passou a usar o instante em que o mapa gerou o aviso.

**O toque passou por várias versões.** O fechamento, em especial, virava um círculo duro encolhendo; hoje a abertura se preenche de nuvem por igual.

## 15. Limitações e o que não foi verificado

Limitações conhecidas:

| Limitação | Consequência |
| --- | --- |
| Máscara com cerca de 20 km por ponto | No zoom de cidade, a borda da névoa fica a alguns quilômetros da costa real e não acompanha baías. |
| Ilhas pequenas ausentes dos dados | Ficam sem névoa. Um lugar planejado numa delas apareceria descoberto. Solução possível na Fase 3: forçar névoa em volta de todo lugar planejado. |
| Lagos e mares interiores | Os dados não os trazem; ficam cobertos como terra. |
| 32 buracos por tela | Acima disso os excedentes não aparecem. A Fase 4 precisa de uma estratégia (escolher os visíveis, ou agrupar no zoom longe). |
| Estilo do mapa padrão | As cores `terrain-*` do design ainda não foram aplicadas. |

Não verificado:

- **Zoom com dois dedos.** A automação do emulador não faz o gesto, então o acompanhamento da névoa durante a pinça não foi medido.
- **Parada brusca do arrasto.** A previsão pode passar um pouco do ponto por um instante.
- **Celular real.** Fps e a calibração `PIPELINE_MS` valem para o emulador.
- **Tema claro com a máscara de terra**, e o toque e o buraco permanente perto do litoral.
- **A oscilação do contador de JS** entre 30 e 60 fps.

## 16. Glossário

| Termo | Significado |
| --- | --- |
| **Câmera** | O ponto de vista do mapa: centro (longitude, latitude) e zoom. |
| **fps** | Quadros por segundo. 60 é o alvo; cada quadro tem 16,7 ms. |
| **Metaball** | Técnica em que formas próximas se fundem com contorno contínuo. |
| **Overlay** | Camada desenhada por cima de outra. |
| **Projeção Mercator** | A conta que transforma o globo num mapa plano. É a usada por praticamente todo mapa online. |
| **Ruído** | Função que gera valores aleatórios suaves; base de texturas como nuvem. |
| **Shader** | Programa pequeno que roda na placa de vídeo e calcula a cor de cada pixel. |
| **Skia** | Motor de desenho 2D (o mesmo do Chrome e do Android). |
| **SkSL** | A linguagem dos shaders do Skia. |
| **Thread de UI** | A linha de execução que desenha a tela. Animações que rodam nela não travam quando o JavaScript está ocupado. |
| **Uniform** | Valor que o app envia ao shader a cada quadro (posição da câmera, buracos, tempo). |
