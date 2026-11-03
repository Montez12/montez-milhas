# Montez Milhas

Plataforma em português para monitorar oportunidades de pontos e milhas: transferências bonificadas, passagens prêmio e compra de milhas.

## Stack inicial
- Next.js + TypeScript para a aplicação web.
- Worker Python para coleta e normalização de fontes públicas.
- Estrutura preparada para persistência em PostgreSQL/Supabase.
- Deploy planejado na Vercel (web) e execução agendada do worker em serviço compatível.

## Desenvolvimento local
```bash
npm install
npm run dev
```
Acesse http://localhost:3000.

## Princípios de coleta
- Não publicar ofertas fictícias nem inferir disponibilidade de assentos.
- Registrar URL de origem e horário de coleta para cada item.
- Deduplicar por fonte, identificador e conteúdo normalizado.
- Respeitar termos de uso, robots.txt, limites de requisição e APIs oficiais disponíveis.
- Cinco minutos é uma meta de verificação, não uma garantia de que a fonte publique ou permita obter dados nesse intervalo.
- Não contornar autenticação, paywalls, CAPTCHA ou controles técnicos.

## Estado atual
A interface inicial está criada. Os conectores ainda precisam ser configurados e validados antes de exibir ofertas reais. Nenhuma oferta demonstrativa é apresentada como promoção ativa.

Consulte `.env.example`. Nunca faça commit de tokens ou chaves privadas.
