<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Lunar\Facades\CartSession;
use Lunar\Models\Cart;
use Lunar\Models\Currency;
use Lunar\Models\Channel;
use Lunar\Models\ProductVariant;

class CartController extends Controller
{
    /**
     * Get or create current cart
     */
    private function getCart()
    {
        $cart = CartSession::current();

        if (!$cart) {
            $currency = Currency::where('default', true)->first();
            $channel  = Channel::where('default', true)->first();

            $cart = Cart::create([
                'currency_id' => $currency->id,
                'channel_id'  => $channel->id,
            ]);

            CartSession::use($cart);
        }

        return $cart;
    }

    /**
     * Show cart
     */
    public function show()
    {
        $cart = $this->getCart();

        $cart->calculate();
        $cart->load('lines.purchasable.product');

        return response()->json([
            'id' => $cart->id,

            'items' => $cart->lines->map(function ($line) {
                $price = $line->purchasable->prices->first()->price->value;
                $lineTotal = number_format(($price * $line->quantity) / 100, 2);

                return [
                    'id' => $line->id,
                    'quantity' => $line->quantity,
                    'line_total' => $lineTotal,
                    'product' => [
                        'name' => $line->purchasable
                            ->product
                            ->translateAttribute('name'),
                    ],
                ];
            }),

            'total' => $cart->total?->formatted ?? '0',
        ]);
    }

    /**
     * Add item to cart
     */
    public function add(Request $request)
    {
        $request->validate([
            'variant_id' => 'required|integer|exists:lunar_product_variants,id',
            'quantity'   => 'nullable|integer|min:1'
        ]);

        $variant = ProductVariant::findOrFail($request->variant_id);
        $qty = $request->quantity ?? 1;

        if ($variant->stock < $qty) {
            return response()->json([
                'success' => false,
                'error' => "Insufficient qty in stock. Available: {$variant->stock}"
            ], 422);
        }

        $cart = $this->getCart();

        $cart->add($variant, $qty);

        $variant->decrement('stock', $qty);

        $cart->calculate();

        return response()->json([
            'success' => true,
            'new_stock' => $variant->stock
        ]);
    }

    /**
     * Updating cart
     */
    public function update(Request $request)
    {
        $request->validate([
            'line_id' => 'required|integer',
            'quantity' => 'required|integer|min:1',
        ]);

        $lineId = $request->line_id;
        $newQty = $request->quantity;

        // Getting current cart
        $cart = \Lunar\Facades\CartSession::current();

        // Cart line detecting
        $line = $cart->lines()->where('id', $lineId)->first();

        if (!$line) {
            return response()->json(['error' => 'Cart line not found'], 404);
        }

        $variant = $line->purchasable;

        if (!$variant) {
            return response()->json(['error' => 'Variant not found'], 404);
        }

        $oldQty = $line->quantity;
        $diff   = $newQty - $oldQty;

        // increasing → stock is decreased
        if ($diff > 0) {
            if ($variant->stock < $diff) {
                return response()->json([
                    'error' => 'Not enough stock',
                    'stock' => $variant->stock
                ], 422);
            }
            $variant->stock -= $diff;
        }
        // decreasing → back to stock
        else {
            $variant->stock += abs($diff);
        }

        $variant->save();

        // Cart lines updating
        $line->quantity = $newQty;
        $line->save();

        // cart updating (Lunar recalculates totals and lines)
//        $cart = $cart->refresh();
        $cart->calculate();
        $cart->refresh();

        // updated line (after refresh)
        $updatedLine = $cart->lines()->find($lineId);

        return response()->json([
            'success'     => true,
            'line_total'  => $updatedLine->total?->formatted ?? '0.00',
            'total'       => $cart->total?->formatted ?? '0.00',
            'variant_id'  => $variant->id,
            'new_stock'   => $variant->stock,
        ]);
    }

    /**
     * Remove line from cart
     */
    public function remove(Request $request)
    {
        $request->validate([
            'line_id' => 'required|integer'
        ]);

        $cart = $this->getCart();

        $line = $cart->lines()->find($request->line_id);

        if (!$line) {
            return response()->json(['success' => false], 404);
        }

        $variant = $line->purchasable;

        $variant->increment('stock', $line->quantity);

        $line->delete();

        $cart->calculate();

        return response()->json([
            'success' => true,
            'variant_id' => $variant->id,
            'new_stock' => $variant->stock
        ]);
    }
}
