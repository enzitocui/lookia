<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/21c7125a-ba26-497c-9c84-f36409a48c87

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key if you use the AI tools.
3. Refresh outfit images when needed:
   `npm run cargar:fotos`
4. Run the app:
   `npm run dev`

## Imágenes del ropero

Las imágenes se guardan en el disco del servidor, dentro de `uploads/prendas/{id_users}/`, y en PostgreSQL se conserva esa ruta en `prendas.foto`. El servidor solo permite acceder a las imágenes de prendas al usuario autenticado que las posee. Para usar un directorio distinto, configurá `UPLOADS_DIR` en el entorno del servidor; en despliegues con disco efímero, apuntalo a un volumen persistente para conservar las imágenes entre reinicios o despliegues.

The image loader uses Apify only from `scripts/cargarFotos.js`. React reads the generated `src/data/outfits.json` locally and never calls Apify from the browser.
