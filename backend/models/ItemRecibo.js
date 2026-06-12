import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Recibo from "./Recibo.js"; // el papa

const ItemRecibo = sequelize.define("ItemRecibo", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.0,
  },
});

// Un Recibo tiene muchos Items de compra
Recibo.hasMany(ItemRecibo, { onDelete: "CASCADE" });
ItemRecibo.belongsTo(Recibo);

export default ItemRecibo;
