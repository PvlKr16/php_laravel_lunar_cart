@php
    $variant = $product->variants->first();
    $price   = $variant->prices->first();
    $amount  = $price?->price->value / 100;
    $stock   = $variant->stock;
@endphp

<div style="border:1px solid #ddd; padding:15px; text-align:center;">
    <h3>{{ $product->translateAttribute('name') }}</h3>

    <p><strong>Price:</strong> {{ $amount }} USD</p>
    <div id="stock-{{ $variant->id }}">
        In stock: {{ $variant->stock }}
    </div>

    <label>
        Quantity:
        <input type="number"
               id="qty-{{ $variant->id }}"
               value="1"
               min="1"
               max="{{ $variant->stock }}"
            {{ $variant->stock == 0 ? 'disabled' : '' }}
        >
        <div
            id="msg-{{ $variant->id }}" style="color:red; font-size:14px;">

        </div>
    </label>

    <button id="btn-{{ $variant->id }}"
            onclick="addToCartWithQty({{ $variant->id }})"
        {{ $variant->stock == 0 ? 'disabled' : '' }}
    >
        {{ $variant->stock == 0 ? 'Not available' : 'Add to cart' }}
    </button>

    <p id="msg-{{ $variant->id }}" style="color:red;"></p>

</div>
