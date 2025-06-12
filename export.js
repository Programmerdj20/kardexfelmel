// export.js - Módulo de exportación de datos
class ExportService {
    constructor() {
        this.supportedFormats = ["csv", "json", "xlsx"];
    }

    // Inicializar servicio de exportación
    init() {
        Logger.info("ExportService inicializado");
    }

    // Exportar a CSV (principal)
    async exportarCSV() {
        try {
            const productos = APP_STATE.productosFiltrados;

            if (productos.length === 0) {
                this.mostrarError(CONFIG.messages.noData);
                return;
            }

            Logger.info(
                `Iniciando exportación CSV de ${productos.length} productos`
            );

            // Mostrar progreso
            this.mostrarProgreso("Preparando exportación...");

            // Generar contenido CSV
            const csvContent = this.generarCSV(productos);

            // Crear y descargar archivo
            const filename = this.generarNombreArchivo("csv");
            await this.descargarArchivo(
                csvContent,
                filename,
                "text/csv;charset=utf-8"
            );

            // Mostrar feedback de éxito
            this.mostrarExito();

            Logger.info(`Exportación CSV completada: ${filename}`);
        } catch (error) {
            Logger.error("Error en exportación CSV:", error);
            this.mostrarError(
                `${CONFIG.messages.exportError}: ${error.message}`
            );
        }
    }

    // Generar contenido CSV
    generarCSV(productos) {
        Logger.debug("Generando contenido CSV...");

        const headers = CONFIG.export.headers;
        const delimiter = CONFIG.export.delimiter;

        // Crear filas CSV
        const csvRows = [
            headers.join(delimiter), // Headers
            ...productos.map((producto) =>
                this.crearFilaCSV(producto, delimiter)
            ),
        ];

        // BOM para UTF-8 (soporte de acentos en Excel)
        const csvContent = "\uFEFF" + csvRows.join("\n");

        Logger.debug(`CSV generado: ${csvRows.length} filas`);
        return csvContent;
    }

    // Crear fila CSV individual
    crearFilaCSV(producto, delimiter) {
        const valores = [
            TextUtils.escapeCSV(producto.sku || ""),
            TextUtils.escapeCSV(producto.nombre || ""),
            TextUtils.escapeCSV(producto.categoria || ""),
            TextUtils.escapeCSV(producto.material || ""),
            TextUtils.escapeCSV(
                `$${NumberUtils.formatPrice(producto.precio || 0)}`
            ),
            TextUtils.escapeCSV(
                `$${NumberUtils.formatPrice(producto.precioDescuento || 0)}`
            ),
            TextUtils.escapeCSV(producto.fechaTexto || ""),
        ];

        return valores.join(delimiter);
    }

    // Exportar a JSON
    async exportarJSON() {
        try {
            const productos = APP_STATE.productosFiltrados;

            if (productos.length === 0) {
                this.mostrarError(CONFIG.messages.noData);
                return;
            }

            Logger.info(
                `Iniciando exportación JSON de ${productos.length} productos`
            );

            // Crear estructura JSON
            const jsonData = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    total_products: productos.length,
                    filters_applied:
                        filterService.obtenerEstadisticas().filtrosActivos > 0,
                    app_version: CONFIG.app.version,
                },
                products: productos.map((producto) => ({
                    sku: producto.sku,
                    name: producto.nombre,
                    category: producto.categoria,
                    material: producto.material,
                    price: producto.precio,
                    discounted_price: producto.precioDescuento,
                    discount_percentage: CONFIG.app.discountPercentage,
                    last_modified: producto.fechaTexto,
                    id: producto.id,
                })),
            };

            const jsonContent = JSON.stringify(jsonData, null, 2);
            const filename = this.generarNombreArchivo("json");

            await this.descargarArchivo(
                jsonContent,
                filename,
                "application/json"
            );

            this.mostrarExito();
            Logger.info(`Exportación JSON completada: ${filename}`);
        } catch (error) {
            Logger.error("Error en exportación JSON:", error);
            this.mostrarError(`Error al exportar JSON: ${error.message}`);
        }
    }

    // Exportar estadísticas de tabla
    async exportarEstadisticas() {
        try {
            const stats = tableService.obtenerEstadisticas();
            const filterStats = filterService.obtenerEstadisticas();

            const estadisticas = {
                resumen: {
                    fecha_exportacion: new Date().toISOString(),
                    total_productos_sistema: APP_STATE.productos.length,
                    productos_mostrados: stats.total,
                    porcentaje_filtrado: filterStats.porcentajeFiltrado + "%",
                    filtros_activos: filterStats.filtrosActivos,
                },
                precios: {
                    promedio: NumberUtils.formatPrice(stats.precioPromedio),
                    maximo: NumberUtils.formatPrice(stats.precioMaximo),
                    minimo: NumberUtils.formatPrice(stats.precioMinimo),
                },
                categorias: {
                    total_unicas: stats.categorias,
                    materiales_unicos: stats.materiales,
                },
                configuracion: {
                    descuento_aplicado: CONFIG.app.discountPercentage + "%",
                    carga_rapida: APP_STATE.fastLoad,
                    version_app: CONFIG.app.version,
                },
            };

            const content = JSON.stringify(estadisticas, null, 2);
            const filename = `estadisticas_felmel_${TimeUtils.getISODate()}.json`;

            await this.descargarArchivo(content, filename, "application/json");

            Logger.info("Estadísticas exportadas exitosamente");
        } catch (error) {
            Logger.error("Error exportando estadísticas:", error);
        }
    }

    // Generar nombre de archivo
    generarNombreArchivo(extension) {
        const baseName = CONFIG.export.filename;
        const fecha = TimeUtils.getISODate();
        const timestamp = new Date()
            .toTimeString()
            .slice(0, 5)
            .replace(":", "");

        return `${baseName}_${fecha}_${timestamp}.${extension}`;
    }

    // Descargar archivo
    async descargarArchivo(content, filename, mimeType) {
        return new Promise((resolve, reject) => {
            try {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                link.style.visibility = "hidden";

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Limpiar URL objeto después de un delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve();
                }, 1000);
            } catch (error) {
                reject(error);
            }
        });
    }

    // Mostrar progreso de exportación
    mostrarProgreso(mensaje) {
        // Se podría implementar una barra de progreso aquí
        Logger.info(`Progreso: ${mensaje}`);
    }

    // Mostrar mensaje de éxito
    mostrarExito() {
        const exportarBtn = document.getElementById("exportarBtn");
        if (!exportarBtn) return;

        const originalText = exportarBtn.textContent;
        const originalBackground = exportarBtn.style.background;

        exportarBtn.textContent = CONFIG.messages.exportSuccess;
        exportarBtn.style.background = "var(--success-bright)";
        exportarBtn.disabled = true;

        setTimeout(() => {
            exportarBtn.textContent = originalText;
            exportarBtn.style.background = originalBackground;
            exportarBtn.disabled = false;
        }, 2000);
    }

    // Mostrar error de exportación
    mostrarError(mensaje) {
        // Mostrar en consola
        Logger.error(mensaje);

        // Alert simple para el usuario
        alert(mensaje);

        // Se podría implementar un toast o notification más elegante aquí
    }

    // Validar datos antes de exportar
    validarDatosExportacion(productos) {
        if (!productos || !Array.isArray(productos)) {
            throw new Error("Datos de productos inválidos");
        }

        if (productos.length === 0) {
            throw new Error("No hay productos para exportar");
        }

        // Validar estructura de productos
        const camposRequeridos = ["sku", "nombre", "precio"];
        productos.forEach((producto, index) => {
            camposRequeridos.forEach((campo) => {
                if (producto[campo] === undefined || producto[campo] === null) {
                    Logger.warn(
                        `Producto ${index} tiene campo faltante: ${campo}`
                    );
                }
            });
        });

        return true;
    }

    // Obtener estadísticas de exportación
    obtenerEstadisticasExportacion() {
        return {
            productosDisponibles: APP_STATE.productos.length,
            productosFiltrados: APP_STATE.productosFiltrados.length,
            formatosSoportados: this.supportedFormats,
            ultimaExportacion:
                localStorage.getItem("ultima_exportacion") || "Nunca",
        };
    }

    // Configurar opciones de exportación
    configurarExportacion(opciones = {}) {
        if (opciones.headers) {
            CONFIG.export.headers = opciones.headers;
        }

        if (opciones.delimiter) {
            CONFIG.export.delimiter = opciones.delimiter;
        }

        if (opciones.filename) {
            CONFIG.export.filename = opciones.filename;
        }

        Logger.info("Configuración de exportación actualizada", opciones);
    }
}

// Instancia global del servicio de exportación
const exportService = new ExportService();
