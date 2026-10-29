# dayz-map

---

### Status e atualização do projeto

- **Situação:** Estado de estabilidade não verificado; documentação inicial pendente.
- **Última revisão desta nota:** 29/10/2026.
- **Última alteração do código:** não verificada nesta revisão; consulte o histórico de commits para a data exata.

> Esta nota registra a revisão da documentação, não certifica testes nem uma versão estável.

## Atualização de desenvolvimento — 29/10/2026

As alterações abaixo foram realizadas na branch experimental `dev/commented-code`, sem modificar a versão principal (`main`).

### Reorganização do código

- Reformatado o conteúdo anteriormente compactado em linhas extensas, distribuindo as instruções para facilitar leitura e manutenção.
- Separada a estrutura do projeto em três arquivos: `index.html` (interface), `style.css` (aparência e responsividade) e `app.js` (lógica da aplicação).
- Atualizadas as referências no HTML para carregar os arquivos CSS e JavaScript externos.
- Preservadas as funcionalidades existentes nesta etapa; **ainda não foi realizada uma validação completa no navegador**.

### Próximas etapas planejadas

1. Testar o funcionamento de marcadores, camadas, rotas, zoom, coordenadas e salvamento após a separação dos arquivos.
2. Estruturar o suporte independente aos quatro mapas oficiais: **Chernarus, Livonia, Sakhal e Nasdara**.
3. Verificar dimensões e referências cartográficas de cada mapa antes de calibrar suas coordenadas.
4. Implementar importação de dados JSON e manter os registros de cada mapa separados.
5. Avaliar posteriormente sincronização segura entre integrantes de um esquadrão.

> **Situação:** reorganização estrutural concluída na branch de teste; suporte aos quatro mapas e calibração ainda não implementados.
