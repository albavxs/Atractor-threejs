# Atrator de Aizawa — Three.js & Next.js

Este projeto é uma visualização 3D interativa do **Atrator de Aizawa**, refatorado para melhor legibilidade, modularidade e suporte mobile.

## 🚀 Como Rodar

1.  **Instale as dependências:**
    ```bash
    npm install
    ```
2.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
3.  **Acesse:** [http://localhost:3000](http://localhost:3000)

## 🛠️ Refatoração Realizada

- **Modularização:** Lógica matemática separada em `src/utils/aizawa.ts`.
- **Componentização:** Cena 3D encapsulada em `src/components/AizawaScene.tsx`.
- **UI/HUD:** Interface minimalista seguindo a imagem de referência.
- **Mobile First:** Suporte total a touch e responsividade.
- **Infraestrutura:** Adição de Prettier e correção de tipos TypeScript.

## 🕹️ Controles

- **Mouse/Touch:** Arraste para rotacionar o atrator.
- **Scroll/Pinch:** Zoom in/out.
- **Double Click/Tap:** Reseta a visualização e rotação automática.
