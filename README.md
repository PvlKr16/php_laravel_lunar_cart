php 8.5.1
Laravel 12.0
Lunar 1.0

before running $ php artisan serve:
- add DB password to .env
- run $ php artisan migrate
- run  $ php artisan db:seed --class=LunarProductSeeder
  windows:
- php artisan media-library:regenerate
- php artisan storage:link
