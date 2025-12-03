<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Store (Laravel+Lunar)</title>

    <link rel="stylesheet" href="/css/cart.css">
</head>
<body>

<header style="padding:10px; background:#eee; display:flex; justify-content:space-between;">
    <div>Store</div>

    <button onclick="openCart()" style="padding:6px 10px; cursor:pointer;">
        🛒 Cart
    </button>
</header>

<main style="padding:20px;">
    @yield('content')
</main>

@include('cart.panel')

<script src="/js/cart.js"></script>
</body>
</html>
