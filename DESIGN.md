# Guia de design — Prazo Certo

Base oficial: [`docs/design/design-system.md`](docs/design/design-system.md) (tokens Emergent) e a
referência visual [`docs/design/referencia-dashboard.png`](docs/design/referencia-dashboard.png).
Todos os tokens estão implementados como variáveis CSS em `app/globals.css`.

## Tokens aplicados
| Token | Valor | Uso no Prazo Certo |
|---|---|---|
| `color.text.primary` | `#16181d` | texto principal |
| `color.text.secondary` | `#6a7181` | texto de apoio, rótulos |
| `color.surface.raised` | `#155179` | marca, botão principal, item ativo |
| `color.surface.muted` | `#ffffff` | cartões, sidebar, campos |
| `color.surface.strong` | `#f3f5f6` | fundo do app, hover |
| `color.border.default` | `#dddfe4` | bordas |
| `font.family.primary` | Work Sans | toda a interface (hospedada no app) |
| `radius.xs / sm / md` | 6px / 12px / pill | botões e campos / cartões / selos |
| `shadow.1 / shadow.2` | sutis | cartões / login |
| `motion` | 150ms / 200ms | só hover e foco |

Cores de status (vermelho vencido, âmbar vence logo, verde em dia) são uma extensão do sistema
e só podem aparecer para indicar status.

## Estrutura
- **Computador:** sidebar fixa à esquerda (marca, menu com ícones, usuário e sair no rodapé),
  igual à referência. Conteúdo com cartões de métrica no topo.
- **Celular (até 860px):** topo branco com a marca e barra de abas fixa embaixo
  (Painel, Clientes, **Novo** em destaque, Histórico, Ajustes). Cara de aplicativo.

## Elemento-assinatura
A **etiqueta de vencimento**: a data "carimbada" numa etiqueta com furo, como a etiqueta de
manutenção presa no equipamento. A cor da etiqueta é o status.

## Regras
- Estados obrigatórios em componentes interativos: padrão, hover, foco visível, ativo, desabilitado, carregando, erro.
- Foco sempre visível (contorno 2px na cor da marca).
- Alvo de toque mínimo de 44px no celular; campos com 16px no celular para não dar zoom no iPhone.
- Respeitar `prefers-reduced-motion` e as áreas seguras do iPhone (notch).
- Botões dizem o que acontece ("Renovar e criar próximo vencimento"), nunca "Enviar".
- Sem CAIXA ALTA em rótulos e sem emojis em títulos.

## PWA
Manifest, ícones (`public/`), modo standalone e cor do tema configurados: no celular, "Adicionar à tela inicial" abre sem barra do navegador.
