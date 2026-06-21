import express from "express";
import sequelize from "./config/database.js";
import Usuario from "./models/Usuario.js";
import usuariosRoutes from "./routes/usuariosRoutes.js";
import recibosRoutes from "./routes/recibosRoutes.js";
import Recibo from "./models/Recibo.js";
import ItemRecibo from "./models/ItemRecibo.js";
import url from "url";
import path from "path";

const app = express();
const puerto = 8080;

app.use(express.json());
app.use(express.static("public"));

//Usamos la ruta Usuarios
app.use("/api/usuarios", usuariosRoutes);
// usamos la ruta recibos
app.use("/api/recibos", recibosRoutes);
// carpeta uploads accesible desde la URL del navegador (revisar)
app.use("/uploads", express.static("uploads"));

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.resolve("public", "index.html"));
});

const iniciarServidor = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("Modelos sincronizados con MySQL.");

    try {
      //buscar si ya existe
      const adminExistente = await Usuario.findOne({
        where: { correo: "admin" },
      });

      if (!adminExistente) {
        //lo creamos
        await Usuario.create({
          correo: "admin",
          password: "1234",
        });

        console.log("Usuario admin creado con exito!");
      } else {
        console.log("El ususario admin ya estaba en la bd");
      }
    } catch (error) {
      console.error("Error al intentar crear al admin:", error);
    }

    app.listen(puerto, () => {
      console.log("Servidor Express corriendo en el puerto 8080");
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
};

iniciarServidor();
