import React, { useState } from "react";

const AuthScreen = () => {
  // estados para guardar lo que el usuario escribe
  const [esRegistro, setEsRegistro] = useState(false);
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  // entregar el formulario a Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: "Procesando...", tipo: "info" });

    // Elegimos a qué puerta tocar dependiendo si es nuevo o ya tiene cuenta
    const endpoint = esRegistro
      ? "/api/usuarios/registro"
      : "/api/usuarios/login";

    try {
      const respuesta = await fetch(`http://localhost:8080${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "Ocurrió un error en la solicitud");
      }

      if (esRegistro) {
        setMensaje({
          texto: "¡Cuenta creada con éxito! Ahora inicia sesión.",
          tipo: "exito",
        });
        setEsRegistro(false); 
        setPassword(""); 
      } else {
        // guardando el token en su navegador
        localStorage.setItem("token", data.token);
        localStorage.removeItem("esInvitado");
        setMensaje({
          texto: "¡Bienvenido! Entrando al sistema...",
          tipo: "exito",
        });

        // Aquí luego programaremos el cambio a la pantalla principal
        console.log("Token guardado:", data.token);
      }
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
    }
  };

  // pasar sin registrarse
  const handleInvitado = () => {
    localStorage.removeItem("token");
    localStorage.setItem("esInvitado", "true");
    setMensaje({
      texto: "Entrando en modo invitado. No se guardará el historial.",
      tipo: "info",
    });
    console.log("Modo invitado activado");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        {/* Títulos */}
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            {esRegistro ? "Crea tu cuenta" : "Bienvenido de vuelta"}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {esRegistro ? "¿Ya tienes una cuenta? " : "¿Aún no tienes cuenta? "}
            <button
              onClick={() => {
                setEsRegistro(!esRegistro);
                setMensaje({ texto: "", tipo: "" });
              }}
              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              {esRegistro ? "Inicia sesión aquí" : "Regístrate gratis"}
            </button>
          </p>
        </div>

        {/* Alertas de error o éxito */}
        {mensaje.texto && (
          <div
            className={`p-4 rounded-lg text-sm text-center font-medium ${
              mensaje.tipo === "error"
                ? "bg-red-50 text-red-600 border border-red-200"
                : mensaje.tipo === "exito"
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-blue-50 text-blue-600 border border-blue-200"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/*Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow sm:text-sm"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md hover:shadow-lg"
            >
              {esRegistro ? "Registrarme" : "Entrar al Sistema"}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">
                O continúa sin registro
              </span>
            </div>
          </div>

          {/* Botón de Invitado */}
          <div className="mt-6">
            <button
              onClick={handleInvitado}
              className="w-full flex justify-center py-3 px-4 border-2 border-slate-200 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
            >
              Entrar como Invitado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
