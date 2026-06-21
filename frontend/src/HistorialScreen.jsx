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
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEditados, setDatosEditados] = useState({
    comercio: "",
    fecha: "",
    total: "",
  });

  // pa eliminar (crud)
  const handleEliminar = async (id) => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas eliminar este recibo permanentemente? Esta acción destruirá la foto original.",
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const respuesta = await fetch(`http://localhost:8080/api/recibos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (respuesta.ok) {
        setHistorial(historial.filter((r) => r.id !== id));
        setReciboSeleccionado(null); 
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  // pa editar (crud)
  const activarEdicion = () => {
    setDatosEditados({
      comercio: reciboSeleccionado.comercio,
      fecha: reciboSeleccionado.fecha,
      total: reciboSeleccionado.total,
    });
    setModoEdicion(true);
  };

  //pa guardar cambios al editar (crud)
  const handleGuardarEdicion = async () => {
    try {
      const token = localStorage.getItem("token");
      const respuesta = await fetch(
        `http://localhost:8080/api/recibos/${reciboSeleccionado.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosEditados),
        },
      );

      if (respuesta.ok) {
        const data = await respuesta.json();
        setReciboSeleccionado({ ...reciboSeleccionado, ...datosEditados });
        const nuevoHistorial = historial.map((r) =>
          r.id === reciboSeleccionado.id ? { ...r, ...datosEditados } : r,
        );
        setHistorial(nuevoHistorial);

        setModoEdicion(false);
      }
    } catch (error) {
      console.error("Error al editar:", error);
    }
  };

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
            <div className="bg-slate-900 px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                {modoEdicion ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={datosEditados.comercio}
                      onChange={(e) =>
                        setDatosEditados({
                          ...datosEditados,
                          comercio: e.target.value,
                        })
                      }
                      className="bg-slate-800 text-white border-slate-700 rounded px-3 py-1 font-bold text-xl w-full"
                    />
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={datosEditados.fecha}
                        onChange={(e) =>
                          setDatosEditados({
                            ...datosEditados,
                            fecha: e.target.value,
                          })
                        }
                        className="bg-slate-800 text-slate-300 border-slate-700 rounded px-2 py-1 text-sm"
                      />
                      <div className="flex items-center text-white">
                        <span className="mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={datosEditados.total}
                          onChange={(e) =>
                            setDatosEditados({
                              ...datosEditados,
                              total: e.target.value,
                            })
                          }
                          className="bg-slate-800 text-white border-slate-700 rounded px-2 py-1 text-sm w-24"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-white">
                      Ticket de {reciboSeleccionado.comercio}
                    </h1>
                    <p className="text-slate-400 mt-1">
                      Fecha de compra: {reciboSeleccionado.fecha}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {modoEdicion ? (
                  <>
                    <button
                      onClick={() => setModoEdicion(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarEdicion}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg text-sm shadow transition-colors"
                    >
                      Guardar Cambios
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={activarEdicion}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg text-sm shadow transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(reciboSeleccionado.id)}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-lg text-sm shadow transition-colors"
                    >
                      Borrar
                    </button>
                    <button
                      onClick={handleExportarExcel}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-sm shadow transition-colors"
                    >
                      ↓ Excel
                    </button>
                  </>
                )}
              </div>
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
