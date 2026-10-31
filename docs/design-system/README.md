# Prazo Certo · Design System 2.0

Padrão oficial de interface do Prazo Certo, validado em 29/10/2026.
Toda tela nova **precisa** seguir este guia. Na dúvida, copie um padrão que já existe.

| Onde | O quê |
|---|---|
| `styles/tokens.css` | Tokens (cores claro + escuro, tipo, espaço, raio, sombra, movimento). Fonte única de verdade. |
| `app/globals.css` | Estilos dos componentes. Só usa `var(--pc-*)`. |
| `components/ui/` | Componentes React prontos (lista abaixo). |
| `/design-system` (no app) | Catálogo vivo: todos os componentes renderizados, nos dois temas. |
| `docs/design-system/fonte-validada/` | Arquivos originais do DS aprovado (referência, não editar). |

---

## 1. Conceito

Ferramenta de trabalho que tira peso da cabeça do gestor. Visual **calmo, sólido e técnico**: nada pisca, tudo informa.
A **etiqueta com furo** é o coração: transforma a data em objeto físico, fácil de reconhecer em campo.
Azul profundo é a âncora de confiança; neutros para leitura longa; **cor só para status**.

Três princípios: **Confiável** (sem ruído nem gradiente) · **Óbvio** (toque grande, rótulos que dizem o que fazem) · **Calmo** (muito espaço, pouca cor).

## 2. Tokens

Sempre por variável, nunca hex solto:

```css
color: var(--pc-text);            /* texto */
color: var(--pc-text-secondary);  /* apoio */
background: var(--pc-surface);    /* cartões */
background: var(--pc-bg);         /* fundo do app */
border-color: var(--pc-border);
background: var(--pc-brand-700);  /* ação principal */
```

**Status (exclusivo para status, nunca decoração):**

| Status | Fundo | Borda | Texto | Ícone/ponto |
|---|---|---|---|---|
| Vencido | `--pc-danger-bg` | `--pc-danger-border` | `--pc-danger-text` | `--pc-danger-icon` |
| Vence logo | `--pc-warning-bg` | `--pc-warning-border` | `--pc-warning-text` | `--pc-warning-icon` |
| Em dia | `--pc-success-bg` | `--pc-success-border` | `--pc-success-text` | `--pc-success-icon` |
| Informativo | `--pc-info-bg` | `--pc-info-border` | `--pc-info-text` | `--pc-brand-700` |

**Tipografia:** Work Sans (400/500/600/700), hospedada no app. Escala `--pc-text-xs` 12 · `sm` 14 · `base` 16 · `md` 18 · `lg` 20 · `xl` 24 · `2xl` 30 · `3xl` 36.
**Espaço:** base 4 (`--pc-space-1` 4px … `--pc-space-16` 64px).
**Raio:** `xs` 6 (botão, campo) · `sm` 8 (etiqueta) · `md` 12 (item, métrica) · `lg` 16 (cartão) · `xl` 24 (modal) · `pill`.
**Movimento:** 150/250/350ms, `--pc-ease-out`. Respeitar "reduzir movimento" (já global).

### Tema escuro
Ativado por `data-theme="dark"` no `<html>`. Segue o sistema por padrão; o usuário troca no botão do topo ou em Ajustes (salvo no navegador).
Os tokens mudam sozinhos. Regras críticas do DS: primário no escuro = `#4a9ac4` com texto `#0f141a`; status no escuro usam **fundo escuro** (`#2a1515`, `#2a2010`, `#12261a`), nunca fundo claro.

## 3. Componentes

| Componente | Uso | Código |
|---|---|---|
| Botão | primário, secundário, ghost, perigo; `peq` 32 / padrão 40 / `grande` 44 | `<button className="btn sec">` |
| Botão de envio | mostra "Salvando…" com spinner e `aria-busy` | `<BotaoEnviar>Salvar</BotaoEnviar>` |
| Confirmação | modal do DS antes de ação destrutiva | `<Confirmar titulo="Excluir vencimento?" texto=… destaque=…>Excluir</Confirmar>` (dentro do `<form>`) |
| Campo | label 14 medium + input 16px/44px + `.dica` ou `.erro-campo` | `<div className="campo">` |
| Upload | área tracejada → linha do arquivo | `<Upload name="anexo" />` |
| Métrica | número 28 bold + rótulo com ponto + apoio | `<Metrica tom="vencido" valor={12} rotulo="Vencidos" apoio="3 clientes" />` |
| **Etiqueta** | data com furo, cor por status | `<Etiqueta data="2026-11-09" status="vencido" />` |
| Item da lista | etiqueta + título + meta + selo | `<ItemLinha item={…} hoje={…} />` |
| Selo | pill de status com ponto | `<Selo tom="ok">Em dia</Selo>` |
| Aviso | info / ok / erro / atencao | `<Aviso tipo="erro" titulo="…">texto</Aviso>` |
| Cabeçalho | título 30 bold + sub com ícone + ação | `<Cabecalho titulo sub subIcone acao voltar />` |
| Tabela | cabeçalho 12px caixa alta, linha 44px | `<div className="tabela-wrap"><table>` |
| Vazio | ícone com furo + título + texto + ação | `<Vazio titulo texto>…</Vazio>` |
| Toast | confirmação após ação, some em 5s | na action: `redirect(\`/?${qsToast('PMOC renovado', 'Próximo em 30/11/2026.')}\`)` |
| Logo | etiqueta azul + visto verde | `<Logo sub="Empresa" />` / `<LogoMarca grande />` |
| Tema | alternar claro/escuro | `<TemaToggle comTexto />` |

Estados obrigatórios em todo interativo: padrão, hover, foco visível (anel), ativo, desabilitado, carregando, erro.

## 4. Layout

| Faixa | Comportamento |
|---|---|
| Mobile `< 768px` | sem sidebar, padding 16, **barra de abas 72px** + safe-area, botão "Novo" (56px) ao centro; ação do cabeçalho vai para baixo do título em largura total |
| Tablet `768–1024` | sidebar vira **gaveta** (botão de menu no topo) |
| Desktop `> 1024` | header 64 + **sidebar fixa 280px** + conteúdo até 1280px com padding 32 |

Grids: métricas 4 colunas (2×2 no mobile) · listas sempre largura total · formulários 1 coluna no mobile, 2 para campos curtos no desktop (`.linha`).
Uma tela nova dentro do app só precisa ficar em `app/(app)/…` — o `layout.tsx` já aplica a `Casca` (header, sidebar, abas, toasts).

## 5. Ícones e logo
Lucide (`lucide-react`), traço 2px. 20px padrão, 16px em meta e botões, 24px na barra de abas. **Nunca ícone sozinho**: sempre com texto ou `aria-label`.
Logo: etiqueta com furo e visto. Não rotacionar, visto sempre verde `#15803d`, sem sombra colorida.

## 6. Tom de voz
Direto, humano, sem tecnicês. Frases normais (sem CAIXA ALTA em rótulos), verbo no início.

| Contexto | Evitar | Usar |
|---|---|---|
| Botões | Salvar, Finalizar | Renovar e criar próximo vencimento · Concluir sem renovar |
| Erros | Campo obrigatório | Informe a data de vencimento para continuar |
| Vazios | Nenhum dado encontrado | Nenhum vencimento por aqui. Que bom — ou cadastre o primeiro para começar a controlar. |
| Toasts | Operação realizada com sucesso | PMOC do Frigorífico Boi Bom renovado. Próximo vencimento em 30/11/2026. |

## 7. Checklist de qualidade (toda tela nova)
- [ ] Contraste AA em textos e status, **nos dois temas**
- [ ] Foco visível com Tab em todos os interativos
- [ ] Alvos de toque ≥ 44px no mobile
- [ ] Campos com fonte 16px (sem zoom no iPhone)
- [ ] Labels associadas aos campos (`htmlFor`/`id`)
- [ ] Erro com texto explicativo, não só cor
- [ ] Carregando com `aria-busy` e texto
- [ ] Safe-area no topo e nas abas
- [ ] Respeita "reduzir movimento"
- [ ] Cores de status só para status
- [ ] Etiqueta legível a 1 m
- [ ] **Um** botão primário por tela
- [ ] Conferido no catálogo `/design-system` se surgiu componente novo

## 8. Como criar uma tela nova (receita)
```tsx
// app/(app)/minha-tela/page.tsx
import { FileText } from 'lucide-react'
import { Cabecalho } from '@/components/ui/Cabecalho'
import { Vazio } from '@/components/ui/Vazio'

export default async function MinhaTela() {
  return (
    <>
      <Cabecalho titulo="Título da tela" subIcone={<FileText size={14} aria-hidden />} sub="O que esta tela resolve"
        acao={<a href="/..." className="btn">Ação principal</a>} />
      <div className="card">…</div>
      <Vazio titulo="Nada por aqui ainda" texto="Diga o que fazer em seguida." />
    </>
  )
}
```
Componente novo? Crie em `components/ui/`, estilize em `globals.css` só com tokens, adicione ao catálogo `/design-system` e a esta tabela.

## Demandas de climatização

`ItemLinha` também aceita `etapa_demanda`, `categoria_demanda`, `responsavel_nome` e `proxima_acao`.
`AcompanhamentoForm` atende cadastro/edição e `modo="contato"`; usa os campos, botões e avisos do DS.
Exemplos interativos em `/demo/acompanhamentos` e seção Demandas do catálogo.
