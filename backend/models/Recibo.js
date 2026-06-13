import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Usuario from "./Usuario.js";

const Recibo = sequelize.define("Recibo", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  comercio: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "Desconocido",
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
  firma_digital: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  url_imagen: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fecha: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "Sin fecha",
  },
});

Usuario.hasMany(Recibo, { onDelete: "CASCADE" });
Recibo.belongsTo(Usuario);

export default Recibo;
