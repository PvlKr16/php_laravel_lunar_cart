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
                return [
                    'id' => $line->id,
                    'quantity' => $line->quantity,
                    'line_total' => $line->total?->formatted,
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
