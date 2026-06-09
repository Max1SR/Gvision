import express from "express";
import sequelize from "./config/database.js";
import Usuario from "./models/Usuario.js";
import usuariosRoutes from "./routes/usuariosRoutes.js"; 

const app = express();
const puerto = 8080;
const url = require("url");

app.use(express.json());

//Usamos la ruta Usuarios
app.use("/api/usuarios", usuariosRoutes);

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const iniciarServidor = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log("Modelos sincronizados con MySQL.");

    app.listen(puerto, () => {
      console.log("Servidor Express corriendo en el puerto 3000");
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
};

iniciarServidor();
