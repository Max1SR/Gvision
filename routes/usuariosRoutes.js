import express from "express";
import Usuario from "../models/Usuario.js";
import jwt from "jsonwebtoken";

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

// Ruta POST para Iniciar Sesión
// Endpoint: http://localhost:3000/api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Proporciona correo y contraseña.' });
    }

    // buscar usuario en la base de datos
    const usuario = await Usuario.findOne({ where: { correo: correo } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Verificamos que la contraseña coincida
    const passwordValida = await usuario.validarPassword(password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }


    // Creacion de JWT: ID + CLAVE + VIDAJWT
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo }, 
      'MI_CLAVE_SECRETA_SUPER_SEGURA_SISISI_123', 
      { expiresIn: '24h' }
    );

    // LE DECIMOS AL FRONT QUE TODO BIEN
    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
  }
});

export default router;
