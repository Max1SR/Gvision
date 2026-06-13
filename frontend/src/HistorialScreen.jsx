import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

const HistorialScreen = ({ alCambiarVista }) => {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null);

  // ESTADOS PARA LA PAGINACION
  const [paginaActual, setPaginaActual] = useState(1);
  const ticketsPorPagina = 9; // limite por pagina

  useEffect(() => {
    const obtenerHistorial = async () => {
      const token = localStorage.getItem("token");
      try {
        const respuesta = await fetch(
          "http://localhost:8080/api/recibos/historial",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await respuesta.json();
        if (respuesta.ok) setHistorial(data.datos);
      } catch (error) {
        console.error("Error al cargar el historial:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerHistorial();
  }, []);

  // LOGICA DE PAGINACION
  const indiceUltimoTicket = paginaActual * ticketsPorPagina;
  const indicePrimerTicket = indiceUltimoTicket - ticketsPorPagina;
  const ticketsActuales = historial.slice(
    indicePrimerTicket,
    indiceUltimoTicket,
  );
  const totalPaginas = Math.ceil(historial.length / ticketsPorPagina);

  // ORDEN DE TABLA PARA EL EXPEDIENTE
  const tabla = useReactTable({
    data: reciboSeleccionado?.ItemRecibos || [],
    columns: [
      { header: "Cant.", accessorKey: "cantidad" },
      { header: "Descripción", accessorKey: "descripcion" },
      { header: "Precio ($)", accessorKey: "precio" },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExportarExcel = () => {
    if (!reciboSeleccionado) return;
    const datosLimpios = reciboSeleccionado.ItemRecibos.map((item) => ({
      Cantidad: item.cantidad,
      Descripción: item.descripcion,
      "Precio Unitario": item.precio,
      Subtotal: item.cantidad * item.precio,
    }));
    datosLimpios.push({
      Cantidad: "",
      Descripción: "TOTAL",
      "Precio Unitario": "",
      Subtotal: reciboSeleccionado.total,
    });
    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Recibo");
    XLSX.writeFile(libro, `Ticket_${reciboSeleccionado.comercio}.xlsx`);
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 animate-pulse">Abriendo archivos...</p>
      </div>
    );
  }

  // MODO EXPEDIENTE
  if (reciboSeleccionado) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <button
            onClick={() => setReciboSeleccionado(null)}
            className="text-slate-500 hover:text-blue-600 font-medium flex items-center gap-2"
          >
            ← Volver a la Lista
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Ticket de {reciboSeleccionado.comercio}
                </h1>
                <p className="text-slate-400 mt-1">
                  {reciboSeleccionado.fecha}
                </p>
              </div>
              <button
                onClick={handleExportarExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow text-sm"
              >
                Descargar Excel
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 bg-slate-100 rounded-xl flex items-center justify-center min-h-[300px] overflow-hidden p-2 border border-slate-200">
                {reciboSeleccionado.url_imagen ? (
                  <img
                    src={`http://localhost:8080${reciboSeleccionado.url_imagen}`}
                    alt="Recibo"
                    className="max-h-[400px] object-contain rounded"
                  />
                ) : (
                  <p className="text-slate-400 text-sm">Sin imagen</p>
                )}
              </div>
              <div className="md:col-span-2 overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    {tabla.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((h) => (
                          <th
                            key={h.id}
                            className="px-6 py-4 text-left text-xs font-bold text-slate-500"
                          >
                            {flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {tabla.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-6 py-4 text-sm text-slate-700"
                          >
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
                <div className="bg-slate-50 p-4 border-t flex justify-end">
                  <span className="text-slate-600 font-bold mr-4">Total:</span>
                  <span className="text-xl font-black text-slate-900">
                    ${reciboSeleccionado.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CUADRICULA DE PAGINACION
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Historial de Recibos
            </h1>
            <p className="text-slate-500 text-sm">
              Explora todos tus tickets procesados ({historial.length} en
              total).
            </p>
          </div>
          <button
            onClick={() => alCambiarVista("dashboard")}
            className="text-blue-600 hover:text-blue-800 font-bold text-sm"
          >
            ← Volver al Dashboard
          </button>
        </div>

        {/* REJILLA DE TARJETAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {ticketsActuales.map((recibo) => (
            <div
              key={recibo.id}
              onClick={() => setReciboSeleccionado(recibo)}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between h-40"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-800 truncate pr-2">
                    {recibo.comercio}
                  </h3>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                    {recibo.ItemRecibos.length} items
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{recibo.fecha}</p>
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className="text-sm text-slate-500 font-medium">
                  Total pagado:
                </span>
                <span className="text-xl font-black text-slate-900">
                  ${recibo.total}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CONTROLES DE PAGINACIoN */}
        {totalPaginas > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => setPaginaActual(paginaActual - 1)}
              disabled={paginaActual === 1}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${paginaActual === 1 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"}`}
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-slate-600">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${paginaActual === totalPaginas ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"}`}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorialScreen;
