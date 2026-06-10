import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AuthScreen from "./AuthScreen";
import RecibosScreen from "./RecibosScreen"; // Importamos la nueva pantalla
import "./styles.css";

const Aplicacion = () => {
  const [estaAutenticado, setEstaAutenticado] = useState(false);

  // Cada vez que el componente se carga, revisamos los bolsillos del usuario
  useEffect(() => {
    const token = localStorage.getItem("token");
    const esInvitado = localStorage.getItem("esInvitado");

    // Si tiene la pulsera (token) o el pase de visitante (invitado), lo dejamos entrar
    if (token || esInvitado) {
      setEstaAutenticado(true);
    }
  }, []);

  // La "puerta giratoria"
  return <>{estaAutenticado ? <RecibosScreen /> : <AuthScreen />}</>;
};

const contenedorHtml = document.getElementById("contenedor");
const root = createRoot(contenedorHtml);
root.render(<Aplicacion />);
