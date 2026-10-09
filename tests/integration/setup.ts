// Redireciona o Prisma para o banco de testes antes de qualquer módulo abrir conexão.
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error(
    'Defina TEST_DATABASE_URL com um banco exclusivo de testes (ex.: ...@localhost:5432/ultimogole_test) e aplique as migrations nele antes de rodar "npm run test:integration".',
  );
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === url && process.env.ALLOW_TEST_ON_MAIN_DB !== "true") {
  throw new Error("TEST_DATABASE_URL é igual a DATABASE_URL. Use um banco separado para os testes.");
}
process.env.DATABASE_URL = url;
