import prisma from '../src/lib/prisma';

async function main() {
  const records = await prisma.rateLimitState.findMany();
  console.log("Registros atuais de Rate Limit:", records);

  // Limpar bloqueios de teste para permitir testes manuais sem restrição de 2 horas
  const deleted = await prisma.rateLimitState.deleteMany();
  console.log(`✅ Limpos ${deleted.count} registros de bloqueio de rate limit.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
