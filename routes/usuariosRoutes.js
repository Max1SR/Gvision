import express from "express";
import Usuario from "../models/Usuario.js";

const router = express.Router();

// Ruta POST para registrar un nuevo usuario
// Endpoint: http://localhost:8080/api/usuarios/registro
router.post("/registro", async (req, res) => {
  try {
    // Deconstruccion de los datos que envía el front
    const { correo, password } = req.body;

    // Validación que no vengan vacíos
    if (!correo || !password) {
      return res
        .status(400)
        .json({ error: "El correo y la contraseña son obligatorios." });
    }


    // encripta la clave automáticamente que se creo en Usuario.js con Bcrypt
    const nuevoUsuario = await Usuario.create({
      correo: correo,
      password: password,
    });

    // Respondemos al frontend con éxito
    res.status(201).json({
      mensaje: "Usuario creado exitosamente",
      usuario: {
        id: nuevoUsuario.id,
        correo: nuevoUsuario.correo,
      },
    });
  } catch (error) {
    // Manejo del error: Coprreo ya refgistrado en bd
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ error: "Este correo ya se encuentra registrado." });
    }

    // Cualquier otro error del servidor
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Ocurrió un error interno en el servidor." });
  }
});

export default router;
