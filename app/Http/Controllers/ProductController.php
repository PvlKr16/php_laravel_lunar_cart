<?php

namespace App\Http\Controllers;

use Lunar\Models\Product;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with([
            'variants.prices'
        ])
            ->where('status', 'published')
            ->get();

        return view('products.index', compact('products'));
    }
}
