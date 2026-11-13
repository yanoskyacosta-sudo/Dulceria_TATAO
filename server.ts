import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getAllUsers } from './src/db/users.ts';
import { getStoredAppData, saveStoredAppData } from './src/db/store.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Healthcheck endpoint
app.get('/api/health', async (_req, res) => {
  res.json({
    status: 'ok',
    database: 'Cloud SQL PostgreSQL',
    auth: 'Firebase Auth',
    timestamp: new Date().toISOString(),
  });
});

// Synchronize authenticated user with Cloud SQL
app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user || !user.uid || !user.email) {
      return res.status(400).json({ error: 'Invalid user payload' });
    }

    const dbUser = await getOrCreateUser(
      user.uid,
      user.email,
      user.name || (user as any).displayName || ''
    );
    res.json({ success: true, user: dbUser });
  } catch (error: any) {
    console.error('Failed to sync user:', error);
    res.status(500).json({ error: error.message || 'Error synchronizing user' });
  }
});

// Fetch stored app state from Cloud SQL
app.get('/api/data', optionalAuth, async (_req: AuthRequest, res) => {
  try {
    const stored = await getStoredAppData();
    if (!stored || !stored.data) {
      return res.json({ data: null, message: 'No remote state yet' });
    }
    res.json({
      data: stored.data,
      version: stored.version,
      updatedAt: stored.updatedAt,
    });
  } catch (error: any) {
    console.error('Failed to fetch data from Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Database fetch failed' });
  }
});

// Save app state to Cloud SQL
app.post('/api/data', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { appData } = req.body;
    if (!appData) {
      return res.status(400).json({ error: 'Missing appData payload' });
    }

    const userEmail = req.user?.email || 'operador@tatao.cu';
    await saveStoredAppData(appData, userEmail);

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Failed to save data to Cloud SQL:', error);
    res.status(500).json({ error: error.message || 'Database save failed' });
  }
});

// Generate structured AI reports & WhatsApp messages using Gemini
app.post('/api/reports/generate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Falta configurar GEMINI_API_KEY en Settings > Secrets para generar reportes con IA.',
      });
    }

    const { prompt, filtros, contextData } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Debe describir el reporte que desea generar.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = [
      'Eres el analista contable y asistente de reportes de "Dulcería TATAO".',
      'Responde siempre en español claro, profesional y amigable.',
      'Reglas estrictas de formato y cálculo:',
      '1. Usa ÚNICAMENTE los datos reales provistos en el JSON de contexto. Nunca inventes ventas, productos, fechas ni clientes.',
      '2. Cuando el usuario indique un cliente, fecha específica o intervalo de fechas (en el texto o en filtros), filtra exactamente por esas fechas (formato almacenado YYYY-MM-DD, mostrado como dd/mm/aaaa) y suma con exactitud las cantidades e importes de cada línea.',
      '3. Formatea todos los importes numéricos con separador de miles por coma y exactamente dos decimales (ej. 12,450.00). NUNCA uses símbolos de moneda como $, CUP, USD ni EUR.',
      '4. Si el usuario pide un mensaje para WhatsApp (por ejemplo para cobrar o mostrar compras a un cliente), genera en "mensajeWhatsapp" un mensaje listo para copiar o enviar: usa *negritas* de WhatsApp, viñetas claras con cantidades, precio unitario (si aplica), importe por producto o vale, y un *TOTAL A PAGAR* destacado.',
      '5. Excluye el producto "Masas" de reportes comerciales/ventas salvo que el usuario pida explícitamente datos de producción o de Masas.',
      '6. En "columnas", "filas" y "filaTotal", construye una tabla limpia y consistente donde todas las filas tengan exactamente la misma cantidad de elementos que "columnas". Si no hay registros coincidentes, indícalo claramente en "resumenEjecutivo" y "mensajeWhatsapp" y devuelve filas vacías.',
    ].join('\n');

    const userContent = JSON.stringify({
      solicitudUsuario: prompt.trim(),
      filtrosOpcionales: filtros || null,
      datosSistema: contextData || {},
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userContent,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: {
              type: Type.STRING,
              description: 'Título del reporte generado.',
            },
            subtituloPeriodo: {
              type: Type.STRING,
              description: 'Fecha, intervalo de fechas y cliente o alcance del reporte.',
            },
            destinatarioNombre: {
              type: Type.STRING,
              description: 'Nombre del cliente destinatario si aplica (ej. Carlos), o cadena vacía.',
            },
            resumenEjecutivo: {
              type: Type.STRING,
              description: 'Resumen claro de los resultados principales del reporte.',
            },
            columnas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Encabezados de la tabla del reporte.',
            },
            filas: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              description: 'Filas de la tabla del reporte.',
            },
            filaTotal: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Fila final de totales alineada con columnas, o arreglo vacío.',
            },
            mensajeWhatsapp: {
              type: Type.STRING,
              description: 'Mensaje formateado para WhatsApp listo para enviar al destinatario.',
            },
            notas: {
              type: Type.STRING,
              description: 'Notas o aclaraciones relevantes (o cadena vacía).',
            },
          },
          required: [
            'titulo',
            'subtituloPeriodo',
            'destinatarioNombre',
            'resumenEjecutivo',
            'columnas',
            'filas',
            'filaTotal',
            'mensajeWhatsapp',
            'notas',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'La IA devolvió una respuesta vacía.' });
    }

    const parsed = JSON.parse(rawText);
    res.json({ report: parsed });
  } catch (error: any) {
    console.error('Error generating AI report:', error);
    const msg = String(error?.message || '');
    const status = error?.status || error?.statusCode;

    if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      return res.status(403).json({
        error: 'La clave GEMINI_API_KEY no es válida o no tiene permisos. Verifica la configuración en Settings > Secrets.',
      });
    }
    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        error: 'Se alcanzó el límite temporal de solicitudes a la IA. Intenta nuevamente en unos segundos.',
      });
    }
    res.status(500).json({ error: msg || 'Error al generar el reporte con IA.' });
  }
});

// Vite dev server integration vs Production static serving
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const listenPort = Number(PORT) || 3000;
  app.listen(listenPort, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${listenPort} in ${isProd ? 'production' : 'development'} mode`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
