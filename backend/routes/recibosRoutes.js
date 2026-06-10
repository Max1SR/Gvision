import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai"; // 1. Importamos la NUEVA librería
import verificarToken from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const formatosPermitidos = ["image/png", "image/jpeg", "image/jpg"];
    if (formatosPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato no permitido. Usa PNG, JPG o JPEG."));
    }
  },
});

// 2. Instanciamos el NUEVO cliente (Asegúrate de poner tu API Key aquí)
const ai = new GoogleGenAI({
  apiKey: "API_CLAVE",
});

router.post(
  "/analizar",
  verificarToken,
  upload.single("imagen"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se detectó ninguna imagen." });
      }

      console.log("Iniciando análisis de imagen con el nuevo @google/genai...");

      // El empaquetado de la imagen funciona exactamente igual
      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

      const prompt = `Analiza este recibo de pago o tabla. Extrae todos los datos que encuentres y devuélvelos estrictamente en este formato JSON:
    {
      "comercio": "Nombre del lugar o Desconocido",
      "total": 0.00,
      "items": [
        { "cantidad": 1, "descripcion": "Nombre del producto", "precio": 0.00 }
      ]
    }`;

      // 3. Ejecutamos el modelo usando la nueva sintaxis (mucho más ordenada)
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [prompt, imagePart],
        config: {
          responseMimeType: "application/json", // Forzamos el JSON puro
        },
      });

      // 4. En la nueva librería, .text es una propiedad, ya no una función con paréntesis
      const responseText = response.text;
      const datosEstructurados = JSON.parse(responseText);

      if (req.esInvitado) {
        console.log("Usuario invitado: No guardaremos esto en la BD.");
      } else {
        console.log(
          `Usuario registrado (${req.usuario.correo}): Guardar en BD pendiente...`,
        );
      }

      res.status(200).json({
        mensaje: "Análisis completado",
        datos: datosEstructurados,
      });
    } catch (error) {
      console.error("Error procesando el recibo:", error);
      if (
        error.message.includes("Formato no permitido") ||
        error.message.includes("File too large")
      ) {
        return res.status(400).json({ error: error.message });
      }
      res
        .status(500)
        .json({
          error:
            "Error interno al analizar la imagen con Inteligencia Artificial.",
        });
    }
  },
);

export default router;
