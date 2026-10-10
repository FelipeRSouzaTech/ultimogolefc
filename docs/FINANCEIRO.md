# Financeiro

Controle do caixa do clube, dentro do painel: `/admin/financeiro` (o atalho `/financeiro` leva ao mesmo lugar e
também exige login). Nada do financeiro aparece no portal público.

## Quem acessa

| Função | Consulta | Lança, estorna e configura |
| --- | :-: | :-: |
| Superadministrador | ✔ | ✔ |
| Tesoureiro | ✔ | ✔ |
| Administrador | ✔ | — |
| Editor, Gestor de futebol, Consulta | — | — |

O tesoureiro só vê o financeiro; não altera notícias, futebol, conteúdo nem usuários.
As permissões são verificadas no servidor em cada página, em cada operação e na exportação.

## Telas

- **Resumo** — saldo em caixa, receitas, despesas e resultado do mês, situação das mensalidades, totais por
  categoria e exportação do mês em CSV (abre no Excel).
- **Lançamentos** — receitas e despesas, com filtro por mês e tipo.
- **Mensalidades** — valor e dia de vencimento, geração das cobranças do mês, baixa de pagamento e isenção.
- **Patrocínios e doações** — valor combinado com cada patrocinador ou doador e quanto já foi recebido.
- **Custos por jogo** — despesas ligadas a cada partida, com total e média.

## Regras

- **Valores em centavos.** Tudo é gravado como número inteiro de centavos, para não haver erro de arredondamento.
- **Nada é apagado.** Um lançamento errado é corrigido por **estorno**, com motivo obrigatório: ele continua no
  histórico, marcado como estornado, e deixa de contar no saldo. Toda operação fica na auditoria.
- **Mensalidade paga = receita no caixa.** Dar baixa em uma mensalidade cria automaticamente a receita
  correspondente. Estornar essa receita reabre a mensalidade. Por isso mensalidades não são lançadas à mão em
  Lançamentos.
- **Gerar cobranças não duplica.** Cada jogador tem no máximo uma mensalidade por mês; repetir a geração só
  cria as que faltam (por exemplo, para quem entrou no elenco depois).
- **Pagamento em dobro é bloqueado**, mesmo que duas pessoas registrem ao mesmo tempo.
- **Jogador com mensalidades não é removido** do cadastro, apenas inativado, para preservar o histórico.
- **Recebido de um acordo** é a soma das receitas válidas ligadas a ele; não é digitado.
- **Datas** são tratadas no horário de Brasília. Lançamentos com data futura são recusados.

## Categorias

- Receitas: mensalidade, patrocínio, doação, evento, outras receitas.
- Despesas: arbitragem, campo, uniforme, material esportivo, transporte, inscrição em competição, outras despesas.

As categorias são fixas no código (`modules/finance/rules.ts`). Para incluir outra, é preciso acrescentá-la ali
e no `enum FinanceCategory` do banco, com uma migration.

## Pagamento pela plataforma (preparado, não implementado)

Hoje todos os pagamentos são registrados à mão por quem tem permissão. A estrutura já prevê a integração futura
com um serviço de pagamento (Pix ou cartão):

- cada lançamento tem `source` (`MANUAL` ou `GATEWAY`) e `externalReference`, o identificador da transação no
  serviço, com restrição de unicidade — o mesmo pagamento nunca vira dois lançamentos;
- a baixa de mensalidade (`payDue`) é uma função única e transacional, que a integração poderá chamar quando
  o serviço confirmar o pagamento.

O que a integração ainda vai exigir, e não foi feito: escolha do serviço e conta do clube nele, uma rota para
receber as confirmações (com verificação de assinatura), tela para o jogador pagar, tratamento de estorno e
revisão dos termos e da política de privacidade. Importante: receber pagamentos pelo site caracteriza uso
comercial no plano gratuito da Vercel.

## Privacidade

A situação financeira de cada jogador é dado pessoal. Ela só é visível a quem tem permissão no financeiro,
não aparece no portal e não entra em nenhuma API pública. O arquivo CSV exportado deve ser tratado com o
mesmo cuidado.
