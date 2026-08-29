# Pixel Play Arcade

Quero criar um "Fliperama Digital" — um web app estilo fliperama retrô para eu jogar ROMs de jogos clássicos que eu já possuo. Requisitos:

1. Tela inicial com visual de fliperama/arcade retrô (neon, pixel art, cores vibrantes).
2. Tela de "Meus Jogos": lista dos ROMs que eu já subi, cada um como um "cartucho"/capa clicável.
3. Tela de upload: permite eu enviar meus próprios arquivos de ROM (ex: .nes, .gba, .snes, .zip), salvos no Supabase Storage. Adicionar um aviso simples de que o usuário deve subir apenas ROMs de jogos que possui.
4. Tela de jogo: integrar a biblioteca EmulatorJS (via CDN/script) para carregar e rodar o ROM selecionado direto no navegador, com HUD por cima mostrando nome do jogo, botão de tela cheia, botão de reiniciar e botão de voltar para a lista.
5. Suporte a controles: teclado no desktop e controles virtuais na tela para mobile/touch.
6. Guardar metadados dos jogos (nome, sistema/console, data de upload) numa tabela no banco.

Pode usar o Supabase nativo do projeto para banco e storage. Comece pela estrutura geral (telas + navegação) e depois eu vou pedir os ajustes finos.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://retro-arcade5.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7e6a8a9-dc5e-427b-8c52-8c7aa7071169).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
