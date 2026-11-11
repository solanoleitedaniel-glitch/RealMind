# RealMind

App calmo de ancoragem. A câmera, o áudio, o diário e os contatos ficam neste aparelho. Não faz diagnóstico e não substitui um profissional de saúde.

## O que tem aqui

- Teste de realidade visual, com pessoas, cachorros e gatos, e teste de áudio.
- Diário privado e apoio imediato.
- Relaxamento com chuva, vento, água, floresta e harpa suave.
- Jogos sem ranking: velha, damas, tétris calmo e labirinto.

## Código

| Pasta | Conteúdo |
| --- | --- |
| `src/routes` | Telas |
| `src/lib` | Sons, jogos, diário e cobrança da Play Store |
| `src/components` | Layout e tela de assinatura |
| `android` | Projeto Android (Capacitor) |
| `public` | Ícone e arquivos públicos |

A chave de upload da Play Store não está neste repositório.

## Rodar no navegador

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080`.

## Android

O APK de teste abre direto. O pacote da loja é `com.realmind.app`. A assinatura na Play Console usa o código `realmind_mensal`: R$ 5,99 por mês, com oferta de 7 dias, configurada na própria Play Store.
