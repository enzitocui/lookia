<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lookia

Aplicación web de Lookia con React y servidor Express/PostgreSQL.

## Ejecución local

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Configurá `DATABASE_URL` y `NVIDIA_NIM_API_KEY` en `.env` en el servidor. `.env` está excluido de Git; `.env.example` contiene solo valores de referencia.
3. Iniciá el backend y el frontend en terminales separadas:
   `npm run server`
   `npm run dev`
4. Ejecutá las pruebas unitarias del cliente NIM y las validaciones:
   `npm test`
5. Refresh outfit images when needed:
   `npm run cargar:fotos`

La clave de NVIDIA solo se lee desde `process.env.NVIDIA_NIM_API_KEY` en el backend. No la configures con prefijos `VITE_` ni la incluyas en el código del cliente. El generador usa `https://integrate.api.nvidia.com/v1/chat/completions`, modelo `meta/llama-3.2-11b-vision-instruct`, sin streaming y sin enviar imágenes.

Después de configurar la clave, reiniciá el proceso de Express para que tome el nuevo entorno. La ruta autenticada `POST /api/outfits/generate` informa con un error claro si falta la clave; `GET /api/health` solo verifica la base de datos. Las pruebas automatizadas usan respuestas simuladas y no consumen cuota de NVIDIA.

## Imágenes del ropero

Las imágenes se guardan en el disco del servidor, dentro de `uploads/prendas/{id_users}/`, y en PostgreSQL se conserva esa ruta en `prendas.foto`. El servidor solo permite acceder a las imágenes de prendas al usuario autenticado que las posee. Para usar un directorio distinto, configurá `UPLOADS_DIR` en el entorno del servidor; en despliegues con disco efímero, apuntalo a un volumen persistente para conservar las imágenes entre reinicios o despliegues.

## Outfits guardados

`Mis outfits` guarda combinaciones de hasta cuatro prendas existentes por usuario y, para outfits generados, conserva la evaluación original de NVIDIA NIM. Para habilitar la persistencia, configurá `DATABASE_URL` y ejecutá `npm run migrate:outfits` una vez por base de datos. Las migraciones son aditivas e idempotentes; la segunda agrega una columna de evaluación nullable sin modificar ni eliminar los outfits existentes.

The image loader uses Apify only from `scripts/cargarFotos.js`. React reads the generated `src/data/outfits.json` locally and never calls Apify from the browser.
