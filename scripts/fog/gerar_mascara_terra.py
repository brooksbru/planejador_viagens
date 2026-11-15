"""Gera a máscara de terra/mar que a névoa usa pra cobrir só os continentes.

Saída: assets/images/land-mask.png, quadrada, em projeção Web Mercator (a
mesma do mapa), com o mundo inteiro: branco = terra, preto = mar. A imagem
sai borrada de propósito: o shader corta num limiar e o borrão vira uma
borda suave em qualquer zoom, em vez de serrilhado.

Fonte: Natural Earth, terra em escala 1:50m (domínio público).

Uso (na raiz do repositório):
    python -m pip install -r scripts/fog/requirements.txt
    python scripts/fog/gerar_mascara_terra.py
"""

import json
import math
import pathlib
import urllib.request

from PIL import Image, ImageDraw, ImageFilter

FONTE = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_50m_land.geojson"
)
DESTINO = pathlib.Path(__file__).resolve().parents[2] / "assets" / "images" / "land-mask.png"

TAMANHO = 2048  # lado da imagem final, em pixels
SUPER = 2  # desenha maior e reduz, pra borda sair suave
BORRAO = 2.5  # raio do borrão, em pixels da imagem final
MAX_LATITUDE = 85.051129


def projetar(lng: float, lat: float, lado: int) -> tuple[float, float]:
    lat = max(-MAX_LATITUDE, min(MAX_LATITUDE, lat))
    seno = math.sin(math.radians(lat))
    x = lng / 360 + 0.5
    y = 0.5 - math.log((1 + seno) / (1 - seno)) / (4 * math.pi)
    return x * lado, y * lado


def desenhar_poligono(desenho: ImageDraw.ImageDraw, aneis: list, lado: int) -> None:
    externo, *furos = aneis
    desenho.polygon([projetar(lng, lat, lado) for lng, lat in externo], fill=255)
    for furo in furos:
        desenho.polygon([projetar(lng, lat, lado) for lng, lat in furo], fill=0)


def main() -> None:
    print(f"Baixando {FONTE}")
    dados = json.loads(urllib.request.urlopen(FONTE).read())

    lado = TAMANHO * SUPER
    imagem = Image.new("L", (lado, lado), 0)
    desenho = ImageDraw.Draw(imagem)

    for feicao in dados["features"]:
        geometria = feicao["geometry"]
        if geometria["type"] == "Polygon":
            desenhar_poligono(desenho, geometria["coordinates"], lado)
        elif geometria["type"] == "MultiPolygon":
            for poligono in geometria["coordinates"]:
                desenhar_poligono(desenho, poligono, lado)

    imagem = imagem.resize((TAMANHO, TAMANHO), Image.LANCZOS)
    imagem = imagem.filter(ImageFilter.GaussianBlur(BORRAO))

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    imagem.save(DESTINO, optimize=True)
    print(f"{DESTINO.name}: {TAMANHO}x{TAMANHO}, {DESTINO.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
