# Aafiya Health

An independent Arabic-first health-information app. Its catalog contains two
chest X-ray classifiers and additional research ONNX models, with an optional
Gemini text assistant.

The `/clinical-review` page summarizes registered model metrics, supported
classes, scope notes, validation dimensions, and data handling for clinician
review. It does not claim clinical or regulatory approval.

## Privacy and scope

- X-ray images are decoded and classified in the browser with ONNX Runtime Web.
  The application does not upload image bytes to Gemini or store them.
- Submitted chat text and history are sent to Gemini to generate a response.
  For image explanations, only the model name, class, and score are sent; image
  bytes stay in the browser. The API key stays in the server environment.
- The classifiers cover only the labels listed in the selector. They are
  experimental models, not clinically validated diagnostic devices. A model
  score is not a confirmed medical probability.
- Additional trained artifacts remain unavailable until they have a verified
  web inference path and their required inputs are represented correctly.

## Run locally

1. Use Node.js 20.19+ or 22.12+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY` to enable chat.
4. Run `npm run dev`.

The Gemini API key is read by the Vite development server and is not exposed as
a browser environment variable. Without a key, local image classification still
works, but Gemini requests return an explicit configuration error.

## Models

The application expects these ONNX exports under `public/models/`:

- `covid19_radiography.onnx`
- `tb_chest_radiography.onnx`

They are exported from the existing EfficientNet-B0 PyTorch state dictionaries
in the original project. Conversion is a development-time step only; neither
Python nor FastAPI is required to build or run the deployed web application.
The source dataset, checkpoints, and other original project files are not
copied or modified by this web app.

The model test accuracies shown in the UI (85.7% and 96.8%) are the recorded
held-out metrics for their respective datasets, not clinical performance
claims.

Additional browser models are exported as ONNX and have explicit research
limitations: diabetes, heart, kidney, liver, skin lesions, and symptoms. Sepsis
is not enabled because its artifact metadata does not approve deployment.
DDXPlus is not enabled because no saved model weight is available.

## Deploy to Vercel

Set `GEMINI_API_KEY` in the Vercel project's server-side environment variables.
The `/api/gemini` function streams text responses; static model inference runs
in the visitor's browser.

## Development checks

```sh
npm run test
npm run lint
npm run build
```
