"""Gera instâncias estáticas da Fraunces com os eixos do design.

O React Native não aplica font-variation-settings de forma confiável, então
fixamos SOFT 45 e WONK 1 (tokens-tipografia.css) em arquivos estáticos.
O eixo opsz também precisa ser fixado: usamos um valor perto do tamanho em
que cada peso aparece (600: 20-24px, 700: 28-44px).

Uso (na raiz do repositório):
    python -m pip install -r scripts/fonts/requirements.txt
    python scripts/fonts/instanciar_fraunces.py
"""

import io
import pathlib
import urllib.request

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FONTE_VARIAVEL = (
    "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/"
    "Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf"
)
DESTINO = pathlib.Path(__file__).resolve().parents[2] / "assets" / "fonts"

INSTANCIAS = [
    # arquivo (vira o fontFamily no Android), estilo, eixos
    ("Fraunces-SemiBold", "SemiBold", {"wght": 600, "opsz": 24, "SOFT": 45, "WONK": 1}),
    ("Fraunces-Bold", "Bold", {"wght": 700, "opsz": 36, "SOFT": 45, "WONK": 1}),
]


def renomear(fonte: TTFont, arquivo: str, estilo: str) -> None:
    """Dá a cada instância um nome de família próprio, sem colidir com a variável."""
    familia = "Fraunces App"
    nomes = fonte["name"]
    for plataforma, codificacao, idioma in ((3, 1, 0x409), (1, 0, 0)):
        nomes.setName(familia, 1, plataforma, codificacao, idioma)
        nomes.setName(estilo, 2, plataforma, codificacao, idioma)
        nomes.setName(f"{familia} {estilo}", 4, plataforma, codificacao, idioma)
        nomes.setName(arquivo, 6, plataforma, codificacao, idioma)
        nomes.setName(familia, 16, plataforma, codificacao, idioma)
        nomes.setName(estilo, 17, plataforma, codificacao, idioma)


def main() -> None:
    print(f"Baixando {FONTE_VARIAVEL}")
    dados = urllib.request.urlopen(FONTE_VARIAVEL).read()
    DESTINO.mkdir(parents=True, exist_ok=True)

    for arquivo, estilo, eixos in INSTANCIAS:
        variavel = TTFont(io.BytesIO(dados))
        estatica = instancer.instantiateVariableFont(variavel, eixos)
        renomear(estatica, arquivo, estilo)
        caminho = DESTINO / f"{arquivo}.ttf"
        estatica.save(caminho)
        print(f"  {caminho.name}: {eixos}")


if __name__ == "__main__":
    main()
