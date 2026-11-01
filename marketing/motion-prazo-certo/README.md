# Motion demonstrativo — Prazo Certo

Primeira versão criada em 31/10/2026 para explorar anúncios de aquisição nacional.

- **Vídeo:** `prazo-certo-motion-vertical.mp4` — H.264, 1080 × 1920, 24 fps, 26 segundos, sem áudio.
- **Prévia:** `capa.png`, `roteiro-visual.jpg` e `cena-01.png` a `cena-05.png`.
- **Fontes editáveis:** `render.py`, `assets/` e `manifest.json`.
- **Identidade:** Work Sans, azul profundo e champanhe. A licença da fonte está em `assets/LICENSE-WorkSans.txt`.
- **Origem:** capturas da demonstração pública real, com dados fictícios. Nenhum dado operacional de cliente foi utilizado.

## Recriar em outro computador

Com Python instalado (a criação usou Python 3.12.14):

```bash
cd marketing/motion-prazo-certo
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python render.py
```

No Windows, a ativação no PowerShell é `.venv\Scripts\Activate.ps1`.
O pacote `imageio-ffmpeg` fornece o executável de FFmpeg para as plataformas que suporta; não é necessário copiar o binário deste notebook.
As fontes TTF já estão incluídas; fontTools não é necessário para renderizar novamente.

Editar os textos, tempos e enquadramentos em `render.py`. A execução substitui o MP4, as cenas, a capa, o roteiro visual e o manifesto nesta pasta.
Depois de qualquer alteração, conferir legibilidade, textos da interface e enquadramentos; a validação de decodificação da versão entregue está no manifesto.

## Limites desta versão

É um motion composto de capturas reais, com entradas, transições, realces e deslocamento da lista. Não é gravação contínua de uma sessão nem um tutorial de todas as funções.
Não inclui locução, música, depoimentos, preço ou promessa de vendas. O CTA usa o endereço público do produto.
O anúncio não foi publicado. Ver o planejamento em `../../docs/AQUISICAO.md`.
