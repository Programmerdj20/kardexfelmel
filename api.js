// api.js - Módulo de gestión de API optimizado
class ApiService {
    constructor() {
        this.baseUrl = CONFIG.api.url;
        this.auth = btoa(
            `${CONFIG.api.consumer_key}:${CONFIG.api.consumer_secret}`
        );
        this.cache = new Map();
    }

    // Consulta optimizada con control de velocidad
    async consultarProductos(options = {}) {
        const {
            fastLoad = APP_STATE.fastLoad,
            page = 1,
            perPage = CONFIG.performance.defaultPageSize,
            append = false,
        } = options;

        try {
            APP_STATE.isLoading = true;
            this.updateLoadingState(true);

            Logger.info(
                `Consultando productos - Fast Load: ${fastLoad}, Página: ${page}`
            );

            let allProducts = [];

            if (fastLoad) {
                // Carga rápida: solo primera página con más productos
                allProducts = await this.fetchPage(
                    1,
                    CONFIG.performance.fastLoadLimit
                );
                this.updateProgress(
                    `Cargados ${allProducts.length} productos (carga rápida)`
                );
            } else {
                // Carga completa: múltiples páginas
                allProducts = await this.fetchAllPages();
            }

            if (allProducts.length === 0) {
                throw new Error("No se encontraron productos");
            }

            Logger.info(`Total productos obtenidos: ${allProducts.length}`);

            // Procesar productos
            const productosProcessed = this.procesarProductos(allProducts);

            if (append) {
                APP_STATE.productos = [
                    ...APP_STATE.productos,
                    ...productosProcessed,
                ];
            } else {
                APP_STATE.productos = productosProcessed;
            }

            APP_STATE.productosFiltrados = [...APP_STATE.productos];

            return {
                success: true,
                productos: productosProcessed,
                total: allProducts.length,
                fastLoad: fastLoad,
            };
        } catch (error) {
            Logger.error("Error en consultarProductos:", error);
            throw error;
        } finally {
            APP_STATE.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    // Obtener una página específica
    async fetchPage(page, perPage = CONFIG.performance.defaultPageSize) {
        const cacheKey = `page_${page}_${perPage}`;

        if (this.cache.has(cacheKey)) {
            Logger.debug(`Usando cache para página ${page}`);
            return this.cache.get(cacheKey);
        }

        this.updateProgress(`Cargando página ${page}...`);

        const url = `${this.baseUrl}?page=${page}&per_page=${perPage}&orderby=modified&order=desc`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Basic ${this.auth}`,
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(CONFIG.performance.requestTimeout),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Guardar en cache por 5 minutos
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        this.cache.set(cacheKey, data);

        Logger.debug(`Página ${page} cargada: ${data.length} productos`);
        return data;
    }

    // Obtener todas las páginas (carga completa)
    async fetchAllPages() {
        let allProducts = [];
        let page = 1;
        let hasMore = true;
        let consecutiveEmpty = 0;

        while (hasMore && page <= CONFIG.performance.maxPages) {
            try {
                this.updateProgress(`Cargando página ${page} de productos...`);

                const pageProducts = await this.fetchPage(
                    page,
                    CONFIG.performance.maxPageSize
                );

                if (pageProducts.length === 0) {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= 2) {
                        Logger.info(
                            `Deteniendo carga en página ${page} - páginas vacías consecutivas`
                        );
                        break;
                    }
                } else {
                    consecutiveEmpty = 0;
                    allProducts = allProducts.concat(pageProducts);
                    this.updateProgress(
                        `${allProducts.length} productos cargados...`
                    );
                }

                // Si la página devuelve menos productos que el límite, probablemente sea la última
                if (pageProducts.length < CONFIG.performance.maxPageSize) {
                    Logger.info(`Última página detectada en página ${page}`);
                    hasMore = false;
                }

                page++;

                // Pequeña pausa para no saturar el servidor
                if (page % 3 === 0) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            } catch (error) {
                Logger.error(`Error en página ${page}:`, error);
                if (page === 1) {
                    throw error; // Si falla la primera página, lanzar error
                }
                hasMore = false; // Si falla una página posterior, detener carga
            }
        }

        return allProducts;
    }

    // Procesar productos de la API
    procesarProductos(productosAPI) {
        Logger.info(`Procesando ${productosAPI.length} productos...`);

        const startTime = performance.now();

        const processed = productosAPI
            .map((producto, index) => {
                try {
                    // Precio
                    const precio = NumberUtils.parsePrice(
                        producto.price || producto.regular_price || 0
                    );

                    const discountMultiplier =
                        (100 - CONFIG.app.discountPercentage) / 100;
                    const precioDescuento = precio * discountMultiplier;

                    // Categorías
                    let categorias = "Sin categoría";
                    if (
                        producto.categories &&
                        Array.isArray(producto.categories) &&
                        producto.categories.length > 0
                    ) {
                        categorias = producto.categories
                            .map((cat) => cat.name)
                            .join(", ");
                    }

                    // Material
                    let material = "N/A";
                    if (
                        producto.attributes &&
                        Array.isArray(producto.attributes)
                    ) {
                        const materialAttr = producto.attributes.find(
                            (attr) => {
                                const name = (attr.name || "").toLowerCase();
                                return (
                                    name.includes("material") ||
                                    name.includes("composición") ||
                                    name.includes("metal") ||
                                    name.includes("tipo")
                                );
                            }
                        );

                        if (
                            materialAttr &&
                            materialAttr.options &&
                            Array.isArray(materialAttr.options)
                        ) {
                            material = materialAttr.options.join(", ");
                        }
                    }

                    // Fecha
                    const fecha = new Date(
                        producto.date_modified ||
                            producto.date_created ||
                            Date.now()
                    );

                    return {
                        sku: producto.sku || `PROD-${producto.id || index}`,
                        nombre: producto.name || "Sin nombre",
                        categoria: categorias,
                        material: material,
                        precio: precio,
                        precioDescuento: precioDescuento,
                        fecha: fecha,
                        fechaTexto: TimeUtils.formatDate(fecha),
                        id: producto.id || index,
                    };
                } catch (error) {
                    Logger.error(`Error procesando producto ${index}:`, error);
                    return null;
                }
            })
            .filter(Boolean);

        const endTime = performance.now();
        Logger.info(
            `Productos procesados en ${(endTime - startTime).toFixed(2)}ms`
        );

        return processed;
    }

    // Cargar más productos (para paginación)
    async cargarMasProductos() {
        try {
            APP_STATE.currentPage++;

            const moreProducts = await this.fetchPage(APP_STATE.currentPage);

            if (moreProducts.length > 0) {
                const processed = this.procesarProductos(moreProducts);
                APP_STATE.productos = [...APP_STATE.productos, ...processed];
                APP_STATE.productosFiltrados = [...APP_STATE.productos];

                Logger.info(
                    `Cargados ${processed.length} productos adicionales`
                );
                return processed;
            } else {
                Logger.info("No hay más productos para cargar");
                return [];
            }
        } catch (error) {
            Logger.error("Error cargando más productos:", error);
            throw error;
        }
    }

    // Actualizar estado de carga en UI
    updateLoadingState(isLoading) {
        const loadingElement = document.getElementById("loading");
        const consultarBtn = document.getElementById("consultarBtn");

        if (loadingElement) {
            loadingElement.classList.toggle("active", isLoading);
        }

        if (consultarBtn) {
            consultarBtn.disabled = isLoading;
        }
    }

    // Actualizar progreso en UI
    updateProgress(message) {
        const progressElement = document.getElementById("progressText");
        if (progressElement) {
            progressElement.textContent = message;
        }
        Logger.debug(`Progress: ${message}`);
    }

    // Limpiar cache
    clearCache() {
        this.cache.clear();
        Logger.info("Cache limpiado");
    }

    // Obtener estadísticas de cache
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Instancia global del servicio API
const apiService = new ApiService();
