// table.js - Módulo de gestión de tabla
class TableService {
    constructor() {
        this.currentSort = {
            field: null,
            direction: "asc",
        };
    }

    // Inicializar tabla
    init() {
        Logger.info("TableService inicializado");
    }

    // Mostrar tabla con productos filtrados
    mostrarTabla() {
        const startTime = performance.now();

        const productTableBody = document.getElementById("productTableBody");
        const tableStats = document.getElementById("tableStats");
        const tableContainer = document.getElementById("tableContainer");

        if (!productTableBody || !tableStats || !tableContainer) {
            Logger.error("Elementos de tabla no encontrados");
            return;
        }

        const productos = APP_STATE.productosFiltrados;

        Logger.debug(`Mostrando tabla con ${productos.length} productos`);

        if (productos.length === 0) {
            this.mostrarTablaVacia();
        } else {
            this.renderizarProductos(productos);
            this.actualizarEstadisticas(productos.length);
        }

        tableContainer.style.display = "block";

        const endTime = performance.now();
        Logger.debug(
            `Tabla renderizada en ${(endTime - startTime).toFixed(2)}ms`
        );
    }

    // Renderizar productos en la tabla
    renderizarProductos(productos) {
        const productTableBody = document.getElementById("productTableBody");

        // Usar DocumentFragment para mejor performance
        const fragment = document.createDocumentFragment();

        productos.forEach((producto) => {
            const row = this.crearFilaProducto(producto);
            fragment.appendChild(row);
        });

        // Limpiar tabla y agregar nuevas filas
        productTableBody.innerHTML = "";
        productTableBody.appendChild(fragment);
    }

    // Crear fila individual de producto
    crearFilaProducto(producto) {
        const row = document.createElement("tr");

        // Evento hover para mejor UX
        row.addEventListener("mouseenter", () => {
            row.style.backgroundColor = "var(--hover-bg)";
        });

        row.addEventListener("mouseleave", () => {
            row.style.backgroundColor = "";
        });

        row.innerHTML = `
            <td title="${producto.sku}">${this.truncateText(
            producto.sku,
            20
        )}</td>
            <td title="${producto.nombre}">${this.truncateText(
            producto.nombre,
            40
        )}</td>
            <td title="${producto.categoria}">${this.truncateText(
            producto.categoria,
            30
        )}</td>
            <td title="${producto.material}">${this.truncateText(
            producto.material,
            25
        )}</td>
            <td class="price">${NumberUtils.formatPrice(producto.precio)}</td>
            <td class="price-discount">${NumberUtils.formatPrice(
                producto.precioDescuento
            )}</td>
            <td class="date" title="${
                producto.fechaTexto
            }">${this.formatearFechaCorta(producto.fecha)}</td>
        `;

        return row;
    }

    // Mostrar tabla vacía
    mostrarTablaVacia() {
        const productTableBody = document.getElementById("productTableBody");
        productTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    ${CONFIG.messages.noProducts}
                    <br>
                    <small style="color: var(--text-muted); margin-top: 10px; display: block;">
                        Intenta ajustar los filtros para ver más resultados
                    </small>
                </td>
            </tr>
        `;
    }

    // Actualizar estadísticas de la tabla
    actualizarEstadisticas(cantidad) {
        const tableStats = document.getElementById("tableStats");
        const total = APP_STATE.productos.length;

        let estadisticasText = `${cantidad} producto${
            cantidad !== 1 ? "s" : ""
        }`;

        if (cantidad < total) {
            estadisticasText += ` (de ${total} total)`;
        }

        // Agregar información de carga si es relevante
        if (APP_STATE.fastLoad && total >= CONFIG.performance.fastLoadLimit) {
            estadisticasText += " - Carga rápida";
        }

        tableStats.textContent = estadisticasText;
    }

    // Ordenar tabla por campo
    ordenarTabla(campo) {
        Logger.info(`Ordenando tabla por: ${campo}`);

        const isCurrentField = this.currentSort.field === campo;
        const newDirection =
            isCurrentField && this.currentSort.direction === "asc"
                ? "desc"
                : "asc";

        this.currentSort = {
            field: campo,
            direction: newDirection,
        };

        // Ordenar productos filtrados
        APP_STATE.productosFiltrados.sort((a, b) => {
            return this.compararValores(a[campo], b[campo], newDirection);
        });

        // Actualizar indicadores visuales de ordenamiento
        this.actualizarIndicadoresOrden();

        // Refrescar tabla
        this.mostrarTabla();
    }

    // Comparar valores para ordenamiento
    compararValores(valorA, valorB, direccion) {
        const multiplier = direccion === "asc" ? 1 : -1;

        // Manejar valores nulos o undefined
        if (valorA == null && valorB == null) return 0;
        if (valorA == null) return multiplier;
        if (valorB == null) return -multiplier;

        // Comparación por tipo de dato
        if (typeof valorA === "number" && typeof valorB === "number") {
            return (valorA - valorB) * multiplier;
        }

        if (valorA instanceof Date && valorB instanceof Date) {
            return (valorA.getTime() - valorB.getTime()) * multiplier;
        }

        // Comparación de strings (case insensitive)
        const strA = valorA.toString().toLowerCase();
        const strB = valorB.toString().toLowerCase();

        if (strA < strB) return -1 * multiplier;
        if (strA > strB) return 1 * multiplier;
        return 0;
    }

    // Actualizar indicadores visuales de ordenamiento
    actualizarIndicadoresOrden() {
        // Remover indicadores existentes
        const headers = document.querySelectorAll("th");
        headers.forEach((header) => {
            header.classList.remove("sort-asc", "sort-desc");
            const text = header.textContent.replace(/ ↑| ↓| ↕️/g, "");
            header.innerHTML = text + " ↕️";
        });

        // Agregar indicador al campo actual
        const currentHeader = document.querySelector(
            `th[onclick*="${this.currentSort.field}"]`
        );
        if (currentHeader) {
            const text = currentHeader.textContent.replace(/ ↕️/g, "");
            const arrow = this.currentSort.direction === "asc" ? " ↑" : " ↓";
            currentHeader.innerHTML = text + arrow;
            currentHeader.classList.add(`sort-${this.currentSort.direction}`);
        }
    }

    // Truncar texto con tooltip
    truncateText(text, maxLength) {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
    }

    // Formatear fecha corta para tabla
    formatearFechaCorta(fecha) {
        if (!fecha) return "";

        const ahora = new Date();
        const diff = ahora - fecha;
        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (dias === 0) return "Hoy";
        if (dias === 1) return "Ayer";
        if (dias < 7) return `${dias}d`;
        if (dias < 30) return `${Math.floor(dias / 7)}sem`;
        if (dias < 365) return `${Math.floor(dias / 30)}mes`;

        return fecha.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    }

    // Resaltar filas que coincidan con búsqueda
    resaltarBusqueda(termino) {
        if (!termino) return;

        const rows = document.querySelectorAll("#productTableBody tr");
        rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            let coincide = false;

            cells.forEach((cell) => {
                const texto = cell.textContent.toLowerCase();
                if (texto.includes(termino.toLowerCase())) {
                    coincide = true;
                }
            });

            if (coincide) {
                row.style.backgroundColor = "rgba(0, 42, 54, 0.3)";
                row.style.border = "1px solid var(--accent-blue)";
            }
        });
    }

    // Obtener datos de tabla para exportación
    obtenerDatosParaExportacion() {
        return APP_STATE.productosFiltrados.map((producto) => ({
            sku: producto.sku || "",
            nombre: producto.nombre || "",
            categoria: producto.categoria || "",
            material: producto.material || "",
            precio: producto.precio || 0,
            precioDescuento: producto.precioDescuento || 0,
            fechaTexto: producto.fechaTexto || "",
        }));
    }

    // Obtener estadísticas de la tabla
    obtenerEstadisticas() {
        const productos = APP_STATE.productosFiltrados;

        if (productos.length === 0) {
            return {
                total: 0,
                precioPromedio: 0,
                precioMaximo: 0,
                precioMinimo: 0,
                categorias: 0,
                materiales: 0,
            };
        }

        const precios = productos.map((p) => p.precio).filter((p) => p > 0);
        const categorias = new Set(
            productos
                .map((p) => p.categoria)
                .filter((c) => c && c !== "Sin categoría")
        );
        const materiales = new Set(
            productos.map((p) => p.material).filter((m) => m && m !== "N/A")
        );

        return {
            total: productos.length,
            precioPromedio:
                precios.length > 0
                    ? precios.reduce((a, b) => a + b, 0) / precios.length
                    : 0,
            precioMaximo: precios.length > 0 ? Math.max(...precios) : 0,
            precioMinimo: precios.length > 0 ? Math.min(...precios) : 0,
            categorias: categorias.size,
            materiales: materiales.size,
        };
    }

    // Scroll a fila específica
    scrollToRow(sku) {
        const rows = document.querySelectorAll("#productTableBody tr");
        for (let row of rows) {
            const skuCell = row.querySelector("td:first-child");
            if (skuCell && skuCell.textContent.includes(sku)) {
                row.scrollIntoView({ behavior: "smooth", block: "center" });
                row.style.backgroundColor = "var(--accent-blue)";
                setTimeout(() => {
                    row.style.backgroundColor = "";
                }, 2000);
                break;
            }
        }
    }
}

// Función global para ordenamiento (llamada desde HTML)
function sortTable(campo) {
    if (window.tableService) {
        tableService.ordenarTabla(campo);
    }
}

// Instancia global del servicio de tabla
const tableService = new TableService();
