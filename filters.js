// filters.js - Módulo de gestión de filtros
class FilterService {
    constructor() {
        this.debounceTimer = null;
        this.activeFilters = {
            sku: "",
            nombre: "",
            categoria: "",
            material: "",
            precio: Infinity,
        };
    }

    // Inicializar filtros
    init() {
        this.bindEvents();
        Logger.info("FilterService inicializado");
    }

    // Vincular eventos de filtros
    bindEvents() {
        // Filtros de texto con debounce
        const textFilters = ["filterSku", "filterNombre", "filterMaterial"];
        textFilters.forEach((filterId) => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener("input", (e) => {
                    this.debounceFilter(
                        () => this.aplicarFiltros(),
                        CONFIG.filters.debounceTime
                    );
                });
            }
        });

        // Filtro de categoría (inmediato)
        const categoriaFilter = document.getElementById("filterCategoria");
        if (categoriaFilter) {
            categoriaFilter.addEventListener("change", () =>
                this.aplicarFiltros()
            );
        }

        // Filtro de precio (inmediato)
        const precioFilter = document.getElementById("filterPrecio");
        if (precioFilter) {
            precioFilter.addEventListener("input", () => this.aplicarFiltros());
        }
    }

    // Aplicar debounce a filtros de texto
    debounceFilter(callback, delay) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(callback, delay);
    }

    // Actualizar categorías en el dropdown
    actualizarCategorias() {
        Logger.info("Actualizando categorías...");

        const categoriaSelect = document.getElementById("filterCategoria");
        if (!categoriaSelect) return;

        // Obtener categorías únicas
        const categoriasSet = new Set();
        APP_STATE.productos.forEach((producto) => {
            if (producto.categoria && producto.categoria !== "Sin categoría") {
                // Dividir categorías múltiples
                const cats = producto.categoria.split(",").map((c) => c.trim());
                cats.forEach((cat) => {
                    if (cat && cat !== "Sin categoría") {
                        categoriasSet.add(cat);
                    }
                });
            }
        });

        const categorias = Array.from(categoriasSet).sort();
        Logger.info(`Encontradas ${categorias.length} categorías únicas`);

        // Limpiar y llenar select
        const currentValue = categoriaSelect.value;
        categoriaSelect.innerHTML = `<option value="">${CONFIG.filters.categoryPlaceholder}</option>`;

        categorias.forEach((categoria) => {
            const option = document.createElement("option");
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);
        });

        // Restaurar valor seleccionado si existe
        if (currentValue && categorias.includes(currentValue)) {
            categoriaSelect.value = currentValue;
        }

        Logger.info(`Categorías actualizadas en el filtro`);
    }

    // Obtener valores actuales de filtros
    obtenerFiltros() {
        const filterSku = document.getElementById("filterSku");
        const filterNombre = document.getElementById("filterNombre");
        const filterCategoria = document.getElementById("filterCategoria");
        const filterMaterial = document.getElementById("filterMaterial");
        const filterPrecio = document.getElementById("filterPrecio");

        return {
            sku: filterSku ? filterSku.value.toLowerCase().trim() : "",
            nombre: filterNombre ? filterNombre.value.toLowerCase().trim() : "",
            categoria: filterCategoria ? filterCategoria.value.trim() : "",
            material: filterMaterial
                ? filterMaterial.value.toLowerCase().trim()
                : "",
            precio: filterPrecio
                ? parseFloat(filterPrecio.value) || Infinity
                : Infinity,
        };
    }

    // Aplicar todos los filtros
    aplicarFiltros() {
        const startTime = performance.now();

        const filtros = this.obtenerFiltros();
        this.activeFilters = { ...filtros };

        Logger.debug("Aplicando filtros:", filtros);

        // Filtrar productos
        APP_STATE.productosFiltrados = APP_STATE.productos.filter(
            (producto) => {
                return this.productoPassaFiltros(producto, filtros);
            }
        );

        const endTime = performance.now();
        const filterTime = (endTime - startTime).toFixed(2);

        Logger.info(
            `Filtros aplicados en ${filterTime}ms. Productos: ${APP_STATE.productosFiltrados.length} de ${APP_STATE.productos.length}`
        );

        // Actualizar tabla
        if (window.tableService) {
            tableService.mostrarTabla();
        }

        // Actualizar estadísticas de filtros
        this.actualizarEstadisticasFiltros();
    }

    // Verificar si un producto pasa todos los filtros
    productoPassaFiltros(producto, filtros) {
        // Filtro por SKU
        if (filtros.sku && !producto.sku.toLowerCase().includes(filtros.sku)) {
            return false;
        }

        // Filtro por nombre
        if (
            filtros.nombre &&
            !producto.nombre.toLowerCase().includes(filtros.nombre)
        ) {
            return false;
        }

        // Filtro por categoría
        if (
            filtros.categoria &&
            !producto.categoria.includes(filtros.categoria)
        ) {
            return false;
        }

        // Filtro por material
        if (
            filtros.material &&
            !producto.material.toLowerCase().includes(filtros.material)
        ) {
            return false;
        }

        // Filtro por precio
        if (filtros.precio !== Infinity && producto.precio > filtros.precio) {
            return false;
        }

        return true;
    }

    // Limpiar todos los filtros
    limpiarFiltros() {
        const filterIds = [
            "filterSku",
            "filterNombre",
            "filterCategoria",
            "filterMaterial",
            "filterPrecio",
        ];

        filterIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === "select-one") {
                    element.selectedIndex = 0;
                } else {
                    element.value = "";
                }
            }
        });

        this.activeFilters = {
            sku: "",
            nombre: "",
            categoria: "",
            material: "",
            precio: Infinity,
        };

        APP_STATE.productosFiltrados = [...APP_STATE.productos];

        if (window.tableService) {
            tableService.mostrarTabla();
        }

        Logger.info("Filtros limpiados");
    }

    // Actualizar estadísticas de filtros en la UI
    actualizarEstadisticasFiltros() {
        const paginationInfo = document.getElementById("paginationInfo");
        if (paginationInfo) {
            const total = APP_STATE.productos.length;
            const filtered = APP_STATE.productosFiltrados.length;

            if (filtered === total) {
                paginationInfo.textContent = `${total} productos cargados`;
            } else {
                paginationInfo.textContent = `${filtered} de ${total} productos (filtrados)`;
            }
        }
    }

    // Exportar configuración actual de filtros
    exportarConfiguracionFiltros() {
        return {
            filtros: { ...this.activeFilters },
            timestamp: new Date().toISOString(),
            totalProductos: APP_STATE.productos.length,
            productosFiltrados: APP_STATE.productosFiltrados.length,
        };
    }

    // Importar configuración de filtros
    importarConfiguracionFiltros(config) {
        if (!config || !config.filtros) return;

        const { filtros } = config;

        // Aplicar valores a los elementos
        if (filtros.sku) {
            const skuFilter = document.getElementById("filterSku");
            if (skuFilter) skuFilter.value = filtros.sku;
        }

        if (filtros.nombre) {
            const nombreFilter = document.getElementById("filterNombre");
            if (nombreFilter) nombreFilter.value = filtros.nombre;
        }

        if (filtros.categoria) {
            const categoriaFilter = document.getElementById("filterCategoria");
            if (categoriaFilter) categoriaFilter.value = filtros.categoria;
        }

        if (filtros.material) {
            const materialFilter = document.getElementById("filterMaterial");
            if (materialFilter) materialFilter.value = filtros.material;
        }

        if (filtros.precio !== Infinity) {
            const precioFilter = document.getElementById("filterPrecio");
            if (precioFilter) precioFilter.value = filtros.precio;
        }

        // Aplicar filtros
        this.aplicarFiltros();

        Logger.info("Configuración de filtros importada");
    }

    // Obtener estadísticas de filtros
    obtenerEstadisticas() {
        const stats = {
            total: APP_STATE.productos.length,
            filtrados: APP_STATE.productosFiltrados.length,
            porcentajeFiltrado:
                APP_STATE.productos.length > 0
                    ? (
                          (APP_STATE.productosFiltrados.length /
                              APP_STATE.productos.length) *
                          100
                      ).toFixed(1)
                    : 0,
            filtrosActivos: Object.values(this.activeFilters).filter(
                (val) => val !== "" && val !== Infinity
            ).length,
        };

        return stats;
    }
}

// Instancia global del servicio de filtros
const filterService = new FilterService();
