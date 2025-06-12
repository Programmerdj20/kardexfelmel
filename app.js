// app.js - Aplicación principal
class FelmelDashboard {
    constructor() {
        this.initialized = false;
        this.services = {
            api: apiService,
            filter: filterService,
            table: tableService,
            export: exportService,
        };
    }

    // Inicializar aplicación
    async init() {
        try {
            Logger.info("Inicializando Felmel Dashboard...");

            // Verificar dependencias
            this.verificarDependencias();

            // Inicializar servicios
            await this.inicializarServicios();

            // Configurar eventos globales
            this.configurarEventos();

            // Configurar interfaz inicial
            this.configurarInterfaz();

            this.initialized = true;
            Logger.info("Dashboard inicializado correctamente");
        } catch (error) {
            Logger.error("Error inicializando dashboard:", error);
            this.mostrarErrorCritico(error);
        }
    }

    // Verificar que todos los elementos necesarios estén presentes
    verificarDependencias() {
        const elementosRequeridos = [
            "consultarBtn",
            "exportarBtn",
            "loading",
            "error",
            "tableContainer",
            "productTableBody",
        ];

        const faltantes = elementosRequeridos.filter(
            (id) => !document.getElementById(id)
        );

        if (faltantes.length > 0) {
            throw new Error(
                `Elementos HTML faltantes: ${faltantes.join(", ")}`
            );
        }

        // Verificar servicios
        if (!window.CONFIG) {
            throw new Error("Configuración no cargada");
        }

        Logger.info("Verificación de dependencias completada");
    }

    // Inicializar todos los servicios
    async inicializarServicios() {
        Logger.info("Inicializando servicios...");

        // Inicializar cada servicio
        this.services.filter.init();
        this.services.table.init();
        this.services.export.init();

        Logger.info("Servicios inicializados");
    }

    // Configurar eventos globales
    configurarEventos() {
        // Botón consultar
        const consultarBtn = document.getElementById("consultarBtn");
        if (consultarBtn) {
            consultarBtn.addEventListener("click", () =>
                this.consultarProductos()
            );
        }

        // Botón exportar
        const exportarBtn = document.getElementById("exportarBtn");
        if (exportarBtn) {
            exportarBtn.addEventListener("click", () => this.exportarDatos());
        }

        // Botón cargar más
        const cargarMasBtn = document.getElementById("cargarMasBtn");
        if (cargarMasBtn) {
            cargarMasBtn.addEventListener("click", () =>
                this.cargarMasProductos()
            );
        }

        // Checkbox de carga rápida
        const cargaRapida = document.getElementById("cargaRapida");
        if (cargaRapida) {
            cargaRapida.addEventListener("change", (e) => {
                APP_STATE.fastLoad = e.target.checked;
                this.actualizarInfoPaginacion();
                Logger.info(
                    `Carga rápida ${
                        APP_STATE.fastLoad ? "activada" : "desactivada"
                    }`
                );
            });
        }

        // Atajos de teclado
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "r":
                        e.preventDefault();
                        this.consultarProductos();
                        break;
                    case "e":
                        e.preventDefault();
                        this.exportarDatos();
                        break;
                    case "l":
                        e.preventDefault();
                        this.services.filter.limpiarFiltros();
                        break;
                }
            }
        });

        // Manejo de errores globales
        window.addEventListener("error", (e) => {
            Logger.error("Error global capturado:", e.error);
        });

        // Manejo de promesas rechazadas
        window.addEventListener("unhandledrejection", (e) => {
            Logger.error("Promesa rechazada no manejada:", e.reason);
        });

        Logger.info("Eventos configurados");
    }

    // Configurar interfaz inicial
    configurarInterfaz() {
        // Configurar estado inicial
        this.actualizarInfoPaginacion();

        // Deshabilitar botón exportar inicialmente
        const exportarBtn = document.getElementById("exportarBtn");
        if (exportarBtn) {
            exportarBtn.disabled = true;
        }

        // Mostrar información de versión
        this.mostrarInformacionVersion();

        Logger.info("Interfaz configurada");
    }

    // Función principal para consultar productos
    async consultarProductos() {
        try {
            if (APP_STATE.isLoading) {
                Logger.warn(
                    "Consulta ya en progreso, ignorando nueva solicitud"
                );
                return;
            }

            Logger.info("Iniciando consulta de productos...");

            // Limpiar datos anteriores
            this.limpiarDatos();

            // Configurar opciones de consulta
            const opciones = {
                fastLoad: APP_STATE.fastLoad,
            };

            // Consultar productos
            const resultado = await this.services.api.consultarProductos(
                opciones
            );

            if (resultado.success) {
                Logger.info(`Consulta exitosa: ${resultado.total} productos`);

                // Actualizar filtros y tabla
                this.services.filter.actualizarCategorias();
                this.services.table.mostrarTabla();

                // Habilitar exportación
                const exportarBtn = document.getElementById("exportarBtn");
                if (exportarBtn) {
                    exportarBtn.disabled = false;
                }

                // Mostrar botón "Cargar más" si es carga rápida
                this.actualizarBotonesCarga(resultado);

                // Ocultar errores
                this.ocultarError();
            }
        } catch (error) {
            Logger.error("Error en consulta:", error);
            this.mostrarError(`Error al consultar productos: ${error.message}`);
        }
    }

    // Cargar más productos (paginación)
    async cargarMasProductos() {
        try {
            Logger.info("Cargando más productos...");

            const productosAdicionales =
                await this.services.api.cargarMasProductos();

            if (productosAdicionales.length > 0) {
                // Actualizar filtros y tabla
                this.services.filter.actualizarCategorias();
                this.services.filter.aplicarFiltros(); // Mantener filtros activos

                Logger.info(
                    `${productosAdicionales.length} productos adicionales cargados`
                );
            } else {
                // Ocultar botón si no hay más productos
                const cargarMasBtn = document.getElementById("cargarMasBtn");
                if (cargarMasBtn) {
                    cargarMasBtn.style.display = "none";
                }

                Logger.info("No hay más productos para cargar");
            }
        } catch (error) {
            Logger.error("Error cargando más productos:", error);
            this.mostrarError(
                `Error al cargar más productos: ${error.message}`
            );
        }
    }

    // Exportar datos
    async exportarDatos() {
        try {
            if (APP_STATE.productosFiltrados.length === 0) {
                this.mostrarError("No hay productos para exportar");
                return;
            }

            await this.services.export.exportarCSV();
        } catch (error) {
            Logger.error("Error en exportación:", error);
            this.mostrarError(`Error al exportar: ${error.message}`);
        }
    }

    // Actualizar botones de carga
    actualizarBotonesCarga(resultado) {
        const cargarMasBtn = document.getElementById("cargarMasBtn");

        if (
            cargarMasBtn &&
            resultado.fastLoad &&
            resultado.total >= CONFIG.performance.fastLoadLimit
        ) {
            cargarMasBtn.style.display = "inline-flex";
        } else if (cargarMasBtn) {
            cargarMasBtn.style.display = "none";
        }
    }

    // Actualizar información de paginación
    actualizarInfoPaginacion() {
        const paginationInfo = document.getElementById("paginationInfo");
        if (paginationInfo) {
            if (APP_STATE.fastLoad) {
                paginationInfo.textContent = `Carga rápida: primeros ${CONFIG.performance.fastLoadLimit} productos`;
            } else {
                paginationInfo.textContent =
                    "Carga completa: todos los productos disponibles";
            }
        }
    }

    // Limpiar datos anteriores
    limpiarDatos() {
        APP_STATE.productos = [];
        APP_STATE.productosFiltrados = [];
        APP_STATE.currentPage = 1;

        // Limpiar cache de API
        if (this.services.api.clearCache) {
            this.services.api.clearCache();
        }
    }

    // Mostrar error en UI
    mostrarError(mensaje) {
        const errorElement = document.getElementById("error");
        if (errorElement) {
            errorElement.textContent = mensaje;
            errorElement.style.display = "block";
        }

        Logger.error(mensaje);
    }

    // Ocultar error
    ocultarError() {
        const errorElement = document.getElementById("error");
        if (errorElement) {
            errorElement.style.display = "none";
        }
    }

    // Mostrar error crítico
    mostrarErrorCritico(error) {
        console.error("Error crítico:", error);

        const container = document.querySelector(".container");
        if (container) {
            container.innerHTML = `
                <div style="
                    background: var(--error);
                    color: white;
                    padding: 30px;
                    border-radius: 12px;
                    text-align: center;
                    margin: 50px auto;
                    max-width: 600px;
                ">
                    <h2>🚫 Error Crítico</h2>
                    <p style="margin: 20px 0;">${error.message}</p>
                    <button onclick="window.location.reload()" style="
                        background: white;
                        color: var(--error);
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        🔄 Recargar Página
                    </button>
                </div>
            `;
        }
    }

    // Mostrar información de versión
    mostrarInformacionVersion() {
        if (CONFIG.debug.enabled) {
            console.log(
                `%c${CONFIG.app.name} v${CONFIG.app.version}`,
                "color: #002a36; font-weight: bold; font-size: 14px"
            );
            console.log("🚀 Dashboard cargado correctamente");
        }
    }

    // Obtener estadísticas de la aplicación
    obtenerEstadisticas() {
        return {
            app: {
                version: CONFIG.app.version,
                initialized: this.initialized,
                uptime: performance.now(),
            },
            data: {
                productos: APP_STATE.productos.length,
                filtrados: APP_STATE.productosFiltrados.length,
                fastLoad: APP_STATE.fastLoad,
            },
            performance: {
                cacheSize: this.services.api.getCacheStats?.()?.size || 0,
            },
        };
    }

    // Reiniciar aplicación
    async reiniciar() {
        Logger.info("Reiniciando aplicación...");

        this.limpiarDatos();
        this.ocultarError();

        // Reinicializar servicios si es necesario
        await this.inicializarServicios();

        Logger.info("Aplicación reiniciada");
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Crear instancia global de la aplicación
        window.felmelApp = new FelmelDashboard();

        // Inicializar aplicación
        await window.felmelApp.init();

        // Agregar métodos globales para compatibilidad
        window.consultarProductos = () => window.felmelApp.consultarProductos();
        window.exportarCSV = () => window.felmelApp.exportarDatos();

        Logger.info("Aplicación lista para usar");
    } catch (error) {
        console.error("Error fatal inicializando aplicación:", error);
    }
});

// Exportar para uso en consola de desarrollo
if (typeof module !== "undefined" && module.exports) {
    module.exports = FelmelDashboard;
}
