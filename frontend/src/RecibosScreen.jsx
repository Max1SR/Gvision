import React, { useState } from "react";

const RecibosScreen = () => {
  //estados previos
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [cargando, setCargando] = useState(false);

  const handleSeleccionArchivo = (e) => {
    setMensaje({ texto: "", tipo: "" }); // Limpiamos mensajes anteriores
    const file = e.target.files[0];

    if (!file) return;

    // Validar el formato
    const formatosPermitidos = ["image/png", "image/jpeg", "image/jpg"];
    if (!formatosPermitidos.includes(file.type)) {
      setMensaje({
        texto: "Solo se admiten formatos de imagen PNG, JPG o JPEG",
        tipo: "error",
      });
      setArchivo(null);
      setVistaPrevia(null);
      e.target.value = ""; // Limpiamos el input
      return;
    }

    // Validar el peso
    const pesoMaximo = 5 * 1024 * 1024; // 5 Megabytes en bytes
    if (file.size > pesoMaximo) {
      setMensaje({
        texto: "Solo se admiten imágenes con un peso máximo de 5MB",
        tipo: "error",
      });
      setArchivo(null);
      setVistaPrevia(null);
      e.target.value = ""; // Limpiamos el input
      return;
    }

    // Si pasa la inspección lo preparamos:
    setArchivo(file);
    // Creamos una URL temporal para mostrar la imagen en pantalla
    setVistaPrevia(URL.createObjectURL(file));
  };

  const handleProcesar = async () => {
    if (!archivo) return;

    setCargando(true);
    setMensaje({
      texto: "Analizando con Geminisito...osiosi",
      tipo: "info",
    });

    // Empaquetamos la imagen para enviarla
    const formData = new FormData();
    formData.append("imagen", archivo);

    // Verificamos si tiene token o es invitado
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`; // Le adjuntamos la pulsera si la tiene
    }

    try {
      const respuesta = await fetch(
        "http://localhost:8080/api/recibos/analizar",
        {
          method: "POST",
          headers: headers, // Aquí va la pulsera VIP si la tiene
          body: formData, // Aquí va la imagen empaquetada
        },
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "Ocurrió un error en el servidor");
      }

      setMensaje({
        texto: "¡Análisis exitoso! Revisa la consola",
        tipo: "exito",
      });
      console.log("Datos extraídos por Gemini:", data.datos);
      setCargando(false);
    } catch (error) {
      setMensaje({
        texto: "Ha ocurrido un error, intente más tarde",
        tipo: "error",
      });
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cabecera del Panel */}
        <div className="bg-slate-900 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">
            Extracción de Recibos
          </h1>
          <p className="text-slate-400 mt-1">
            Sube una imagen y nuestra IA extraerá los datos a Excel.
          </p>
        </div>

        <div className="p-8">
          {/* Alertas */}
          {mensaje.texto && (
            <div
              className={`mb-6 p-4 rounded-lg text-sm font-medium ${
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Columna Izquierda: Controles de Carga */}
            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  onChange={handleSeleccionArchivo}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="mt-4 text-xs text-slate-500">
                  Solo PNG, JPG hasta 5MB
                </p>
              </div>

              <button
                onClick={handleProcesar}
                disabled={!archivo || cargando}
                className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all shadow-md
                  ${
                    !archivo || cargando
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                  }`}
              >
                {cargando ? "Procesando..." : "Analizar Imagen"}
              </button>
            </div>

            {/* Columna Derecha: Vista Previa */}
            <div className="bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px] overflow-hidden">
              {vistaPrevia ? (
                <img
                  src={vistaPrevia}
                  alt="Vista previa del recibo"
                  className="max-h-[300px] object-contain"
                />
              ) : (
                <p className="text-slate-400 text-sm font-medium">
                  Aquí verás tu recibo
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecibosScreen;
