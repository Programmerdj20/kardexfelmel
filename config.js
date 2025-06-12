// Configuración global de la aplicación
const CONFIG = {
    // API de WooCommerce
    api: {
        url: "https://orocolombia.co/wp-json/wc/v3/products",
        consumer_key: "ck_865f2431376662f2bff8e2fdca6a933869805784",
        consumer_secret: "cs_b4d4ae6ce65cfa4300464afa935cc708398b90b4",
    },

    // Configuración de performance
    performance: {
        defaultPageSize: 100, // Productos por página por defecto
        maxPageSize: 100, // Máximo productos por página
        maxPages: 10, // Límite de páginas para carga completa
        requestTimeout: 30000, // Timeout en milisegundos
        fastLoadLimit: 100, // Límite para carga rápida
    },

    // Configuración de la aplicación
    app: {
        name: "Dashboard de Productos - Grupo Felmel",
        version: "2.0.0",
        author: "Grupo Felmel",
        discountPercentage: 35, // Porcentaje de descuento por defecto
    },

    // Configuración de exportación
    export: {
        filename: "productos_felmel",
        dateFormat: "YYYY-MM-DD",
        encoding: "utf-8",
        delimiter: ",",
        headers: [
            "SKU",
            "Nombre",
            "Categoría",
            "Material",
            "Precio",
            "Precio con Descuento 35%",
            "Última Modificación",
        ],
    },

    // Configuración de filtros
    filters: {
        debounceTime: 300, // Tiempo de espera para filtros de texto
        priceStep: 0.01, // Paso para filtro de precio
        categoryPlaceholder: "Todas las categorías",
    },

    // Mensajes de la aplicación
    messages: {
        loading: "Consultando productos...",
        loadingPage: "Cargando página {page}...",
        noProducts: "No se encontraron productos con los filtros aplicados",
        exportSuccess: "✅ Exportado!",
        exportError: "Error al exportar",
        apiError: "Error al consultar la API",
        noData: "No hay productos para exportar",
    },

    // Configuración de desarrollo
    debug: {
        enabled: true, // Habilitar logs de debug
        logLevel: "info", // Nivel de log: 'error', 'warn', 'info', 'debug'
        showApiResponses: true, // Mostrar respuestas de API en consola
    },
};

// Variables globales de la aplicación
let APP_STATE = {
    productos: [],
    productosFiltrados: [],
    sortDirection: {},
    currentPage: 1,
    totalPages: 0,
    isLoading: false,
    fastLoad: true,
};

// Utilidades de logging
const Logger = {
    error: (message, ...args) => {
        if (CONFIG.debug.enabled) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },

    warn: (message, ...args) => {
        if (
            CONFIG.debug.enabled &&
            ["warn", "info", "debug"].includes(CONFIG.debug.logLevel)
        ) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },

    info: (message, ...args) => {
        if (
            CONFIG.debug.enabled &&
            ["info", "debug"].includes(CONFIG.debug.logLevel)
        ) {
            console.info(`[INFO] ${message}`, ...args);
        }
    },

    debug: (message, ...args) => {
        if (CONFIG.debug.enabled && CONFIG.debug.logLevel === "debug") {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
};

// Utilidades de tiempo
const TimeUtils = {
    formatDate: (date) => {
        return date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    },

    getISODate: () => {
        return new Date().toISOString().split("T")[0];
    },
};

// Utilidades de números
const NumberUtils = {
    formatPrice: (price) => {
        return price.toLocaleString("es-CO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    },

    parsePrice: (priceString) => {
        const cleaned = priceString.toString().replace(/[^\d.-]/g, "");
        return parseFloat(cleaned) || 0;
    },
};

// Utilidades de texto
const TextUtils = {
    escapeCSV: (text) => {
        if (!text) return "";
        return `"${text.toString().replace(/"/g, '""')}"`;
    },

    truncate: (text, length = 50) => {
        if (!text) return "";
        return text.length > length ? text.substring(0, length) + "..." : text;
    },
};

// Exportar configuración para uso global
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CONFIG,
        APP_STATE,
        Logger,
        TimeUtils,
        NumberUtils,
        TextUtils,
    };
}
