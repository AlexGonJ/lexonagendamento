# Segurança do Supabase

## Modelo de acesso

O login de profissionais e clientes é gerido pela aplicação Next.js. As sessões **não** são identidades do Supabase Auth. Todas as operações de negócio passam pelas rotas e Server Actions, que usam Prisma no servidor. O Supabase Storage é usado no servidor com a `SUPABASE_SERVICE_ROLE_KEY` apenas para imagens públicas.

A migração `20260924_supabase_rls` ativa RLS em todas as tabelas do schema Prisma, incluindo a tabela de relação de serviços e profissionais. A migração `20260924_prisma_migration_table_privileges` protege também a tabela interna `_prisma_migrations`. Elas removem os privilégios de `anon`, `authenticated` e `PUBLIC` e adicionam uma política restritiva de negação para os dois papéis públicos. Assim, uma chave pública ou uma sessão do Supabase Auth não concede acesso direto a dados de estabelecimentos, clientes, pagamentos, tokens ou logs. O proprietário das tabelas usado pelo Prisma e o `service_role` continuam a ignorar RLS: **RLS não substitui as verificações de sessão, papel e `tenantId` no servidor**.

A migração também remove concessões padrão para novos objetos criados por `postgres` no schema `public`. Toda nova migração que criar tabelas deve ativar RLS e definir os privilégios pretendidos. Funções e views criadas no futuro também exigem revisão antes de qualquer concessão para a API.

A migração `20260925_revoke_rls_auto_enable_execute` retira de `PUBLIC`, `anon` e `authenticated` a permissão de executar a função `public.rls_auto_enable()` quando ela existir. O gatilho `ensure_rls` continua associado à função para ativar RLS na criação de tabelas.

## Storage

O bucket `public-images` é público porque a aplicação grava URLs públicas para logos, capas, serviços e avatares. O script `scripts/configure-supabase-storage.mjs` cria ou atualiza o bucket pela API de Storage, limitando cada novo objeto a 5 MB e aos tipos MIME JPEG, PNG e WebP. Se já existir um bucket privado com esse nome, o script falha para evitar expor seu conteúdo sem revisão. Uma política restritiva impede `anon` e `authenticated` de criar, listar, alterar ou apagar objetos nesse bucket, mesmo que exista outra política permissiva. A leitura pelo URL público continua disponível: não armazene documentos ou dados privados nesse bucket.

A `SUPABASE_SERVICE_ROLE_KEY` deve ficar apenas nas variáveis secretas do servidor. O módulo `src/lib/supabase.ts` é marcado como `server-only`, e o cliente não persiste sessões. Mantenha a URL do projeto pública somente onde necessária; jamais use o prefixo `NEXT_PUBLIC_` para a service role ou para a senha do banco.

## Aplicação

1. Confirme o backup e o destino das variáveis `DATABASE_URL` e `DIRECT_URL`.
2. Execute `npx prisma migrate status` para ver as migrações pendentes. `migrate deploy` aplica **todas** as migrações pendentes, na ordem, incluindo as que não são de segurança.
3. Execute `npx prisma migrate deploy` no ambiente desejado. A migração de segurança usa uma transação para não deixar as tabelas parcialmente protegidas em caso de erro.
4. Com as variáveis do mesmo ambiente carregadas, execute `node scripts/configure-supabase-storage.mjs` (ou `node --env-file=.env scripts/configure-supabase-storage.mjs` localmente). O script é idempotente.
5. No painel Supabase, desative a **Data API** se nenhuma integração usar REST, GraphQL ou RPC. A aplicação atual usa Prisma e Storage. Confirme integrações externas antes de desligá-la. Essa configuração não é alterada pela migração SQL.
6. Revise permissões de projetos, chaves secretas, backups e políticas de buckets adicionais no painel Supabase. A migração cobre os objetos Prisma e a política do bucket `public-images`, não objetos criados fora deste repositório.

## Verificação após aplicar

Com as variáveis do ambiente carregadas, execute `node scripts/verify-supabase-security.mjs` (ou `node --env-file=.env scripts/verify-supabase-security.mjs` localmente). O comando deve terminar com código zero, listas vazias para `noRls`, `apiAccess` e `noDenyPolicy`, e `functionProtected: true`.

No SQL Editor do projeto, execute:

```sql
-- Deve retornar zero linhas para todas as tabelas públicas.
SELECT c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
       has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE') AS anon_write,
       has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') AS authenticated_write
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND (NOT c.relrowsecurity
       OR has_table_privilege('anon', c.oid, 'SELECT')
       OR has_table_privilege('authenticated', c.oid, 'SELECT')
       OR has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE')
       OR has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE'));

-- Deve mostrar a política restritiva em cada tabela Prisma.
SELECT tablename, policyname, permissive, roles
FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'deny_direct_client_access'
ORDER BY tablename;

-- Deve mostrar o bucket público, os limites e a política de objetos.
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id = 'public-images';
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname = 'public_images_server_only';
```

Teste também um upload autenticado pelo painel da aplicação, a URL pública da imagem, o login e uma reserva. Uma consulta direta à tabela `Tenant` pela chave pública deve falhar por falta de permissão. Se aparecer uma tabela nova no primeiro relatório, proteja-a antes de expô-la.
