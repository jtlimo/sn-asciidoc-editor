# Regras de desenvolvimento

## Princípios

Seguir estritamente YAGNI e KISS, tanto no código quanto na comunicação.

- **Código:** implementar só o que o problema atual exige. Escolher a solução mais simples que funcione. Nada de abstração, configuração ou generalização "para o futuro".
- **TDD:** primeiro escrever o teste e ver ele falhar. Depois escrever a implementação mínima que faz ele passar.
- **Comunicação:** respostas curtas e diretas. Sem opções que não serão seguidas e sem explicação que não foi pedida.
- **Idioma:** todo código e comentários devem estar em inglês.
- **Design:** baixo acoplamento, alta coesão e software sempre dividido em camadas (domínio, controller, service, repository, config).
- **Docs:** todos os documentos ficam na pasta docs, crie e atualize o que existe lá.

## Testes

- **Unidade:** obrigatório para todo código que envolve regra de negócio.
- **Integração:** obrigatório para toda API.
- **End-to-end:** ao fechar uma feature, atualizar a collection do Postman; se essa não existir, crie.

O mais importante: o código é feito e mantido por seres humanos, então sempre escrever de forma legível, pois humanos irão revisar.
