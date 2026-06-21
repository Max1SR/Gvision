import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

const RecibosScreen = ({ alVerDashboard, esInvitado, onLogout }) => {
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [cargando, setCargando] = useState(false);

  const [datosEstructurados, setDatosEstructurados] = useState(null);

  const columnas = [
    { header: "Cant.", accessorKey: "cantidad" },
    { header: "Descripción del Producto", accessorKey: "descripcion" },
    { header: "Precio ($)", accessorKey: "precio" },
  ];

  // instanciamos tabla con los datos de las columnas
  const tabla = useReactTable({
    data: datosEstructurados?.items || [],
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleSeleccionArchivo = (e) => {
    setMensaje({ texto: "", tipo: "" });
    const file = e.target.files[0];
    if (!file) return;

    const formatosPermitidos = ["image/png", "image/jpeg", "image/jpg"];
    if (!formatosPermitidos.includes(file.type)) {
      setMensaje({ texto: "Solo PNG, JPG o JPEG", tipo: "error" });
      setArchivo(null);
      setVistaPrevia(null);
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ texto: "Peso máximo de 5MB", tipo: "error" });
      setArchivo(null);
      setVistaPrevia(null);
      e.target.value = "";
      return;
    }

    setArchivo(file);
    setVistaPrevia(URL.createObjectURL(file));
    setDatosEstructurados(null); // Limpiamos la tabla anterior si sube una foto nueva
  };

  const handleProcesar = async () => {
    if (!archivo) return;
    setCargando(true);
    setMensaje({
      texto: "Analizando con Inteligencia Artificial...",
      tipo: "info",
    });

    const formData = new FormData();
    formData.append("imagen", archivo);

    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const respuesta = await fetch(
        "http://localhost:8080/api/recibos/analizar",
        {
          method: "POST",
          headers: headers,
          body: formData,
        },
      );

      if (respuesta.status === 401 || respuesta.status === 403) {
        onLogout(); // Expulsamos al usuario a la pantalla de login
        return;
      }

      const data = await respuesta.json();
      if (!respuesta.ok)
        throw new Error(data.error || "Ocurrió un error en el servidor");

      setMensaje({ texto: "¡Análisis exitoso!", tipo: "exito" });

      // Guardamos los datos reales en nuestro estado para que la tabla reaccione
      setDatosEstructurados(data.datos);
      setCargando(false);
    } catch (error) {
      setMensaje({ texto: error.message, tipo: "error" });
      setCargando(false);
    }
  };

  const handleExportarExcel = () => {
    if (!datosEstructurados || !datosEstructurados.items.length) return;

    // Preparamos los datos limpiando los nombres de las columnas para el excel
    const datosLimpios = datosEstructurados.items.map((item) => ({
      Cantidad: item.cantidad,
      "Descripción del Producto": item.descripcion,
      "Precio Unitario ($)": item.precio,
      "Subtotal ($)": item.cantidad * item.precio,
    }));

    // agregamos una fila extra al final para el total general en el Excel
    datosLimpios.push({
      Cantidad: "",
      "Descripción del Producto": "TOTAL",
      "Precio Unitario ($)": "",
      "Subtotal ($)": datosEstructurados.total,
    });

    // Convertimos el JSON a una hoja de datos
    const hoja = XLSX.utils.json_to_sheet(datosLimpios);

    // creamos el libro de trabajo 
    const libro = XLSX.utils.book_new();

    // metemos la hoja dentro del libro
    XLSX.utils.book_append_sheet(libro, hoja, "Detalle de Recibo");

    // nombre para el archivo
    const nombreArchivo = `Recibo_${datosEstructurados.comercio.replace(/\s+/g, "_")}.xlsx`;

    //descarga automatica
    XLSX.writeFile(libro, nombreArchivo);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">
              Extracción de Recibos
            </h1>
            <p className="text-slate-400 mt-1">
              Sube una imagen y nuestra IA extraerá los datos.
            </p>
          </div>

          <div className="p-8">
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
                    ${!archivo || cargando ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"}`}
                >
                  {cargando ? "Procesando..." : "Analizar Imagen"}
                </button>
              </div>

              <div className="bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px] overflow-hidden">
                {vistaPrevia ? (
                  <img
                    src={vistaPrevia}
                    alt="Recibo"
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

        {datosEstructurados && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-slate-800">
                Comercio detectado:{" "}
                <span className="text-blue-600">
                  {datosEstructurados.comercio}
                </span>
              </h2>

              <button
                onClick={handleExportarExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow transition-all hover:shadow-md text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exportar a Excel
              </button>
            </div>

            {/* Renderizado de la Tabla*/}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  {tabla.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {tabla.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-slate-700"
                        >
                          {/* Si es la columna del precio, le ponemos formato de moneda */}
                          {cell.column.id === "precio"
                            ? `$${cell.getValue()}`
                            : flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* fila final para el total */}
            <div className="mt-6 flex justify-end">
              <div className="bg-slate-100 py-3 px-6 rounded-lg border border-slate-200">
                <span className="text-slate-600 font-medium mr-4">
                  Total Extraído:
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  ${datosEstructurados.total}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecibosScreen;
