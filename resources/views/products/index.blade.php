@extends('layouts.app')

@section('content')
    <h2>Goods Catalogue</h2>

    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:20px;">
        @foreach($products as $product)
            @include('products.card', ['product' => $product])
        @endforeach
    </div>
@endsection
