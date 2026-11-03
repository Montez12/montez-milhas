# Montez Milhas

Plataforma em português para monitorar oportunidades de pontos e milhas: transferências bonificadas, passagens prêmio e compra de milhas.

## Stack
- Next.js + TypeScript: aplicação web hospedada na Vercel.
- Supabase/PostgreSQL: banco de dados de ofertas e execuções de coleta.
- Python: worker para coleta e persistência.
- GitHub Actions: agendamento do worker a cada 5 minutos (pode haver atrasos do próprio GitHub).

## Banco de dados (Supabase)
1. Crie um projeto no Supabase.
2. Abra **SQL Editor** e execute o arquivo `supabase/migrations/0001_initial_schema.sql`.
3. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel para leitura pública protegida por RLS.
4. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em **GitHub > Settings > Secrets and variables > Actions** para o worker. A chave service role é secreta e nunca deve ser usada no navegador.

## Execução do worker
O workflow `.github/workflows/collector.yml` está preparado para execução manual e agendamento a cada 5 minutos. Ele ficará em modo de espera até os dois secrets do Supabase serem configurados.

## Desenvolvimento local
```bash
npm install
npm run dev
```
Acesse http://localhost:3000.

## Princípios de coleta
- Não publicar ofertas fictícias nem inferir disponibilidade de assentos.
- Registrar URL de origem e horário de coleta para cada item.
- Deduplicar por fingerprint da fonte, título e categoria.
- Respeitar termos de uso, robots.txt, limites de requisição e APIs oficiais disponíveis.
- Cinco minutos é uma meta de verificação, não uma garantia de execução pontual ou de disponibilidade dos dados.
- Não contornar autenticação, paywalls, CAPTCHA ou controles técnicos.

## Estado atual
A estrutura do banco e a persistência do worker estão preparadas. Os conectores de fontes ainda não foram implementados; portanto, nenhuma promoção real será publicada até que fontes verificáveis sejam integradas e testadas.
