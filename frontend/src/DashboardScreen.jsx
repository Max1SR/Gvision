import React, { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";

const DashboardScreen = ({ alCambiarVista }) => {
  const [historial, setHistorial] = useState([]);
  const [metricas, setMetricas] = useState({
    totalGastado: 0,
    totalRecibos: 0,
    promedioGasto: 0,
  });
  const [gastosPorComercio, setGastosPorComercio] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null);

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

        if (respuesta.ok) {
          setHistorial(data.datos);
          calcularMetricas(data.datos);
        }
      } catch (error) {
        console.error("Error al cargar el dashboard:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerHistorial();
  }, []);

  const calcularMetricas = (listaRecibos) => {
    if (!listaRecibos.length) return;
    const total = listaRecibos.reduce(
      (suma, recibo) => suma + parseFloat(recibo.total),
      0,
    );
    const cantidad = listaRecibos.length;

    setMetricas({
      totalGastado: total.toFixed(2),
      totalRecibos: cantidad,
      promedioGasto: (total / cantidad).toFixed(2),
    });

    const mapaComercios = {};
    listaRecibos.forEach((recibo) => {
      mapaComercios[recibo.comercio] =
        (mapaComercios[recibo.comercio] || 0) + parseFloat(recibo.total);
    });

    const listaOrdenada = Object.keys(mapaComercios)
      .map((nombre) => ({
        nombre,
        total: mapaComercios[nombre],
      }))
      .sort((a, b) => b.total - a.total);

    setGastosPorComercio(listaOrdenada);
  };

  // MODELO DE LA TABLA 
  const columnas = [
    { header: "Cant.", accessorKey: "cantidad" },
    { header: "Descripción del Producto", accessorKey: "descripcion" },
    { header: "Precio ($)", accessorKey: "precio" },
  ];

  const tabla = useReactTable({
    // Sequelize devuelve los hijos en un arreglo con el nombre del modelo en plural (ItemRecibos)
    data: reciboSeleccionado?.ItemRecibos || [],
    columns: columnas,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExportarExcel = () => {
    if (!reciboSeleccionado || !reciboSeleccionado.ItemRecibos) return;

    const datosLimpios = reciboSeleccionado.ItemRecibos.map((item) => ({
      Cantidad: item.cantidad,
      "Descripción del Producto": item.descripcion,
      "Precio Unitario ($)": item.precio,
      "Subtotal ($)": item.cantidad * item.precio,
    }));

    datosLimpios.push({
      Cantidad: "",
      "Descripción del Producto": "TOTAL",
      "Precio Unitario ($)": "",
      "Subtotal ($)": reciboSeleccionado.total,
    });

    const hoja = XLSX.utils.json_to_sheet(datosLimpios);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Detalle de Recibo");
    XLSX.writeFile(
      libro,
      `Historial_${reciboSeleccionado.comercio.replace(/\s+/g, "_")}.xlsx`,
    );
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">
          Cargando expediente...
        </p>
      </div>
    );
  }

  // VISTA 1: MODO DETALLE DE RECIBO. la recosntruccion 
  if (reciboSeleccionado) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <button
            onClick={() => setReciboSeleccionado(null)}
            className="text-slate-500 hover:text-blue-600 font-medium flex items-center gap-2 transition-colors"
          >
            ← Volver al Dashboard
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Ticket de {reciboSeleccionado.comercio}
                </h1>
                <p className="text-slate-400 mt-1">
                  Fecha de compra: {reciboSeleccionado.fecha}
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
              {/* Columna de la Imagen */}
              <div className="md:col-span-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center min-h-[300px] overflow-hidden p-2">
                {reciboSeleccionado.url_imagen ? (
                  <img
                    // Apuntamos a express para traer las img
                    src={`http://localhost:8080${reciboSeleccionado.url_imagen}`}
                    alt="Recibo original"
                    className="max-h-[400px] object-contain rounded"
                  />
                ) : (
                  <p className="text-slate-400 text-sm text-center">
                    Imagen no disponible
                    <br />
                    (Ticket antiguo)
                  </p>
                )}
              </div>

              {/* Columna de la Tabla TanStack */}
              <div className="md:col-span-2 overflow-x-auto rounded-lg border border-slate-200">
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
                      <tr key={row.id} className="hover:bg-slate-50">
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-6 py-4 whitespace-nowrap text-sm text-slate-700"
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
                <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                  <span className="text-slate-600 font-bold mr-4">
                    Total Pagado:
                  </span>
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

  // VISTA 2: MODO DASHBOARD
  const gastoMaximo =
    gastosPorComercio.length > 0 ? gastosPorComercio[0].total : 1;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Panel de Control Financiero
            </h1>
            <p className="text-slate-500 text-sm">
              Monitoreo analítico de gastos y comercios.
            </p>
          </div>
          <button
            onClick={() => alCambiarVista("escaner")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg shadow transition-all text-sm flex items-center gap-2"
          >
            ← Escanear Nuevo Recibo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Total Acumulado
            </span>
            <p className="text-3xl font-black text-slate-900 mt-2">
              ${metricas.totalGastado}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Tickets Procesados
            </span>
            <p className="text-3xl font-black text-blue-600 mt-2">
              {metricas.totalRecibos} unidades
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">
              Gasto Promedio por Ticket
            </span>
            <p className="text-3xl font-black text-purple-600 mt-2">
              ${metricas.promedioGasto}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800">
              Distribución de Gastos por Comercio
            </h3>
            <div className="space-y-5">
              {gastosPorComercio.slice(0, 5).map((comercio, index) => {
                const porcentajeBarra = (comercio.total / gastoMaximo) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                      <span>{comercio.nombre}</span>
                      <span className="font-bold text-slate-900">
                        ${comercio.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${porcentajeBarra}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Últimos Movimientos
              </h3>
              {historial.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">
                  Sin actividad reciente.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 space-y-1">
                  {historial.slice(0, 5).map((recibo, index) => (
                    <div
                      key={index}
                      onClick={() => setReciboSeleccionado(recibo)}
                      className="py-3 px-2 -mx-2 flex justify-between items-center text-sm cursor-pointer hover:bg-slate-50 transition-colors rounded"
                      title="Ver detalles del ticket"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 truncate max-w-[140px]">
                          {recibo.comercio}
                        </p>
                        <p className="text-xs text-slate-400">{recibo.fecha}</p>
                      </div>
                      <span className="font-bold text-slate-900 bg-slate-100 py-1 px-2.5 rounded-md">
                        ${recibo.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* boton de redireccion a historial */}
            {historial.length > 5 && (
              <button
                onClick={() => alCambiarVista("historial_completo")}
                className="w-full mt-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Ver todo el historial →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
