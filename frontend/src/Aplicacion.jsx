import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AuthScreen from "./AuthScreen";
import RecibosScreen from "./RecibosScreen";
import DashboardScreen from "./DashboardScreen"; 
import HistorialScreen from "./HistorialScreen";
import "./styles.css";

const Aplicacion = () => {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [vistaActual, setVistaActual] = useState("escaner"); //escaner o dashboard
  const [esInvitado, setEsInvitado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const invitado = localStorage.getItem("esInvitado");

    if (token) {
      setEstaAutenticado(true);
      setEsInvitado(false);
    } else if (invitado) {
      setEstaAutenticado(true);
      setEsInvitado(true);
    }
  }, []);

  // redireccion pa quine no esta logueado
  if (!estaAutenticado) {
    return <AuthScreen />;
  }

  return (
    <div className="relative">
      {/* MENU EXCLUSIVO PA USUARIOS REGISTRADOS */}
      {!esInvitado && (
        <div className="bg-slate-900 border-b border-slate-800 px-8 py-3 flex justify-end gap-6 text-sm">
          <button
            onClick={() => setVistaActual("escaner")}
            className={`font-semibold transition-colors ${vistaActual === "escaner" ? "text-blue-400" : "text-slate-400 hover:text-white"}`}
          >
            Área de Carga
          </button>
          <button
            onClick={() => setVistaActual("dashboard")}
            className={`font-semibold transition-colors ${vistaActual === "dashboard" ? "text-blue-400" : "text-slate-400 hover:text-white"}`}
          >
            Mi Dashboard
          </button>
        </div>
      )}

      {/* RENDERIZADO DE PANTALLAS */}
      {vistaActual === "dashboard" && !esInvitado ? (
        <DashboardScreen alCambiarVista={setVistaActual} />
      ) : vistaActual === "historial_completo" && !esInvitado ? (
        <HistorialScreen alCambiarVista={setVistaActual} />
      ) : (
        <RecibosScreen
          alVerDashboard={() => setVistaActual("dashboard")}
          esInvitado={esInvitado}
        />
      )}
    </div>
  );
};

const contenedorHtml = document.getElementById("contenedor");
const root = createRoot(contenedorHtml);
root.render(<Aplicacion />);
