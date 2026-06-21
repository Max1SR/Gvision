import express from "express";
import multer from "multer"; // el cadenero (middleware)
import { GoogleGenAI } from "@google/genai"; //lib propia de google para usar sus apis
import crypto from "crypto"; // criptografia nativa de node
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

// para almacenar las imagenes de los tickets
const almacenamientoDisco = multer.diskStorage({
  //carpeta destino uploads/
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // CReamos un nombre unico: recibo_TIMESTAMP_ALEATORIO.extension
    const sufijoUnico = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `recibo-${sufijoUnico}${extension}`);
  },
});

// 
const upload = multer({
  //guardamos la imagen en el almacenamiento del dispositivo
  storage: almacenamientoDisco,
  //limite de 5 MB
  limits: { fileSize: 5 * 1024 * 1024 },
  //le decimos a nuestro cadenero la ropa (extensiones) permitida de los asistentes (archivos/imagenes)
  fileFilter: (req, file, cb) => {
    const formatosPermitidos = ["image/png", "image/jpeg", "image/jpg"];
    if (formatosPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato no permitido. Usa PNG, JPG o JPEG."));
    }
  },
});

//Aqui va nuestra API
const ai = new GoogleGenAI({
  apiKey: "apipipipipi",
});


// Metodo Post para CREAR un nuevo recibo 
router.post(
  "/analizar",
  //verificamos si el usuario tiene gafete (token) para pasar
  verificarToken,
  upload.single("imagen"),
  async (req, res) => {
    try {
      //si no se recibe ningun archizo en la peticion se madna error
      if (!req.file) {
        return res.status(400).json({ error: "No se detectó ninguna imagen." });
      }

      console.log("Iniciando analisis de imagen...");
      console.log(`Imagen guardada en: ${req.file.path}`);

      // Leemos a nuestra imagen
      const datosImagenBytes = fs.readFileSync(req.file.path);
      //traducimos la imagen a base64 para la api
      const imagePart = {
        inlineData: {
          data: datosImagenBytes.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

      // Promt muy poderoso
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

      // MANEJAMOS INTENTOS PARA EVITAR RECHAZOS PRO PICOS DE TRAFICO A LA API
      let response;
      let intentos = 0;
      const maxIntentos = 3;
      let exito = false;

      //reintento automatico (3 INTENTOS)
      while (intentos < maxIntentos && !exito) {
        try {
          console.log(
            `Intento ${intentos + 1} de llamar a gemini-2.5-flash...`,
          );

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            //le enviamos nuestra peticion
            contents: [prompt, imagePart],
            config: {
              responseMimeType: "application/json",
            },
          });

          exito = true;
        } catch (apiError) {
          if (apiError.status === 503 || apiError.message.includes("503")) {
            console.log(
              `El servidor esta saturado. Reintentando en 2 segundos...`,
            );
            intentos++;
            if (intentos === maxIntentos) throw apiError;
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            throw apiError;
          }
        }
      }

      //Cachamos la respuesta
      const responseText = response.text;
      // Traducimos el JSON al idioma de javascript
      const datosEstructurados = JSON.parse(responseText);

      // DEFENSA CONTRA FOTOS FALSAS
      if (datosEstructurados.es_recibo_valido === false) {
        console.log("Se detectó una imagen que no es un recibo.");
        return res.status(400).json({
          error:
            "La imagen subida no parece ser un recibo o tabla de gastos valida.",
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
        .toLowerCase() // sin acentos
        .replace(/[^a-z0-9]/g, ""); // Borramos espacios comas y caracteres especiales
      const fechaNorm = datosEstructurados.fecha.trim(); //estandarizamos fecha, eliminando espacios al inicio o final
      const totalNorm = Number(datosEstructurados.total).toFixed(2); //namas mostramos 2 digitos despue sdle puntito

      // hash
      const textoBase = `${comercioNorm}_${fechaNorm}_${totalNorm}_${resumenProductos}`;

      console.log("Texto base estandarizado para Hash:", textoBase);

      // Creamos nuestra firma para nombrar las img
      const firmaDigital = crypto
        .createHash("sha256")
        .update(textoBase)
        .digest("hex");
      
        // Verificamos en la BD si se encuentra un recibo DUPLICADO
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

      // EXTRAEMOS Los DETALLES DE NUESTRO RECIBO
      const itemsConParentesco = datosEstructurados.items.map((item) => ({
        cantidad: item.cantidad,
        descripcion: item.descripcion,
        precio: item.precio,
        ReciboId: nuevoRecibo.id,
      }));

      // GUARDAMOS EN LA BD A LOS ITEMS DEL RECIBO -> (cantidad, descripcion, precio, ReciboId)
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
        error.message.includes("Archivo muy gordo")
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
      include: [{ model: ItemRecibo }], //traer a los hijos (ITEMS)
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


router.delete("/:id", verificarToken, async (req, res) => {
  if (req.esInvitado)
    return res.status(403).json({ error: "Invitados no pueden eliminar" });

  try {
    //recibimos el id del recibo a eliminar
    const reciboId = req.params.id;
    // lo buscamos
    const recibo = await Recibo.findOne({
      where: { id: reciboId, UsuarioId: req.usuario.id },
    });

    // si no lo ecnotramos mandamos error
    if (!recibo) {
      return res
        .status(404)
        .json({ error: "Recibo no encontrado o no autorizado." });
    }

    // si existe la ruta d elaimagen la eliminamos
    if (recibo.url_imagen) {
      const rutaFisica = path.join(process.cwd(), recibo.url_imagen);
      if (fs.existsSync(rutaFisica)) {
        fs.unlinkSync(rutaFisica);
        console.log(`Imagen física eliminada: ${rutaFisica}`);
      }
    }

    // destruimos 👻
    await recibo.destroy();

    res
      .status(200)
      .json({ mensaje: "Recibo y foto eliminados correctamente." });
  } catch (error) {
    console.error("Error al eliminar recibo:", error);
    res.status(500).json({ error: "Error interno al intentar eliminar." });
  }
});


router.put("/:id", verificarToken, async (req, res) => {
  if (req.esInvitado)
    return res.status(403).json({ error: "Invitados no pueden editar" });

  try {
    const reciboId = req.params.id;
    const { comercio, fecha, total } = req.body; // Los datos corregidos que manda el frontend

    // 1. Buscamos el recibo del usuario
    const recibo = await Recibo.findOne({
      where: { id: reciboId, UsuarioId: req.usuario.id },
    });

    if (!recibo) {
      return res
        .status(404)
        .json({ error: "Recibo no encontrado o no autorizado." });
    }

    // actualizar los valores
    recibo.comercio = comercio || recibo.comercio;
    recibo.fecha = fecha || recibo.fecha;
    recibo.total = total || recibo.total;

    //guardamos cambios
    await recibo.save();

    res
      .status(200)
      .json({ mensaje: "Recibo actualizado correctamente.", recibo });
  } catch (error) {
    console.error("Error al actualizar recibo:", error);
    res.status(500).json({ error: "Error interno al intentar actualizar." });
  }
});

export default router;
