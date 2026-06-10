import express from "express";
import sequelize from "./config/database.js";
import Usuario from "./models/Usuario.js";
import usuariosRoutes from "./routes/usuariosRoutes.js"; 
import recibosRoutes from "./routes/recibosRoutes.js";
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
    await sequelize.sync({ force: false });
    console.log("Modelos sincronizados con MySQL.");
    
    app.listen(puerto, () => {
      console.log("Servidor Express corriendo en el puerto 8080");
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
};

iniciarServidor();
