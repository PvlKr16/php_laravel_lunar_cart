(function () {
    const panel = document.getElementById("cart-panel");
    const overlay = document.getElementById("cart-overlay");
    const closeBtn = document.getElementById("cart-close");
    const itemsBox = document.getElementById("cart-items");
    const totalBox = document.getElementById("cart-total");

    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || null;

    /*
    / HELPERS
    */
    function detectCurrency(value, fallback = "$") {
        if (!value) return fallback;
        const s = String(value);
        const m = s.match(/^[^\d]+/);
        return m ? m[0] : fallback;
    }

    function formatWithCurrency(value, fallbackCurrency = "$") {
        if (value === null || value === undefined || value === "") return fallbackCurrency + "0.00";
        // If value already contains currency symbol, return as-is
        const s = String(value);
        const cur = detectCurrency(s, fallbackCurrency);
        if (s.startsWith(cur)) return s;
        // Try numeric conversion
        const n = parseFloat(String(value).replace(/[^\d\.\-]/g, ""));
        if (!isNaN(n)) return cur + n.toFixed(2);
        return cur + s;
    }

    function numericValueFromFormatted(str) {
        if (str === null || str === undefined) return NaN;
        const s = String(str).replace(/[^\d\.\-]/g, "");
        return parseFloat(s);
    }

    function setLoading(el) {
        if (!el) return;
        el.classList.add("price-loading");
    }
    function unsetLoading(el) {
        if (!el) return;
        el.classList.remove("price-loading");
    }

    /*
    / OPEN / CLOSE PANEL
    */
    function setOpen(open) {
        const floatingBtn = document.getElementById("fkcart-floating-toggler");

        if (open) {
            panel.classList.add("active");
            overlay.classList.add("active");
            loadCart();

            // скрываем плавающую кнопку
            if (floatingBtn) floatingBtn.style.display = "none";

        } else {
            panel.classList.remove("active");
            overlay.classList.remove("active");

            // возвращаем кнопку
            if (floatingBtn) floatingBtn.style.display = "flex";
        }
    }

    window.openCart = () => setOpen(true);
    if (closeBtn) closeBtn.onclick = () => setOpen(false);
    if (overlay) overlay.onclick = () => setOpen(false);

    /*
    / LOAD CART
    */
    async function loadCart() {
        try {
            const res = await fetch("/cart", { credentials: "same-origin" });
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Invalid JSON from /cart:", text);
                return;
            }
            render(data);
        } catch (err) {
            console.error("loadCart error:", err);
        }
    }
    /*
    / RENDER
    */
    function render(data) {
        itemsBox.innerHTML = "";

        if (!data.items || !data.items.length) {
            itemsBox.innerHTML = "<p>Cart is empty</p>";
            totalBox.innerHTML = `
                <div class="cart-total-row">
                    <span class="label">Subtotal:</span>
                    <span class="line-total value" id="cart-total-value">0.00</span>
                </div>
            `;
            return;
        }

        const currency = detectCurrency(data.total?.formatted ?? data.total, "$");

        data.items.forEach((item) => {
            const lineId = item.id;
            const div = document.createElement("div");
            div.className = "cart-item";

            div.innerHTML = `
                <div class="cart-item-inner">

                    <div class="cart-thumb">
                        <button data-action="remove" data-id="${lineId}" title="Remove"
                            class="cart-remove-btn">✕</button>
                        <img src="${item.product?.thumbnail ?? '/images/no-image.png'}">
                    </div>

                    <div style="flex-grow:1;">
                        <div class="cart-item-header">
                            <div class="cart-title">${item.product?.name ?? "Product"}</div>
                            <div class="line-total" id="line-total-${lineId}">
                                ${formatWithCurrency(item.line_total, currency)}
                            </div>
                        </div>

                        <div class="cart-qty-row">
                            <button data-action="decrease" data-id="${lineId}" class="cart-qty-btn">−</button>

                            <input type="number"
                                id="qty-input-${lineId}"
                                value="${item.quantity ?? 1}"
                                min="1"
                                class="qty-input"
                                data-line-id="${lineId}">

                            <button data-action="increase" data-id="${lineId}" class="cart-qty-btn">+</button>
                        </div>
                    </div>

                </div>
            `;

            itemsBox.appendChild(div);
        });

        totalBox.innerHTML = `
            <div class="cart-total-row">
                <span class="label">Subotal:</span>
                <span class="line-total value" id="cart-total-value">
                    ${formatWithCurrency(data.total?.formatted ?? data.total, currency)}
                </span>
            </div>

            <div class="cart-footer-msg">Shipping & taxes may be re-calculated at checkout</div>
        `;
    }

    /*
    / ADD TO CART
    */
    window.addToCartWithQty = async function (variantId) {
        const qtyInput = document.getElementById("qty-" + variantId);
        const msg = document.getElementById("msg-" + variantId);

        const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
        if (msg) msg.textContent = "";

        try {
            const res = await fetch("/cart/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf,
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    variant_id: variantId,
                    quantity: qty,
                }),
            });

            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { data = null; }

            if (!res.ok) {
                const err = data?.error ?? "Error adding to cart";
                if (msg) msg.textContent = err;
                console.error("addToCart error:", data || text);
                return;
            }

            if (data?.new_stock !== undefined) {
                updateStockOnPage(variantId, data.new_stock);
            }

            // open cart to show added item
            openCart();

            // load full cart to get correct totals (server's /cart returns correct totals)
            await loadCart();

        } catch (err) {
            console.error("addToCartWithQty error:", err);
            if (msg) msg.textContent = "Error";
        }
    };

    /*
    / UPDATE CART QTY
    */
    window.updateCartQty = async function (lineId, newQty) {
        const lineEl = document.getElementById("line-total-" + lineId);
        const totalEl = document.getElementById("cart-total-value");

        if (!lineEl || !totalEl) return;

        const oldLineText = lineEl.textContent;
        const oldTotalText = totalEl.textContent;

        // show loading mask but keep old text hidden via CSS
        setLoading(lineEl);
        setLoading(totalEl);

        try {
            const res = await fetch("/cart/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf,
                },
                credentials: "same-origin",
                body: JSON.stringify({ line_id: lineId, quantity: newQty }),
            });

            const raw = await res.text();
            console.log("Raw server response for updateCartQty:", raw);

            let data;
            try {
                data = JSON.parse(raw);
            } catch (err) {
                console.error("updateCartQty: invalid JSON:", raw);
                unsetLoading(lineEl);
                unsetLoading(totalEl);
                return;
            }

            if (!res.ok || data?.error) {
                console.error("updateCartQty server error:", data?.error || data);
                unsetLoading(lineEl);
                unsetLoading(totalEl);
                return;
            }

            // getting correct totals from /cart in case server returns 0.00
            const serverLine = (data.line_total !== undefined && data.line_total !== null)
                ? formatWithCurrency(data.line_total) : null;
            const serverTotal = (data.total !== undefined && data.total !== null)
                ? formatWithCurrency(data.total) : null;

            const newLineNum = numericValueFromFormatted(serverLine);
            const oldLineNum = numericValueFromFormatted(oldLineText);
            const newTotalNum = numericValueFromFormatted(serverTotal);
            const oldTotalNum = numericValueFromFormatted(oldTotalText);

            // if server returns 0.00
            if (serverLine !== null) {
                if (!(Number.isFinite(newLineNum) && newLineNum === 0 && Number.isFinite(oldLineNum) && oldLineNum !== 0)) {
                    // first price-loading then new value
                    lineEl.textContent = serverLine;
                } else {
                    // 0.00 is ignored
                    console.debug("[updateCartQty] ignored server line_total=0.00");
                }
            }

            if (serverTotal !== null) {
                if (!(Number.isFinite(newTotalNum) && newTotalNum === 0 && Number.isFinite(oldTotalNum) && oldTotalNum !== 0)) {
                    totalEl.textContent = serverTotal;
                } else {
                    console.debug("[updateCartQty] ignored server total=0.00");
                }
            }

            // Update stock if provided
            if (data.variant_id && data.new_stock !== undefined) {
                updateStockOnPage(data.variant_id, data.new_stock);
            }

            // If server returns zeros (transient), re-fetch full cart to get correct totals
            if ((serverLine !== null && Number.isFinite(newLineNum) && newLineNum === 0 && Number.isFinite(oldLineNum) && oldLineNum !== 0) ||
                (serverTotal !== null && Number.isFinite(newTotalNum) && newTotalNum === 0 && Number.isFinite(oldTotalNum) && oldTotalNum !== 0)) {
                // fetch full cart once to get consistent totals (debounced by awaiting here)
                await loadCart();
            }

            unsetLoading(lineEl);
            unsetLoading(totalEl);
            return data;
        } catch (err) {
            console.error("updateCartQty error:", err);
            // restore
            lineEl.textContent = oldLineText;
            totalEl.textContent = oldTotalText;
            unsetLoading(lineEl);
            unsetLoading(totalEl);
        }
    };

    /*
    REMOVE FROM CART
    */
    window.removeFromCart = async function (lineId) {
        try {
            const res = await fetch("/cart/remove", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf,
                },
                credentials: "same-origin",
                body: JSON.stringify({ line_id: lineId }),
            });

            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch { data = null; }

            if (data?.variant_id && data?.new_stock !== undefined) {
                updateStockOnPage(data.variant_id, data.new_stock);
            }

            // reload full cart to reflect removed line & totals
            await loadCart();
        } catch (err) {
            console.error("removeFromCart error:", err);
        }
    };

    /*
    / UPDATE STOCK ON PAGE
    */
    window.updateStockOnPage = function (variantId, newStock) {
        const stockDiv = document.getElementById("stock-" + variantId);
        const qtyInput = document.getElementById("qty-" + variantId);
        const btn = document.getElementById("btn-" + variantId);

        if (stockDiv) stockDiv.textContent = "Available: " + newStock;

        if (qtyInput) {
            qtyInput.max = newStock;
            if (parseInt(qtyInput.value, 10) > newStock) qtyInput.value = newStock;
        }

        if (btn) {
            if (newStock <= 0) {
                btn.disabled = true;
                btn.textContent = "Not available";
            } else {
                btn.disabled = false;
                btn.textContent = "Add to cart";
            }
        }
    };

    /*
    / EVENT LISTENERS
    */
    itemsBox.addEventListener("click", async function (e) {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "remove") {
            return removeFromCart(id);
        }

        const input = document.getElementById("qty-input-" + id);
        if (!input) return;

        let qty = parseInt(input.value, 10);

        if (action === "increase") qty++;
        else if (action === "decrease") {
            if (qty <= 1) return removeFromCart(id);
            qty--;
        }

        input.value = qty;
        await updateCartQty(id, qty);
    });

    itemsBox.addEventListener("change", async function (e) {
        if (!e.target.classList.contains('qty-input')) return;

        const id = e.target.dataset.lineId;
        let val = parseInt(e.target.value || 0, 10);

        if (val < 1) return removeFromCart(id);

        e.target.value = val;
        await updateCartQty(id, val);
    });

    /*
    / Init
    */
    if (panel && panel.classList.contains("active")) loadCart();

    /*
    / FLOATING CART BUTTON
    */
    document.addEventListener("DOMContentLoaded", () => {
        const btn = document.getElementById("fkcart-floating-toggler");
        const countEl = document.getElementById("fkit-floating-count");

        if (btn) btn.addEventListener("click", () => {
            if (window.openCart) openCart();
        });

        async function refreshFloatingCount() {
            try {
                const res = await fetch("/cart", { credentials: "same-origin" });
                const text = await res.text();
                const data = JSON.parse(text);

                const qty = data?.items?.reduce((s, i) => s + (i.quantity ?? 0), 0) || 0;

                if (countEl) {
                    countEl.textContent = qty;
                    countEl.dataset.itemCount = qty;
                }
            } catch (e) {
                console.error("Floating cart counter error:", e);
            }
        }

        // Initial load
        refreshFloatingCount();

        /*
        / HOOK INTO CART ACTIONS TO KEEP COUNTER UPDATED
        */
        const oldAdd = window.addToCartWithQty;
        window.addToCartWithQty = async function (...args) {
            await oldAdd(...args);
            refreshFloatingCount();
        };

        const oldRemove = window.removeFromCart;
        window.removeFromCart = async function (...args) {
            await oldRemove(...args);
            refreshFloatingCount();
        };

        const oldUpdate = window.updateCartQty;
        window.updateCartQty = async function (...args) {
            const result = await oldUpdate(...args);
            refreshFloatingCount();
            return result;
        };

        // Also update counter when cart loads
        const oldOpenCart = window.openCart;
        window.openCart = function () {
            oldOpenCart();
            setTimeout(refreshFloatingCount, 300);
        };
    });


})();
