# Financeiro

Portal financeiro do clube, em `/financeiro`. É uma área própria, separada do painel administrativo (`/admin`),
com menu, tela de entrada e cabeçalho próprios. Por baixo, usa os mesmos recursos do painel: as mesmas contas
de usuário, o mesmo login e sessão, as mesmas permissões, a mesma auditoria e os mesmos componentes de tela.
Nada do financeiro aparece no portal público.

- Entrada: `/financeiro/login` (a mesma conta e senha do painel).
- Os usuários continuam sendo criados no painel, em Usuários, por um superadministrador.
- Quem tem acesso aos dois portais alterna pelos botões "Financeiro" (no painel) e "Painel" (no financeiro),
  sem precisar entrar de novo.

## Quem acessa

| Função | Consulta | Lança, estorna e configura |
| --- | :-: | :-: |
| Superadministrador | ✔ | ✔ |
| Tesoureiro | ✔ | ✔ |
| Administrador | ✔ | — |
| Editor, Gestor de futebol, Consulta | — | — |

O tesoureiro usa só o portal financeiro: não entra no painel administrativo e, se tentar, é levado ao financeiro.
Quem não tem permissão e tenta abrir `/financeiro` vê um aviso de falta de acesso.
As permissões são verificadas no servidor em cada página, em cada operação e na exportação.

## Telas

- **Resumo** — saldo em caixa, receitas, despesas e resultado do mês, situação das mensalidades, totais por
  categoria e exportação do mês em CSV (abre no Excel).
- **Lançamentos** — receitas e despesas, com filtro por mês e tipo.
- **Folha de pagamento** — pagamentos aos jogadores, à comissão técnica e outras despesas relacionadas às
  partidas. O formulário segue o modelo da despesa e a categoria define o segundo campo: **Jogadores** (jogador
  do elenco, pelo apelido esportivo), **Comissão técnica** (membro cadastrado em Comissão Técnica) ou **Outras
  despesas** (tipo de serviço: Fotógrafo, Arbitragem, Transmissão ou Outros, com o tipo digitado). Todos podem
  ser ligados à competição e à partida. Mostra os pagamentos do mês.
- **Mensalidades** — mensalidade paga pelos **diretores** (cadastrados no painel, em Diretores). Cada
  mensalidade é incluída pelo formulário **Nova mensalidade**: diretor, valor e situação — **Paga** (data e forma
  do pagamento; já entra no caixa) ou **Em aberto** (vencimento; a baixa é feita depois). A tela mostra o mês
  escolhido e o resumo do mês (recebido, a receber, isentas e diretores ativos sem mensalidade). Mensalidade não
  paga pode ser isenta ou excluída.
- **Patrocínios e doações** — valor combinado com cada patrocinador ou doador e quanto já foi recebido.
- **Custos por jogo** — despesas ligadas a cada partida, com total e média.

## Regras

- **Valores em centavos.** Tudo é gravado como número inteiro de centavos, para não haver erro de arredondamento.
- **Nada é apagado.** Um lançamento errado é corrigido por **estorno**, com motivo obrigatório: ele continua no
  histórico, marcado como estornado, e deixa de contar no saldo. Toda operação fica na auditoria.
- **Mensalidade paga = receita no caixa.** Dar baixa em uma mensalidade cria automaticamente a receita
  correspondente. Estornar essa receita reabre a mensalidade. Por isso mensalidades não são lançadas à mão em
  Lançamentos.
- **Quem paga mensalidade são os diretores.** Eles são cadastrados no painel administrativo, em Diretores
  (nome, função, situação e foto). Só quem está com situação **Ativo** entra na geração das cobranças;
  afastados, licenciados, inativos e desligados ficam de fora.
- **Gerar cobranças não duplica.** Cada diretor tem no máximo uma mensalidade por mês; repetir a geração só
  cria as que faltam (por exemplo, para quem entrou na diretoria depois).
- **Folha = despesa na categoria selecionada.** Todo registro da folha entra no caixa como despesa em
  "Jogadores", "Comissão técnica" ou "Outras despesas" e aparece também em Lançamentos, onde pode ser
  estornado. Pagamentos a jogadores e à comissão não são lançados pela tela de Lançamentos, para ficarem sempre
  ligados a quem recebeu. "Outras despesas" continua disponível em Lançamentos; só as lançadas pela folha (com
  tipo de serviço) aparecem na folha.
- **Partida e competição coerentes.** Se o pagamento informa as duas, a partida precisa ser daquela competição.
- **Pagamento em dobro é bloqueado**, mesmo que duas pessoas registrem ao mesmo tempo.
- **Histórico preservado.** Jogador ou membro da comissão com pagamentos na folha não é removido, apenas inativado;
  diretor com mensalidades não é removido, muda de situação (por exemplo, para Desligado).
- **Recebido de um acordo** é a soma das receitas válidas ligadas a ele; não é digitado.
- **Datas** são tratadas no horário de Brasília. Lançamentos com data futura são recusados.

## Categorias

- Receitas: mensalidade, patrocínio, doação, evento, outras receitas.
- Despesas: jogadores e comissão técnica (folha de pagamento), arbitragem, campo, uniforme, material esportivo, transporte,
  inscrição em competição, outras despesas.

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

Os valores pagos a cada jogador e a situação das mensalidades de cada diretor são dados pessoais. Eles só são visíveis a quem tem permissão no financeiro,
não aparecem no portal e não entram em nenhuma API pública. O arquivo CSV exportado deve ser tratado com o
mesmo cuidado.

## Diretores e a página "Clube"

O cadastro de Diretores (painel → Diretores) é interno e serve de base para as mensalidades. Ele é separado
da lista de diretoria exibida na página pública "Clube", que continua sendo editada em Institucional e só
mostra quem autorizou a divulgação. Hoje as duas listas são mantidas à parte.
