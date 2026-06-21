import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import AuthScreen from "./AuthScreen";
import RecibosScreen from "./RecibosScreen";
import DashboardScreen from "./DashboardScreen";
import HistorialScreen from "./HistorialScreen";
import "./styles.css";

const Aplicacion = () => {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [vistaActual, setVistaActual] = useState("escaner");
  const [esInvitado, setEsInvitado] = useState(false);
  const [mensajeExpirado, setMensajeExpirado] = useState("");

  // verificamos sesion al cargar pagina por primera vez
  useEffect(() => {
    verificarSesion();
  }, []);

  // validar token
  const verificarSesion = () => {
    const token = localStorage.getItem("token");
    const invitado = localStorage.getItem("esInvitado");
    if (token) {
      setEstaAutenticado(true);
      setEsInvitado(false);
    } else if (invitado) {
      setEstaAutenticado(true);
      setEsInvitado(true);
    }
  };

  // verificar entrada al sistema
  const handleLoginSuccess = () => {
    setMensajeExpirado(""); 
    verificarSesion(); 
  };


// manjamos el estado de salida de la session
  const handleLogout = (porExpiracion = false) => {
    localStorage.removeItem("token");
    localStorage.removeItem("esInvitado");
    setEstaAutenticado(false);
    setEsInvitado(false);
    setVistaActual("escaner"); 

    if (porExpiracion) {
      setMensajeExpirado(
        "Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente.",
      );
    } else {
      setMensajeExpirado("");
    }
  };

  if (!estaAutenticado) {
    return (
      <>
        {mensajeExpirado && (
          <div className="bg-red-500 text-white text-center py-3 px-4 text-sm font-bold shadow-md z-50 relative animate-fade-in">
            {mensajeExpirado}
          </div>
        )}
        {/* Enviamos la confirmacion de login al compoonente Authscreen */}
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <div className="relative">
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-3 flex justify-between items-center text-sm shadow-md z-10 relative">
        {esInvitado ? (
          <span className="text-slate-400 font-medium tracking-wide">
            Modo Invitado (El historial no se guardará)
          </span>
        ) : (
          <div className="flex gap-6">
            <button
              onClick={() => setVistaActual("escaner")}
              className={`font-semibold transition-colors ${vistaActual === "escaner" ? "text-blue-400" : "text-slate-400 hover:text-white"}`}
            >
              Área de Carga
            </button>
            {!esInvitado && (
              <button
                onClick={() => setVistaActual("dashboard")}
                className={`font-semibold transition-colors ${vistaActual === "dashboard" ? "text-blue-400" : "text-slate-400 hover:text-white"}`}
              >
                Mi Dashboard
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => handleLogout()}
          className="text-red-400 hover:text-red-300 font-bold transition-colors bg-slate-800 hover:bg-slate-700 py-1.5 px-4 rounded-md"
        >
          {esInvitado ? "Salir y Registrarse →" : "Cerrar Sesión"}
        </button>
      </div>

      {vistaActual === "dashboard" && !esInvitado ? (
        <DashboardScreen
          alCambiarVista={setVistaActual}
          onLogout={() => handleLogout(true)}
        />
      ) : vistaActual === "historial_completo" && !esInvitado ? (
        <HistorialScreen
          alCambiarVista={setVistaActual}
          onLogout={() => handleLogout(true)}
        />
      ) : (
        <RecibosScreen
          alVerDashboard={() => setVistaActual("dashboard")}
          esInvitado={esInvitado}
          onLogout={() => handleLogout(true)}
        />
      )}
    </div>
  );
};

const contenedorHtml = document.getElementById("contenedor");
const root = createRoot(contenedorHtml);
root.render(<Aplicacion />);
