"""Motion demonstrativo do Prazo Certo. Capturas reais; textos fora da interface.

Dependências: Pillow e imageio-ffmpeg. Execute: python render.py
"""
from pathlib import Path
import math
import subprocess
import json
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'assets'
W, H, FPS, DURATION = 1080, 1920, 24, 26
BG = '#0f324b'
GOLD = '#d6be86'
WHITE = '#ffffff'
MUTED = '#c3d5e0'
INK = '#0f141a'
FONTS = {}

def font(size, weight=600):
    key = (size, weight)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(str(ASSETS / f'WorkSans-{weight}.ttf'), size)
    return FONTS[key]

def ease(t):
    t = max(0, min(1, t))
    return 1 - (1-t)**3

def text(im, lines, xy, size=72, color=WHITE, weight=600, gap=1.12):
    d = ImageDraw.Draw(im)
    if isinstance(lines, str):
        lines = lines.split('\n')
    x, y = xy
    for line in lines:
        d.text((x, y), line, font=font(size, weight), fill=color, stroke_width=0)
        y += round(size*gap)
    return y

def paragraph(im, value, xy, size=40, color=MUTED, width=896):
    d = ImageDraw.Draw(im)
    lines, current = [], ''
    for word in value.split():
        test = f'{current} {word}'.strip()
        if d.textlength(test, font=font(size, 400)) > width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)
    return text(im, lines, xy, size, color, 400, 1.35)

LOGO = Image.open(ASSETS / 'logo.png').convert('RGBA')
LOGO_SMALL = LOGO.resize((76, 76), Image.Resampling.LANCZOS)

def base():
    im = Image.new('RGB', (W, H), BG)
    im.paste(LOGO_SMALL, (88, 224), LOGO_SMALL)
    text(im, 'Prazo Certo', (186, 231), 46, WHITE, 600)
    d = ImageDraw.Draw(im)
    d.line((88, 1768, 992, 1768), fill='#31546b', width=2)
    text(im, 'Demonstração • dados fictícios', (88, 1794), 26, MUTED, 400)
    return im

def crop_asset(name, rect, width=896):
    im = Image.open(ASSETS / name).convert('RGB').crop(rect)
    return im.resize((width, round(im.height*width/im.width)), Image.Resampling.LANCZOS)

SCREENS = {
    'hook': crop_asset('lista-retornos.png', (16, 275, 512, 490)),
    'cadastro': crop_asset('cadastro-topo.png', (16, 309, 512, 765)),
    'acao': crop_asset('proxima-acao.png', (16, 478, 512, 760)),
    'lista': crop_asset('lista-retornos.png', (16, 275, 512, 970)),
}

def panel(im, screenshot, xy, height=None, scroll=0):
    x, y = (round(v) for v in xy)
    width = screenshot.width
    height = height or screenshot.height
    visible = screenshot.crop((0, round(scroll), width, round(scroll)+height))
    mask = Image.new('L', visible.size)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, width-1, height-1), radius=24, fill=255)
    # O quadro contém somente pixels da captura original.
    im.paste(visible, (x, y), mask)
    ImageDraw.Draw(im).rounded_rectangle((x, y, x+width-1, y+height-1), radius=24, outline='#56768a', width=2)

def scene(index, local):
    im = base()
    # Entrada curta e suave; cada tela permanece legível durante vários segundos.
    dy = round(42*(1-ease(local/.65)))
    if index == 0:
        text(im, 'PARA EMPRESAS DE CLIMATIZAÇÃO', (88, 354+dy), 30, GOLD, 600)
        text(im, ['O orçamento saiu.', 'E o retorno?'], (88, 440+dy), 88, WHITE, 700, 1.14)
        paragraph(im, 'Na correria, a próxima conversa pode ficar para depois.', (88, 694+dy), 42)
        panel(im, SCREENS['hook'], (92, 982+dy))
        text(im, ['Organize as demandas', 'da sua empresa.'], (88, 1480+dy), 48, GOLD, 600)
    elif index == 1:
        text(im, '01 / REGISTRE', (88, 354+dy), 32, GOLD)
        text(im, ['Comece pelo', 'orçamento.'], (88, 424+dy), 80, WHITE, 700)
        paragraph(im, 'Cliente, tipo de demanda e responsável.', (88, 635+dy), 38)
        panel(im, SCREENS['cadastro'], (92, 786+dy))
        # Destaque sobre o campo real do cliente, sem alterar seu conteúdo.
        if local > 1:
            a = ease((local-1)/.45)
            overlay = Image.new('RGBA', im.size)
            od = ImageDraw.Draw(overlay)
            od.rounded_rectangle((118, 1186+dy, 963, 1274+dy), radius=12, outline=(214,190,134,round(220*a)), width=5)
            im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
    elif index == 2:
        text(im, '02 / COMBINE O RETORNO', (88, 354+dy), 32, GOLD)
        text(im, ['Uma próxima ação.', 'Uma data.'], (88, 424+dy), 76, WHITE, 700)
        paragraph(im, 'Deixe o próximo passo registrado.', (88, 624+dy), 40)
        panel(im, SCREENS['acao'], (92, 766+dy))
        overlay = Image.new('RGBA', im.size)
        od = ImageDraw.Draw(overlay)
        alpha = round(165+65*math.sin(local*2.1))
        od.rounded_rectangle((116, 970+dy, 964, 1100+dy), radius=12, outline=(214,190,134,alpha), width=5)
        im = Image.alpha_composite(im.convert('RGBA'), overlay).convert('RGB')
        text(im, ['Cada retorno com', 'um próximo passo.'], (88, 1446+dy), 48, GOLD, 600)
    elif index == 3:
        text(im, '03 / ACOMPANHE', (88, 354+dy), 32, GOLD)
        text(im, ['Veja o que precisa', 'de atenção.'], (88, 424+dy), 76, WHITE, 700)
        paragraph(im, 'Retornos organizados por data.', (88, 624+dy), 40)
        screen = SCREENS['lista']
        offset = (screen.height-868)*ease((local-.7)/4.6)
        panel(im, screen, (92, 746+dy), height=868, scroll=offset)
        text(im, 'Responsável • situação • próxima ação', (88, 1654+dy), 32, GOLD, 400)
    else:
        text(im, 'PRAZO CERTO', (88, 354+dy), 32, GOLD)
        mark = LOGO.resize((178, 178), Image.Resampling.LANCZOS)
        im.paste(mark, (88, 476+dy), mark)
        text(im, ['Mais organização.', 'Mais controle dos', 'seus retornos.'], (88, 736+dy), 76, WHITE, 700, 1.18)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((88, 1182+dy, 988, 1300+dy), radius=16, fill=GOLD)
        cta = 'Peça uma demonstração'
        f = font(46, 600)
        x = (W-d.textlength(cta, font=f))/2
        d.text((x, 1210+dy), cta, font=f, fill=INK)
        text(im, 'prazo-certo-xi.vercel.app', (88, 1368+dy), 40, MUTED, 400)
        paragraph(im, 'Para empresas de climatização de todo o Brasil.', (88, 1490+dy), 40)
    # Progresso discreto: narrativa, não interface do produto.
    return im

STARTS = [0, 4, 9, 14, 20]

def frame(t):
    index = max(i for i, start in enumerate(STARTS) if t >= start)
    local = t-STARTS[index]
    current = scene(index, local)
    if index > 0 and local < .35:
        previous = scene(index-1, STARTS[index]-STARTS[index-1])
        current = Image.blend(previous, current, ease(local/.35))
    # Encerramento permanece visível até o último frame.
    return current

def main():
    times = [1.4, 6.2, 11.2, 17.1, 23.0]
    for i, t in enumerate(times, 1):
        frame(t).save(ROOT / f'cena-{i:02}.png')
    frame(1.4).save(ROOT / 'capa.png')
    grid = Image.new('RGB', (1350, 480), '#e6e9ee')
    for i, t in enumerate(times):
        tile = frame(t).resize((270, 480), Image.Resampling.LANCZOS)
        grid.paste(tile, (i*270, 0))
    grid.save(ROOT / 'roteiro-visual.jpg', quality=92)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    target = ROOT / 'prazo-certo-motion-vertical.mp4'
    args = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'rawvideo',
            '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
            '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-threads', '2', '-movflags', '+faststart', str(target)]
    proc = subprocess.Popen(args, stdin=subprocess.PIPE)
    for n in range(FPS*DURATION):
        proc.stdin.write(frame(n/FPS).tobytes())
        if n % (FPS*5) == 0:
            print(f'Render: {n//FPS}/{DURATION}s', flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError('Falha ao exportar o vídeo')
    manifest = {
        'title': 'Prazo Certo — orçamento e próximo retorno',
        'size': [W, H], 'fps': FPS, 'duration_seconds': DURATION, 'audio': None,
        'video': target.name, 'cover': 'capa.png', 'storyboard': 'roteiro-visual.jpg',
        'brand': {'navy': BG, 'champagne': GOLD, 'font': 'Work Sans'},
        'source': 'Capturas da demonstração real em https://prazo-certo-xi.vercel.app/demo/acompanhamentos',
        'data': 'Fictícios; nenhuma conta operacional ou dado de cliente utilizado.',
        'composition': 'Enquadramentos, deslocamento, realces e texto editorial sobre capturas reais.',
        'scenes': [{'start': a, 'end': b, 'title': title} for a,b,title in [
            (0,4,'O orçamento saiu. E o retorno?'), (4,9,'Comece pelo orçamento.'),
            (9,14,'Uma próxima ação. Uma data.'), (14,20,'Veja o que precisa de atenção.'),
            (20,26,'Peça uma demonstração')]],
        'limitations': 'Primeira versão sem locução ou trilha. Sem promessa de resultado comercial. Anúncio não publicado.'
    }
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f'Concluído: {target}', flush=True)

if __name__ == '__main__':
    main()
