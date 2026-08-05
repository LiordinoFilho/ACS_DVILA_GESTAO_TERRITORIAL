# Diretrizes do Projeto - ACS D'Vila (Agente Aguiar)

## Fluxo de Trabalho e Regras de Colaboração
1. **Análise Proativa e Sugestão Previa**: Antes de executar grandes modificações estruturais, novos módulos ou algoritmos complexos, o assistente deve analisar a viabilidade, verificar se há dependências ou lacunas arquiteturais e sugerir as melhorias no chat para aprovação prévia do usuário.
2. **Respeito à Intenção e Qualidade**: Manter o escopo focado nas necessidades reais dos Agentes Comunitários de Saúde (ACS), garantindo alta velocidade de navegação, usabilidade em telas de celular/computador e integridade total dos dados.

## Arquitetura de Memória e Alta Performance (Tripla Camada)
- **Camada 1 (RAM)**: Todas as alterações de estado do usuário devem ser atualizadas instantaneamente na memória RAM (`cacheStorageService`) para navegação e digitação sem travamento (0ms de latência).
- **Camada 2 (Disco do Dispositivo)**: Persistência local assíncrona em `LocalStorage` e `IndexedDB` com debouncing de 500ms para não bloquear a UI.
- **Camada 3 (Backup de Servidor)**: Sincronização em segundo plano via `/api/cache/backup` para resguardo dos cadastros de residências e munícipes.

## Regras de Sincronização e Conectividade
- Preservar a integração direta com Google Contatos (Munícipes) e Google Agenda (Visitas).
- Garantir resiliência no preenchimento automático de endereços por CEP via provedores múltiplos (ViaCEP, BrasilAPI, AwesomeAPI).
- Manter suporte ao modo off-line e segurança por código PIN/LGPD.
