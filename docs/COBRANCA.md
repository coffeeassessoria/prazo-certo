# Cobrança e indicações (Stripe)

## Planos (`empresas.plano`)
| Plano | Quem | Acesso |
|---|---|---|
| `assinatura` | Assinou pelo cartão (página de vendas ou Ajustes) | A Stripe controla: `active`, `trialing` e `past_due` liberam; `canceled`, `unpaid` etc. suspendem |
| `cortesia` | Parceiros (ex.: Thermoplus, que indica clientes) | Grátis, nunca bloqueado pela cobrança |
| `mensal` | Cobrança combinada por fora (Pix, boleto) | Só o Admin suspende |

## Fluxo
1. Visitante clica em **Assinar** na página de vendas → `/assinar?ref=CODIGO` cria o Checkout (pede nome da empresa e telefone).
2. Pagamento aprovado → webhook `checkout.session.completed` cria a empresa (`plano=assinatura`, `indicado_por`), o usuário admin com senha provisória e envia o acesso por e-mail.
3. `customer.subscription.*` mantém `assinatura_status`, `assinatura_fim` e `ativo`.
4. O cliente gerencia cartão, faturas e cancelamento no portal da Stripe (Ajustes → Assinatura, ou na tela de acesso suspenso).
5. Indicação: cada empresa tem `codigo_indicacao`; o link é `https://prazo-certo-xi.vercel.app/?ref=CODIGO`. O Admin mostra quem indicou quem.

## Configuração (uma vez)
Na Stripe (comece no modo de teste):
- **Chave secreta** → `STRIPE_SECRET_KEY` (Secret na Vercel).
- **Preço mensal** do produto "Assinatura Prazo Certo" → `STRIPE_PRICE_ID` (`price_...`).
- **Webhook** para `https://prazo-certo-xi.vercel.app/api/stripe/webhook` com os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` → segredo de assinatura em `STRIPE_WEBHOOK_SECRET` (Secret).
- **Portal do cliente** ativado (atualizar forma de pagamento, ver faturas, cancelar).
Republique depois de cadastrar as variáveis. Sem `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID`, a página de vendas volta a usar o WhatsApp ou `NEXT_PUBLIC_LINK_ASSINATURA`.

Teste: cartão `4242 4242 4242 4242`, validade futura, qualquer CVC. Para testar falha de cobrança: `4000 0000 0000 0341`.
