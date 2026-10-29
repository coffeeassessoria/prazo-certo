# Guia de design — Prazo Certo

## Conceito
**Etiqueta de manutenção.** Todo técnico de climatização conhece a etiqueta presa no equipamento
com a data da próxima manutenção. Cada vencimento no sistema é uma etiqueta: a data "carimbada"
em destaque à esquerda, com o furo da etiqueta. A cor da etiqueta é o status. Esse é o único
elemento "chamativo" do sistema; todo o resto é calmo e funcional.

## Cores
| Token | Hex | Uso |
|---|---|---|
| Aço | `#2c4a5e` | marca, topo, botões principais |
| Tinta | `#16222c` | texto principal |
| Tinta 2 | `#55697a` | texto secundário |
| Gelo | `#edf2f5` | fundo do app |
| Papel | `#ffffff` | cartões e formulários |
| Vermelho | `#c8372b` | **só** vencido |
| Âmbar | `#e9a514` | **só** vence em breve |
| Verde | `#2a8053` | **só** em dia / renovar |

Regra: vermelho, âmbar e verde nunca aparecem como decoração. Se está colorido, é status.

## Tipografia
- **Barlow** (texto e interface): família inspirada em placas e sinalização técnica.
- **Barlow Semi Condensed** (títulos, datas e números): números altos e legíveis, cabem na etiqueta.
- Fontes hospedadas no próprio app (pacote @fontsource), sem depender do Google Fonts.
- Campos de formulário sempre com 16px (evita o zoom automático do iPhone).
- Texto em frases normais: sem CAIXA ALTA em rótulos, sem emojis em títulos.

## Cara de aplicativo no celular
- Barra de abas fixa embaixo (Painel, Clientes, **Novo** em destaque, Histórico, Ajustes).
- Alvos de toque de no mínimo 44px.
- Respeita o "notch" e a barra do iPhone (`safe-area-inset`).
- Instalável na tela inicial (manifest + ícones + modo standalone, sem barra do navegador).
- Cor do topo igual à barra de status do sistema (`theme-color`).
- Sem destaque azul ao tocar, sem "puxar" a página além do limite.

## Escrita
- Botões dizem exatamente o que acontece: "Renovar e criar próximo vencimento", não "Enviar".
- Vazio vira convite para agir: "Nenhum vencimento aqui. Cadastre o primeiro…"
- Erros dizem o que houve e como resolver, sem pedir desculpas.

## Ícone
Etiqueta branca com furo e visto verde, sobre fundo aço. Arquivos em `public/`.
