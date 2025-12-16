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
    async function setOpen(open) {
        const floatingBtn = document.getElementById("fkcart-floating-toggler");

        if (open) {
            // button hides
            if (floatingBtn) floatingBtn.style.display = "none";

            panel.classList.add("active");
            overlay.classList.add("active");
            await loadCart();

        } else {
            panel.classList.remove("active");
            overlay.classList.remove("active");

            // button appears
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

        /* CART TITLE COUNT */
        const titleCountEl = document.getElementById("cart-title-count");
        const count =
            data?.items?.reduce((sum, i) => sum + (i.quantity ?? 0), 0) || 0;

        if (titleCountEl) {
            if (count > 0) {
                titleCountEl.textContent = `(${count})`;
                titleCountEl.style.display = "inline";
            } else {
                titleCountEl.textContent = "";
                titleCountEl.style.display = "none";
            }
        }

        if (!data.items || !data.items.length) {

            // EMPTY STATE CONTENT
            itemsBox.innerHTML = `
                <div class="cart-empty">

                    <div class="cart-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none"
                             xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 2.71411C2 2.31972 2.31972 2 2.71411 2H3.34019C4.37842 2 4.97454 2.67566 5.31984 3.34917C5.55645 3.8107 5.72685 4.37375 5.86764 4.86133H20.5709C21.5186 4.86133 22.2035 5.7674 21.945 6.67914L19.809 14.2123C19.4606 15.4413 18.3384 16.2896 17.0609 16.2896H9.80665C8.51866 16.2896 7.39 15.4276 7.05095 14.185L6.13344 10.8225C6.12779 10.8073 6.12262 10.7917 6.11795 10.7758L4.64782 5.78023C4.59738 5.61449 4.55096 5.45386 4.50614 5.29878C4.36354 4.80529 4.23716 4.36794 4.04891 4.00075C3.82131 3.55681 3.61232 3.42822 3.34019 3.42822H2.71411C2.31972 3.42822 2 3.1085 2 2.71411Z"
                                  fill="currentColor"/>
                        </svg>
                    </div>

                    <div class="cart-empty-title">Your Cart is Empty</div>
                    <div class="cart-empty-subtitle">
                        Fill your cart with amazing items
                    </div>

                    <button class="cart-empty-btn" id="cart-shop-now">
                        Shop Now
                    </button>
                </div>
            `;

            const footer = document.getElementById("cart-footer");
            if (footer) footer.style.display = "none";
            // mark panel as empty
            const panelEl = document.getElementById("cart-panel");
            if (panelEl) panelEl.classList.add("empty");

            // close cart on Shop Now
            const shopNowBtn = document.getElementById("cart-shop-now");
            if (shopNowBtn) {
                shopNowBtn.onclick = () => setOpen(false);
            }

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
                            class="cart-remove-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24"
                                 class="fkcart-icon-close"
                                 fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.1518 4.31359L4.22676 4.22676C4.50161 3.9519 4.93172 3.92691 5.2348 4.1518L5.32163 4.22676L12 10.9048L18.6784 4.22676C18.9807 3.92441 19.4709 3.92441 19.7732 4.22676C20.0756 4.5291 20.0756 5.01929 19.7732 5.32163L13.0952 12L19.7732 18.6784C20.0481 18.9532 20.0731 19.3833 19.8482 19.6864L19.7732 19.7732C19.4984 20.0481 19.0683 20.0731 18.7652 19.8482L18.6784 19.7732L12 13.0952L5.32163 19.7732C5.01929 20.0756 4.5291 20.0756 4.22676 19.7732C3.92441 19.4709 3.92441 18.9807 4.22676 18.6784L10.9048 12L4.22676 5.32163C3.9519 5.04678 3.92691 4.61667 4.1518 4.31359L4.22676 4.22676L4.1518 4.31359Z"
                                      fill="currentColor"/>
                            </svg>
                        </button>
                    </div>

                    <div style="flex-grow:1;">
                        <div class="cart-item-header">
                            <div class="cart-item-title">${item.product?.name ?? "Product"}</div>
                            <div class="line-total" id="line-total-${lineId}">
                                ${formatWithCurrency(item.line_total, currency)}
                            </div>
                        </div>

                        <div class="fkcart-quantity-selector" data-id="${lineId}">

                        <div class="fkcart-quantity-button fkcart-quantity-down" data-action="down">
                            <svg aria-hidden="true" focusable="false" role="presentation"
                                 class="fkcart-icon" viewBox="0 0 20 20">
                                <path fill="currentColor"
                                      d="M17.543 11.029H2.1A1.032 1.032 0 0 1 1.071 10c0-.566.463-1.029 1.029-1.029h15.443c.566 0 1.029.463 1.029 1.029 0 .566-.463 1.029-1.029 1.029z"/>
                            </svg>
                        </div>

                        <input
                            class="fkcart-quantity__input"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            value="${item.quantity ?? 1}"
                            data-line-id="${lineId}"
                            aria-label="Quantity"
                        >

                        <div class="fkcart-quantity-button fkcart-quantity-up" data-action="up">
                            <svg aria-hidden="true" focusable="false" role="presentation"
                                 class="fkcart-icon" viewBox="0 0 20 20">
                                <path fill="currentColor"
                                      d="M17.409 8.929h-6.695V2.258c0-.566-.506-1.029-1.071-1.029s-1.071.463-1.071 1.029v6.671H1.967C1.401 8.929.938 9.435.938 10s.463 1.071 1.029 1.071h6.605V17.7c0 .566.506 1.029 1.071 1.029s1.071-.463 1.071-1.029v-6.629h6.695c.566 0 1.029-.506 1.029-1.071s-.463-1.071-1.029-1.071z"/>
                            </svg>
                        </div>

                    </div>

                    </div>

                </div>
            `;

            itemsBox.appendChild(div);
        });

        // COUPON TOGGLE BLOCK (only once)
        let couponWrapper = document.getElementById("coupon-wrapper");

        if (!couponWrapper) {
            couponWrapper = document.createElement("div");
            couponWrapper.id = "coupon-wrapper";

            couponWrapper.innerHTML = `
                <div class="coupon-top">

                    <div id="coupon-toggle" class="coupon-toggle">
                        <span>Got a discount code?</span>
                        <span id="coupon-arrow" class="coupon-arrow">▼</span>
                    </div>

                    <div id="coupon-form" class="coupon-form">
                        <div class="coupon-form-row">
                            <input
                                type="text"
                                placeholder="Coupon code"
                                class="coupon-input"
                            >
                            <button class="coupon-apply">Apply</button>
                        </div>
                    </div>

                </div>

                <div class="coupon-bottom"></div>
            `;

            totalBox.parentNode.insertBefore(couponWrapper, totalBox);

            // Toggle logic
            const toggleBtn = document.getElementById("coupon-toggle");
            const form = document.getElementById("coupon-form");
            const arrow = document.getElementById("coupon-arrow");
            const wrapper = document.getElementById("coupon-wrapper");
            const applyBtn = document.querySelector(".coupon-apply");

            if (applyBtn) {
                applyBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    alert("Under construction");
                });
            }

            toggleBtn.onclick = () => {
                const open = wrapper.classList.toggle("is-open");
                form.classList.toggle("is-open", open);
            };

            (function initCouponAutoOffset() {
                const wrapper = document.getElementById("coupon-wrapper");
                if (!wrapper) return;

                const header = wrapper.querySelector(".coupon-toggle");
                if (!header) return;

                function updateOffset() {
                    const h = header.offsetHeight;
                    wrapper.style.setProperty("--coupon-header-h", h + "px");
                }

                // initial
                updateOffset();

                // на случай изменения шрифтов / responsive
                window.addEventListener("resize", updateOffset);
            })();

        }

        totalBox.innerHTML = `
            <div class="cart-total-row">
                <span class="label">Subotal:</span>
                <span class="line-total_value" id="cart-total-value">
                    ${formatWithCurrency(data.total?.formatted ?? data.total, currency)}
                </span>
            </div>

            <div class="cart-footer-msg">Shipping & taxes may be re-calculated at checkout</div>
        `;
        const checkoutBtn = document.getElementById("fkcart-checkout-button");
        if (checkoutBtn) checkoutBtn.style.display = "flex";

        const panelEl = document.getElementById("cart-panel");
        if (panelEl) panelEl.classList.remove("empty");

        const footer = document.getElementById("cart-footer");
        if (footer) footer.style.display = "block";
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

        const action = btn.dataset.action;

        /* === REMOVE ITEM === */
        if (action === "remove") {
            const lineId = btn.dataset.id;
            if (!lineId) return;
            return removeFromCart(lineId);
        }

        /* === QTY CONTROLS (+ / −) === */
        const wrapper = btn.closest(".fkcart-quantity-selector");
        if (!wrapper) return;

        const lineId = wrapper.dataset.id;
        const input = wrapper.querySelector(".fkcart-quantity__input");
        if (!input) return;

        let qty = parseInt(input.value || 0, 10);

        if (action === "up") {
            qty++;
        } else if (action === "down") {
            if (qty <= 1) return removeFromCart(lineId);
            qty--;
        } else {
            return;
        }

        input.value = qty;
        await updateCartQty(lineId, qty);
    });


    itemsBox.addEventListener("change", async function (e) {
        if (!e.target.classList.contains("fkcart-quantity__input")) return;

        const lineId = e.target.dataset.lineId;
        let qty = parseInt(e.target.value || 0, 10);

        if (qty < 1) return removeFromCart(lineId);

        e.target.value = qty;
        await updateCartQty(lineId, qty);
    });


    /*
    / Init
    */
    if (panel && panel.classList.contains("active")) loadCart();

    /*
    / FLOATING CART BUTTON
    */
    document.addEventListener("DOMContentLoaded", () => {

        const miniBtn = document.getElementById("fkcart-mini-toggler");
        const btn = document.getElementById("fkcart-floating-toggler");

        const countEl = document.getElementById("fkit-floating-count"); // нижний
        const miniCountEl = document.querySelector("#fkcart-mini-toggler .fkcart-item-count"); // верхний

        // открытие корзины
        if (btn) btn.addEventListener("click", () => {
            if (window.openCart) openCart();
        });

        if (miniBtn) miniBtn.addEventListener("click", () => {
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

                if (miniCountEl) {
                    miniCountEl.textContent = qty;
                    miniCountEl.dataset.itemCount = qty;
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

        const oldOpenCart = window.openCart;
        window.openCart = async function () {
            await oldOpenCart();
            await refreshFloatingCount();
        };

    });

})();
