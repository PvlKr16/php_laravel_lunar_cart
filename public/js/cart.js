(function () {
    const panel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    const closeBtn = document.getElementById('cart-close');
    const itemsBox = document.getElementById('cart-items');
    const totalBox = document.getElementById('cart-total');

    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    const csrf = csrfMeta ? csrfMeta.content : null;

    function debug(...args) {
        console.debug("DEBUG:", ...args);
    }

    function setOpen(open) {
        if (open) {
            panel.classList.add('active');
            overlay.classList.add('active');
            loadCart();
        } else {
            panel.classList.remove('active');
            overlay.classList.remove('active');
        }
    }

    window.openCart = () => setOpen(true);
    if (closeBtn) closeBtn.onclick = () => setOpen(false);
    if (overlay) overlay.onclick = () => setOpen(false);

    async function loadCart() {
        debug("Loading cart (/cart)...");
        try {
            const res = await fetch('/cart', { credentials: 'same-origin' });
            const text = await res.text();
            debug("/cart status:", res.status, "response text:", text);
            let data;
            try { data = JSON.parse(text); } catch (err) {
                console.error("Failed to parse /cart response as JSON:", err);
                return;
            }
            debug("CART DATA:", data);
            render(data);
        } catch (err) {
            console.error("Error loading cart:", err);
        }
    }

    function render(data) {
        itemsBox.innerHTML = '';

        if (!data.items || !data.items.length) {
            itemsBox.innerHTML = '<p>Cart is empty</p>';
            totalBox.textContent = 'Total: 0';
            return;
        }

        data.items.forEach(item => {
            // USE item.id as line id (based on previous inspection)
            const lid = item.id;
            const div = document.createElement('div');
            div.className = 'cart-item';

            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; width:100%;">

                    <div style="position: relative; width: 20px; height: 30px; border: 1px solid #ccc;">
                        <button
                            data-action="remove"
                            data-id="${lid}"
                            title="Remove"
                            style="position:absolute; top:-8px; left:-8px; width:16px; height:16px; border:none; background:#f44336; color:#fff; font-size:10px; border-radius:50%; cursor:pointer;"
                        >✕</button>
                    </div>

                    <div style="display:flex; flex-direction:column; flex-grow:1;">
                        <div style="display:flex; justify-content:space-between;">
                            <div class="title">${(item.product && item.product.name) ? item.product.name : 'Product'}</div>
                            <div class="line-total" id="line-total-${lid}">
                                ${item.line_total ?? ''}
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

        totalBox.textContent = 'Total: ' + (data.total ?? '');
    }

    window.addToCartWithQty = async function (variantId) {
        const qtyInput = document.getElementById('qty-' + variantId);
        const msg = document.getElementById('msg-' + variantId);

        if (!qtyInput) {
            console.warn("addToCartWithQty: qty input not found for variant", variantId);
            return;
        }

        const qty = parseInt(qtyInput.value) || 1;
        msg && (msg.textContent = '');

        debug("POST /cart/add", { variant_id: variantId, quantity: qty });

        try {
            const res = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    variant_id: variantId,
                    quantity: qty
                })
            });

            const text = await res.text();
            debug("/cart/add status:", res.status, "response:", text);
            let data;
            try { data = JSON.parse(text); } catch (err) { data = null; }

            if (!res.ok) {
                console.warn("/cart/add failed:", res.status, data);
                msg && (msg.textContent = (data && data.error) ? data.error : "Error");
                return;
            }

            if (data && data.new_stock !== undefined) {
                updateStockOnPage(variantId, data.new_stock);
            }

            openCart();
        } catch (err) {
            console.error("addToCartWithQty error:", err);
        }
    };

    window.updateCartQty = async function (lineId, newQty) {
        debug("updateCartQty called", { lineId, newQty });

        try {
            const res = await fetch('/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    line_id: lineId,
                    quantity: newQty
                })
            });

            const text = await res.text();
            debug("/cart/update status:", res.status, "raw response:", text);

            let data = null;
            try { data = JSON.parse(text); debug("parsed /cart/update response:", data); } catch (err) { debug("Failed to parse /cart/update as JSON:", err); }

            if (!res.ok) {
                // Try to show helpful message
                const errMsg = data && data.error ? data.error : `HTTP ${res.status}`;
                console.warn("/cart/update failed:", errMsg);
                // bubble up error to caller
                return { ok: false, status: res.status, data };
            }

            // If the server returned useful values, update small bits immediately
            if (data) {
                if (data.line_total !== undefined) {
                    const el = document.getElementById('line-total-' + lineId);
                    if (el) el.textContent = data.line_total;
                }
                if (data.total !== undefined) {
                    const cartTotalEl = document.getElementById('cart-total') || totalBox;
                    cartTotalEl.textContent = 'Total: ' + data.total;
                }
                if (data.variant_id !== undefined && data.new_stock !== undefined) {
                    updateStockOnPage(data.variant_id, data.new_stock);
                }
            }

            // return parsed data
            return { ok: true, status: res.status, data };
        } catch (err) {
            console.error("updateCartQty error:", err);
            return { ok: false, status: 0, error: err };
        }
    };

    window.removeFromCart = async function (lineId) {
        debug("removeFromCart", lineId);
        try {
            const res = await fetch('/cart/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrf
                },
                credentials: 'same-origin',
                body: JSON.stringify({ line_id: lineId })
            });

            const text = await res.text();
            debug("/cart/remove status:", res.status, "response:", text);
            let data;
            try { data = JSON.parse(text); } catch (err) { data = null; }

            if (data && data.new_stock !== undefined && data.variant_id !== undefined) {
                updateStockOnPage(data.variant_id, data.new_stock);
            }

            loadCart();
        } catch (err) {
            console.error("removeFromCart error:", err);
        }
    };

    window.updateStockOnPage = function (variantId, newStock) {
        debug("updateStockOnPage", variantId, newStock);
        const stockDiv = document.getElementById('stock-' + variantId);
        const qtyInput = document.getElementById('qty-' + variantId);
        const btn = document.getElementById('btn-' + variantId);

        if (stockDiv) stockDiv.textContent = 'Available: ' + newStock;

        if (qtyInput) {
            qtyInput.max = newStock;
            if (parseInt(qtyInput.value) > newStock) qtyInput.value = newStock;
        }

        if (newStock <= 0) {
            if (qtyInput) qtyInput.disabled = true;
            if (btn) { btn.disabled = true; btn.textContent = 'Not available'; }
        } else {
            if (qtyInput) qtyInput.disabled = false;
            if (btn) { btn.disabled = false; btn.textContent = 'Add to cart'; }
        }
    };

    itemsBox.addEventListener('click', async function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        debug("clicked button", btn.dataset.action, "id:", id);

        if (btn.dataset.action === 'remove') {
            return removeFromCart(id);
        }

        if (btn.dataset.action === 'increase') {
            const input = document.getElementById('qty-input-' + id);
            if (!input) { console.warn("qty input not found for id", id); return; }
            input.value = parseInt(input.value || 0) + 1;
            const result = await updateCartQty(id, parseInt(input.value));
            debug("updateCartQty result (increase):", result);
            // If server did not respond OK, reload to restore correct state
            if (!result || !result.ok) {
                console.warn("server didn't accept update; reloading cart");
                loadCart();
            } else {
                // ensure UI stays consistent with server
                loadCart();
            }
        }

        if (btn.dataset.action === 'decrease') {
            const input = document.getElementById('qty-input-' + id);
            if (!input) { console.warn("qty input not found for id", id); return; }
            let current = parseInt(input.value || 0);
            if (current > 1) {
                input.value = current - 1;
                const result = await updateCartQty(id, parseInt(input.value));
                debug("updateCartQty result (decrease):", result);
                if (!result || !result.ok) {
                    console.warn("server didn't accept update; reloading cart");
                    loadCart();
                } else {
                    loadCart();
                }
            }
        }
    });

    itemsBox.addEventListener('change', async function (e) {
        if (e.target.classList.contains('qty-input')) {
            const id = e.target.dataset.lineId;
            let val = parseInt(e.target.value || 0);
            if (val < 1) val = 1;
            e.target.value = val;
            const result = await updateCartQty(id, val);
            debug("updateCartQty result (change):", result);
            loadCart();
        }
    });

    // initial load if cart panel already open
    if (panel && panel.classList.contains('active')) loadCart();

})();
