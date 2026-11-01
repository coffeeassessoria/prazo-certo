import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from 'pdf-lib'
import type { IdentidadeDocumento } from '@/lib/pmoc'

const A4: [number, number] = [595.28, 841.89]
const M = 42,
  W = A4[0] - 2 * M,
  TOPO = 665,
  FUNDO = 62
const cor = {
  texto: rgb(0.086, 0.094, 0.114),
  apoio: rgb(0.36, 0.4, 0.46),
  marca: rgb(0.082, 0.318, 0.475),
  borda: rgb(0.83, 0.86, 0.89),
  fundo: rgb(0.95, 0.97, 0.98),
}
const limpar = (v: unknown) =>
  String(v ?? '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF\u2022\u20AC]/g, '?')

/** Base compartilhada por documentos: A4, logo proporcional, cabeçalho e rodapé em todas as páginas. */
export class Timbrado {
  doc: PDFDocument
  normal: PDFFont
  negrito: PDFFont
  page!: PDFPage
  y = TOPO
  private inicio = TOPO
  private identidade: IdentidadeDocumento
  private logo?: Awaited<ReturnType<PDFDocument['embedPng']>>
  private rotulo: string
  private constructor(
    doc: PDFDocument,
    normal: PDFFont,
    negrito: PDFFont,
    identidade: IdentidadeDocumento,
    rotulo: string,
  ) {
    this.doc = doc
    this.normal = normal
    this.negrito = negrito
    this.identidade = identidade
    this.rotulo = rotulo
  }
  static async criar(
    identidade: IdentidadeDocumento,
    rotulo: string,
    logo?: Uint8Array,
  ) {
    const doc = await PDFDocument.create()
    const t = new Timbrado(
      doc,
      await doc.embedFont(StandardFonts.Helvetica),
      await doc.embedFont(StandardFonts.HelveticaBold),
      identidade,
      rotulo,
    )
    if (logo) t.logo = await doc.embedPng(logo)
    t.novaPagina()
    return t
  }
  linhas(texto: unknown, largura = W, tamanho = 10, fonte = this.normal) {
    const resultado: string[] = []
    for (const paragrafo of limpar(texto).split('\n')) {
      let linha = ''
      for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        if (fonte.widthOfTextAtSize(palavra, tamanho) > largura) {
          if (linha) {
            resultado.push(linha)
            linha = ''
          }
          let parte = ''
          for (const letra of palavra) {
            if (
              fonte.widthOfTextAtSize(parte + letra, tamanho) > largura &&
              parte
            ) {
              resultado.push(parte)
              parte = ''
            }
            parte += letra
          }
          linha = parte
        } else if (
          fonte.widthOfTextAtSize(
            linha ? linha + ' ' + palavra : palavra,
            tamanho,
          ) > largura
        ) {
          resultado.push(linha)
          linha = palavra
        } else linha = linha ? linha + ' ' + palavra : palavra
      }
      resultado.push(linha)
    }
    return resultado
  }
  private desenhar(
    texto: string,
    x: number,
    y: number,
    tamanho = 10,
    fonte = this.normal,
    color = cor.texto,
  ) {
    this.page.drawText(limpar(texto), {
      x,
      y,
      size: tamanho,
      font: fonte,
      color,
    })
  }
  novaPagina() {
    if (this.doc.getPageCount() >= 250)
      throw new Error(
        'Documento muito extenso. Reduza as observações ou emita um período menor de execuções.',
      )
    this.page = this.doc.addPage(A4)
    this.y = TOPO
    if (this.logo) {
      const escala = Math.min(90 / this.logo.width, 52 / this.logo.height)
      this.page.drawImage(this.logo, {
        x: M,
        y: 771 - (this.logo.height * escala) / 2,
        width: this.logo.width * escala,
        height: this.logo.height * escala,
      })
    } else {
      this.page.drawRectangle({
        x: M,
        y: 748,
        width: 88,
        height: 48,
        color: cor.fundo,
      })
      this.desenhar('Prestadora', M + 10, 767, 10, this.negrito, cor.marca)
    }
    let y = 795
    for (const l of this.linhas(
      this.identidade.nome || 'Empresa prestadora',
      W - 110,
      12,
      this.negrito,
    )) {
      this.desenhar(l, M + 110, y, 12, this.negrito, cor.marca)
      y -= 15
    }
    const detalhes = [
      this.identidade.documento ? `CNPJ/CPF: ${this.identidade.documento}` : '',
      this.identidade.endereco,
      [this.identidade.telefone, this.identidade.email]
        .filter(Boolean)
        .join(' | '),
    ].filter(Boolean)
    for (const l of this.linhas(detalhes.join('\n'), W - 110, 8)) {
      this.desenhar(l, M + 110, y - 2, 8, this.normal, cor.apoio)
      y -= 10
    }
    const divisoria = Math.min(735, y - 12)
    this.inicio = divisoria - 25
    this.y = this.inicio
    this.page.drawLine({
      start: { x: M, y: divisoria },
      end: { x: A4[0] - M, y: divisoria },
      thickness: 1.2,
      color: cor.marca,
    })
  }
  garantir(altura: number) {
    if (this.y - altura < FUNDO) this.novaPagina()
  }
  titulo(texto: string) {
    this.garantir(45)
    for (const l of this.linhas(texto, W, 22, this.negrito)) {
      this.desenhar(l, M, this.y, 22, this.negrito, cor.marca)
      this.y -= 27
    }
    this.y -= 7
  }
  secao(texto: string) {
    this.garantir(160)
    this.y -= 12
    for (const l of this.linhas(texto, W, 12, this.negrito)) {
      this.desenhar(l, M, this.y, 12, this.negrito, cor.marca)
      this.y -= 16
    }
    this.y -= 6
  }
  paragrafo(texto: unknown, apoio = false) {
    for (const l of this.linhas(texto)) {
      this.garantir(15)
      this.desenhar(
        l,
        M,
        this.y,
        10,
        this.normal,
        apoio ? cor.apoio : cor.texto,
      )
      this.y -= 15
    }
    this.y -= 5
  }
  campo(rotulo: string, valor: unknown) {
    this.paragrafo(
      `${rotulo}: ${String(valor ?? '').trim() || 'Não informado'}`,
    )
  }
  tabela(colunas: { titulo: string; largura: number }[], dados: unknown[][]) {
    const total = colunas.reduce((n, c) => n + c.largura, 0)
    if (Math.abs(total - W) > 2)
      throw new Error('Largura da tabela fora do timbrado A4.')
    const cabecalho = () => {
      this.garantir(52)
      const nomes = colunas.map((c) =>
        this.linhas(c.titulo, c.largura - 12, 8.5, this.negrito),
      )
      const h = Math.max(...nomes.map((n) => n.length)) * 11 + 16
      this.page.drawRectangle({
        x: M,
        y: this.y - h + 10,
        width: W,
        height: h,
        color: cor.fundo,
      })
      let x = M
      nomes.forEach((ls, i) => {
        ls.forEach((l, j) =>
          this.desenhar(l, x + 6, this.y - j * 11, 8.5, this.negrito),
        )
        x += colunas[i].largura
      })
      this.y -= h
    }
    this.garantir(130)
    cabecalho()
    for (const dadosLinha of dados) {
      const celulas = colunas.map((c, i) =>
        this.linhas(dadosLinha[i] ?? '-', c.largura - 12, 9),
      )
      const linhas = Math.max(...celulas.map((c) => c.length))
      let inicio = 0
      const altura = linhas * 12 + 14
      if (altura > this.y - FUNDO && altura < this.inicio - FUNDO - 70) {
        this.novaPagina()
        cabecalho()
      }
      while (inicio < linhas) {
        if (this.y - FUNDO < 28) {
          this.novaPagina()
          cabecalho()
        }
        const quantidade = Math.min(
          linhas - inicio,
          Math.max(1, Math.floor((this.y - FUNDO - 14) / 12)),
        )
        const h = quantidade * 12 + 14
        let x = M
        celulas.forEach((ls, i) => {
          ls.slice(inicio, inicio + quantidade).forEach((l, j) =>
            this.desenhar(l, x + 6, this.y - j * 12 - 4, 9),
          )
          x += colunas[i].largura
        })
        this.page.drawLine({
          start: { x: M, y: this.y - h + 8 },
          end: { x: M + W, y: this.y - h + 8 },
          thickness: 0.5,
          color: cor.borda,
        })
        this.y -= h
        inicio += quantidade
        if (inicio < linhas) {
          this.novaPagina()
          cabecalho()
        }
      }
    }
    this.y -= 10
  }
  async fotografia(bytes: Uint8Array, legenda: string) {
    const img = await this.doc.embedJpg(bytes)
    const escala = Math.min(W / img.width, 250 / img.height)
    const largura = img.width * escala, altura = img.height * escala
    const ls = this.linhas(legenda, W, 9)
    this.garantir(altura + ls.length * 13 + 28)
    this.page.drawImage(img, { x: M + (W - largura) / 2, y: this.y - altura, width: largura, height: altura })
    this.y -= altura + 16
    for (const l of ls) { this.desenhar(l, M, this.y, 9, this.normal, cor.apoio); this.y -= 13 }
    this.y -= 12
  }
  async finalizar() {
    const paginas = this.doc.getPages(),
      fonte = this.normal
    paginas.forEach((p, i) => {
      p.drawLine({
        start: { x: M, y: 46 },
        end: { x: A4[0] - M, y: 46 },
        thickness: 0.5,
        color: cor.borda,
      })
      const texto = limpar(this.rotulo)
      let curto = texto
      while (fonte.widthOfTextAtSize(curto, 8) > W - 85)
        curto = curto.slice(0, -1)
      p.drawText(curto, { x: M, y: 31, size: 8, font: fonte, color: cor.apoio })
      p.drawText(`${i + 1} / ${paginas.length}`, {
        x: A4[0] - M - 40,
        y: 31,
        size: 8,
        font: fonte,
        color: cor.apoio,
      })
    })
    return this.doc.save()
  }
}
