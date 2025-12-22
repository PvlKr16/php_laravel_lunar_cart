php 8.5.1
Laravel 12.0
Lunar 1.0

before running $ php artisan serve:
- composer install
-  cp .env.example .env
  - add DB name, DB username and password to .env
- php artisan key:generate
- run $ php artisan migrate
- run  $ php artisan db:seed --class=LunarProductSeeder
- php artisan storage:link
