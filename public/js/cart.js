(function () {
    const panel = document.getElementById("cart-panel");
    const overlay = document.getElementById("cart-overlay");
    const closeBtn = document.getElementById("cart-close");
    const itemsBox = document.getElementById("cart-items");
    const totalBox = document.getElementById("cart-total");

    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : null;

    function debug(...args) {
        console.debug("DEBUG:", ...args);
    }

    function setOpen(open) {
        if (open) {
            panel.classList.add("active");
            overlay.classList.add("active");
            loadCart();
        } else {
            panel.classList.remove("active");
            overlay.classList.remove("active");
        }
    }

    window.openCart = () => setOpen(true);
    if (closeBtn) closeBtn.onclick = () => setOpen(false);
    if (overlay) overlay.onclick = () => setOpen(false);

    /*
    / Currency helper
    */
    function detectCurrency(value, fallback = "$") {
        if (!value) return fallback;

        const m = value.match(/^[^\d]+/); // everything before first digit
        return m ? m[0] : fallback;
    }

    function formatWithCurrency(value, fallbackCurrency = "$") {
        if (!value) return fallbackCurrency + "0";

        const cur = detectCurrency(value, fallbackCurrency);
        return value.startsWith(cur) ? value : cur + value;
    }

    /*
    / LOAD CART
    */
    async function loadCart() {
        debug("Loading cart...");

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
    / RENDER CART
    */
    function render(data) {
        itemsBox.innerHTML = "";

        if (!data.items || !data.items.length) {
            itemsBox.innerHTML = "<p>Cart is empty</p>";
            totalBox.textContent = "Total: 0";
            return;
        }

        const currency = detectCurrency(
            data.total?.formatted ?? data.total,
            "$"
        );

        data.items.forEach((item) => {
            const lid = item.id;

            const lineCurrency = detectCurrency(item.line_total, currency);

            const div = document.createElement("div");
            div.className = "cart-item";

            div.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:12px; width:100%; position:relative;">

        <!-- Блок изображения -->
        <div style="
            width:30px;
            height:50px;
            border:1px solid #ccc;
            position:relative;
            flex-shrink:0;
            overflow:visible;
        ">
            <!-- Кнопка удаления на рамке -->
            <button
                data-action="remove"
                data-id="${lid}"
                title="Remove"
                style="
                    position:absolute;
                    top:-8px;
                    left:-8px;
                    width:20px;
                    height:20px;
                    border:none;
                    background:#f44336;
                    color:#fff;
                    font-size:10px;
                    border-radius:50%;
                    cursor:pointer;
                    z-index:10;
                "
            >✕</button>

            <img
                src="${item.product?.thumbnail ?? '/images/no-image.png'}"
                style="width:100%; height:100%; object-fit:cover;"
            >
        </div>

        <div style="flex-grow:1;">
            <div style="display:flex; justify-content:space-between;">
                <div class="title">${item.product?.name ?? "Product"}</div>
                <div class="line-total" id="line-total-${lid}">
                    ${formatWithCurrency(item.line_total, detectCurrency(data.total))}
                </div>
            </div>

            <div style="margin-top:4px; display:flex; align-items:center; gap:6px;">
                <button data-action="decrease" data-id="${lid}" style="width:22px; height:22px; background:#ddd; border:none; cursor:pointer;">−</button>

                <input type="number"
                    id="qty-input-${lid}"
                    value="${item.quantity ?? 1}"
                    min="1"
                    class="qty-input"
                    data-line-id="${lid}"
                    style="width:45px; text-align:center;"
                >

                <button data-action="increase" data-id="${lid}" style="width:22px; height:22px; background:#ddd; border:none; cursor:pointer;">+</button>
            </div>
        </div>
    </div>
`;


            itemsBox.appendChild(div);
        });

        /*
        / COUPON TOGGLE BLOCK (only once)
        */
        let couponWrapper = document.getElementById("coupon-wrapper");
        if (!couponWrapper) {
            couponWrapper = document.createElement("div");
            couponWrapper.id = "coupon-wrapper";
            couponWrapper.style.marginBottom = "12px";
            couponWrapper.style.cursor = "pointer";

            couponWrapper.innerHTML = `
        <div id="coupon-toggle" style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:8px 0;
            user-select:none;
        ">
            <span>Got a discount code?</span>
            <span id="coupon-arrow" style="transition:0.3s;">▼</span>
        </div>

        <div id="coupon-form" style="
            display:none;
            overflow:hidden;
            transition:max-height 0.3s ease;
            max-height:0;
        ">
            <div style="display:flex; gap:6px; margin-top:8px;">
                <input type="text"
                    id="coupon-input"
                    placeholder="Coupon code"
                    style="flex:1; padding:6px; border:1px solid #ccc;">
                <button id="coupon-apply" style="
                    padding:6px 12px;
                    background:#333;
                    color:#fff;
                    border:none;
                    cursor:pointer;
                ">Apply</button>
            </div>
        </div>
    `;

            totalBox.parentNode.insertBefore(couponWrapper, totalBox);

            // Toggle logic
            const toggleBtn = document.getElementById("coupon-toggle");
            const form = document.getElementById("coupon-form");
            const arrow = document.getElementById("coupon-arrow");
            const applyBtn = document.getElementById("coupon-apply");

            toggleBtn.onclick = () => {
                const isOpen = form.style.display === "block";

                if (isOpen) {
                    // CLOSE
                    form.style.maxHeight = "0";
                    setTimeout(() => (form.style.display = "none"), 200);
                    arrow.textContent = "▼";
                } else {
                    // OPEN
                    form.style.display = "block";
                    setTimeout(() => (form.style.maxHeight = "80px"), 10);
                    arrow.textContent = "▲";
                }
            };

            applyBtn.onclick = () => {
                alert("Under construction");
            };
        }


        // FIXED: always show currency
        totalBox.textContent = "Total: " +
            formatWithCurrency(data.total?.formatted ?? data.total, currency);
    }

    /*
    / ADD TO CART
    */
    window.addToCartWithQty = async function (variantId) {
        const qtyInput = document.getElementById("qty-" + variantId);
        const msg = document.getElementById("msg-" + variantId);

        if (!qtyInput) return;

        const qty = parseInt(qtyInput.value) || 1;
        msg && (msg.textContent = "");

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

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                msg.textContent = data?.error ?? "Error";
                return;
            }

            if (data?.new_stock !== undefined) {
                updateStockOnPage(variantId, data.new_stock);
            }

            openCart();
        } catch (err) {
            console.error(err);
        }
    };

    /*
    / UPDATE CART QTY
    */
    window.updateCartQty = async function (lineId, newQty) {
        try {
            const res = await fetch("/cart/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrf,
                },
                credentials: "same-origin",
                body: JSON.stringify({
                    line_id: lineId,
                    quantity: newQty,
                }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) return;

            // Update line total
            if (data.line_total !== undefined) {
                document.getElementById("line-total-" + lineId).textContent =
                    formatWithCurrency(data.line_total);
            }

            if (data.total !== undefined) {
                totalBox.textContent = "Total: " + formatWithCurrency(data.total);
            }

            // Update stock
            if (data.variant_id && data.new_stock !== undefined) {
                updateStockOnPage(data.variant_id, data.new_stock);
            }

        } catch (err) {
            console.error("updateCartQty error", err);
        }
    };

    /*
    / REMOVE FROM CART
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

            const data = await res.json().catch(() => null);

            if (data?.variant_id && data?.new_stock !== undefined) {
                updateStockOnPage(data.variant_id, data.new_stock);
            }

            loadCart();
        } catch (err) {
            console.error(err);
        }
    };

    /*
    / UPDATE STOCK IN DOM
    */
    window.updateStockOnPage = function (variantId, newStock) {
        const stockDiv = document.getElementById("stock-" + variantId);
        const qtyInput = document.getElementById("qty-" + variantId);
        const btn = document.getElementById("btn-" + variantId);

        if (stockDiv) stockDiv.textContent = "Available: " + newStock;

        if (qtyInput) {
            qtyInput.max = newStock;
            if (qtyInput.value > newStock) qtyInput.value = newStock;
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
    / BUTTON HANDLERS
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

        let qty = parseInt(input.value);

        if (action === "increase") qty++;
        else if (action === "decrease") {
            if (qty <= 1) return removeFromCart(id);
            qty--;
        }

        input.value = qty;
        await updateCartQty(id, qty);
        return loadCart();
    });


    itemsBox.addEventListener("change", async function (e) {
        if (e.target.classList.contains('qty-input')) {
            const id = e.target.dataset.lineId;
            let val = parseInt(e.target.value || 0);

            if (val < 1) {
                await removeFromCart(id);
                return;
            }

            if (val === 1) {
                e.target.value = 1;
                const result = await updateCartQty(id, 1);
                loadCart();
                return;
            }

            const result = await updateCartQty(id, val);
            loadCart();
        }
    });

    if (panel.classList.contains("active")) loadCart();
})();
