import { Sequelize } from "sequelize";

const sequelize = new Sequelize("tu_base_de_datos", "root", "tu_contrasena", {
  host: "localhost",
  dialect: "mysql", 
  logging: false, 
});


const probarConexion = async () => {
  try {
    await sequelize.authenticate();
    console.log("Conexión a MySQL establecida correctamente.");
  } catch (error) {
    console.error("No se pudo conectar a la base de datos:", error);
  }
};

probarConexion();

export default sequelize;
