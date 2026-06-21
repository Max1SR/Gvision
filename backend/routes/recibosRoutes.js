import express from "express";
import multer from "multer"; // el cadenero (middleware)
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import verificarToken from "../middleware/auth.js";

import path from "path"; // pa manejar extensiones
import fs from "fs"; // pa crear carpetas

import Recibo from "../models/Recibo.js";
import ItemRecibo from "../models/ItemRecibo.js";

const router = express.Router();

//verificamos si al carpeta uploads existe
const carpetaUploads = "./uploads";
if (!fs.existsSync(carpetaUploads)) {
  fs.mkdirSync(carpetaUploads);
}

const almacenamientoDisco = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // CReamos un nombre unico: recibo_TIMESTAMP_ALEATORIO.extensión
    const sufijoUnico = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `recibo-${sufijoUnico}${extension}`);
  },
});

const upload = multer({
  storage: almacenamientoDisco,
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

const ai = new GoogleGenAI({
  apiKey: "apipipipipi",
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
      console.log(`Imagen guardada físicamente en: ${req.file.path}`);

      const datosImagenBytes = fs.readFileSync(req.file.path);
      const imagePart = {
        inlineData: {
          data: datosImagenBytes.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

      const prompt = `Analiza la imagen adjunta. 
    Primero, determina si la imagen es realmente un recibo de compra, factura o tabla de gastos.
    Si NO es un recibo (por ejemplo, es una persona, un animal, un paisaje o texto sin sentido), devuelve estrictamente este JSON:
    { "es_recibo_valido": false }

    Si SÍ es un recibo, extrae los datos y devuelve estrictamente este JSON:
    {
      "es_recibo_valido": true,
      "comercio": "Nombre del lugar o Desconocido",
      "fecha": "DD/MM/YYYY o Desconocida",
      "total": 0.00,
      "items": [
        { "cantidad": 1, "descripcion": "Nombre del producto", "precio": 0.00 }
      ]
    }`;

      let response;
      let intentos = 0;
      const maxIntentos = 3;
      let exito = false;

      //reintento automatico
      while (intentos < maxIntentos && !exito) {
        try {
          console.log(
            `Intento ${intentos + 1} de llamar a gemini-2.5-flash...`,
          );

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [prompt, imagePart],
            config: {
              responseMimeType: "application/json",
            },
          });

          exito = true;
        } catch (apiError) {
          if (apiError.status === 503 || apiError.message.includes("503")) {
            console.log(
              `El servidor está saturado (503). Reintentando en 2 segundos...`,
            );
            intentos++;
            if (intentos === maxIntentos) throw apiError;
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            throw apiError;
          }
        }
      }

      const responseText = response.text;
      const datosEstructurados = JSON.parse(responseText);

      // DEFENSA CONTRA FOTOS FALSAS
      if (datosEstructurados.es_recibo_valido === false) {
        console.log("Se detectó una imagen que no es un recibo.");
        return res.status(400).json({
          error:
            "La imagen subida no parece ser un recibo o tabla de gastos válida.",
        });
      }

      if (req.esInvitado) {
        console.log(
          "Usuario invitado: No guardaremos esto en la base de datos.",
        );
        return res.status(200).json({
          mensaje: "Análisis completado (Modo Invitado)",
          datos: datosEstructurados,
        });
      }

     console.log(`Verificando duplicados para el usuario: ${req.usuario.id}`);

     // estandarizacion de productos
     const resumenProductos = datosEstructurados.items
       .map((item) => {
         return item.descripcion
           .toLowerCase() // a minúsculas
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "") // sin acentos 
           .replace(/[^a-z0-9]/g, ""); // Borramos espacios comas y caracteres especiales
       })
       .sort() // ordenamos alfabeticamente pro si gemini modifica el orden
       .join("");

     // estandarizacion de comercio y total
     const comercioNorm = datosEstructurados.comercio
       .toLowerCase()
       .replace(/[^a-z0-9]/g, "");
     const fechaNorm = datosEstructurados.fecha.trim();
     const totalNorm = Number(datosEstructurados.total).toFixed(2);

     // hash
     const textoBase = `${comercioNorm}_${fechaNorm}_${totalNorm}_${resumenProductos}`;

     console.log("Texto base estandarizado para Hash:", textoBase);

     const firmaDigital = crypto
       .createHash("sha256")
       .update(textoBase)
       .digest("hex");

     const reciboDuplicado = await Recibo.findOne({
       where: { firma_digital: firmaDigital, UsuarioId: req.usuario.id },
     });

     // SI EL TICKET ES UN DUPLICADO
     if (reciboDuplicado) {
       console.log(
         "¡Recibo duplicado detectado! Eliminando archivo físico sobrante.",
       );

       // Verificamos que el archivo realmente exista antes de intentar borrarlo para evitar crasheos
       if (req.file && fs.existsSync(req.file.path)) {
         fs.unlinkSync(req.file.path);
       }

       return res.status(200).json({
         mensaje: "Este recibo ya había sido registrado anteriormente.",
         datos: datosEstructurados,
       });
     }

      const rutaPublicaImagen = `/uploads/${req.file.filename}`;

      //guardar en bd con modelo Recibo
      const nuevoRecibo = await Recibo.create({
        comercio: datosEstructurados.comercio,
        total: datosEstructurados.total,
        fecha: datosEstructurados.fecha,
        url_imagen: rutaPublicaImagen,
        UsuarioId: req.usuario.id,
        firma_digital: firmaDigital,
      });

      const itemsConParentesco = datosEstructurados.items.map((item) => ({
        cantidad: item.cantidad,
        descripcion: item.descripcion,
        precio: item.precio,
        ReciboId: nuevoRecibo.id,
      }));

      await ItemRecibo.bulkCreate(itemsConParentesco);
      console.log("¡Recibo nuevo e ítems guardados con éxito!");

      return res.status(200).json({
        mensaje: "Análisis completado y guardado en historial",
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

      //eliminar cualquier basura (imagen) si el proceso se interrumpe por algun error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        error:
          "Error interno al analizar la imagen con Inteligencia Artificial.",
      });
    }
  },
);

//  GET http://localhost:8080/api/recibos/historial
router.get("/historial", verificarToken, async (req, res) => {
  if (req.esInvitado) {
    return res
      .status(203)
      .json({ mensaje: "Los invitados no tienen historial.", datos: [] });
  }

  try {
    const historial = await Recibo.findAll({
      where: { UsuarioId: req.usuario.id },
      include: [{ model: ItemRecibo }], //traer a los hijos
      order: [["createdAt", "DESC"]], // ordenar por mas recientes
    });

    res.status(200).json({ datos: historial });
  } catch (error) {
    console.error("Error al obtener el historial:", error);
    res.status(500).json({
      error: "No se pudo recuperar el historial de la base de datos.",
    });
  }
});

export default router;
