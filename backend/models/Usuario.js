import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import sequelize from "../config/database.js";

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, 
      validate: {
        isEmail: true, 
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    // Las reglas de negocio de la tabla
    tableName: "usuarios",
    timestamps: true, 

    hooks: {
      // Justo antes de crear el usuario en la BD, interceptamos la contraseña y la encriptamos
      beforeCreate: async (usuario) => {
        if (usuario.password) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
      // Si el usuario actualiza su contraseña, también la volvemos a encriptar
      beforeUpdate: async (usuario) => {
        if (usuario.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, salt);
        }
      },
    },
  },
);

// Agregamos un método personalizado para comparar contraseñas al iniciar sesión
Usuario.prototype.validarPassword = async function (passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

export default Usuario;
