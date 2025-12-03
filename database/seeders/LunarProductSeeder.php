<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

use Lunar\Models\Channel;
use Lunar\Models\Language;
use Lunar\Models\Currency;
use Lunar\Models\CustomerGroup;
use Lunar\Models\Product;
use Lunar\Models\ProductType;
use Lunar\Models\ProductVariant;

use Lunar\Models\AttributeGroup;
use Lunar\Models\Attribute;

use Lunar\Models\TaxClass;
use Lunar\Models\TaxRate;
use Lunar\Models\TaxRateAmount;
use Lunar\Models\TaxZone;

use Lunar\Models\Price;

use Lunar\FieldTypes\TranslatedText;

class LunarProductSeeder extends Seeder
{
    public function run()
    {
        /**
         * CHANNEL
         */
        $channel = Channel::firstOrCreate(
            ['handle' => 'web'],
            [
                'name' => 'Web Store',
                'default' => true,
                'url' => 'http://localhost',
            ]
        );

        /**
         * LANGUAGE
         */
        Language::firstOrCreate(
            ['code' => 'en'],
            ['name' => 'English', 'default' => true]
        );

        /**
         * CURRENCY
         */
        $currency = Currency::firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'US Dollar',
                'decimal_places' => 2,
                'exchange_rate' => 1,
                'enabled' => true,
                'default' => true,
            ]
        );

        /**
         * PRODUCT TYPE
         */
        $type = ProductType::firstOrCreate(
            ['name' => 'Default Product Type']
        );

        /**
         * ATTRIBUTE GROUP
         */
        $group = AttributeGroup::firstOrCreate(
            ['handle' => 'product_main'],
            [
                'attributable_type' => Product::class,
                'name' => 'Product Main Data',
                'position' => 1,
            ]
        );

        /**
         * ATTRIBUTES
         */
        $attributes = [
            [
                'handle' => 'name',
                'name'   => 'Name',
                'type'   => TranslatedText::class,
                'position' => 1,
                'required' => true,
            ],
            [
                'handle' => 'description',
                'name'   => 'Description',
                'type'   => TranslatedText::class,
                'position' => 2,
                'required' => false,
            ],
        ];

        foreach ($attributes as $attr) {
            $attribute = Attribute::firstOrCreate(
                ['handle' => $attr['handle']],
                [
                    'name' => $attr['name'],
                    'type' => $attr['type'],
                    'position' => $attr['position'],
                    'configuration' => [],
                    'required' => $attr['required'],
                    'attribute_group_id' => $group->id,
                    'attribute_type' => 'product',
                    'system' => false,
                    'filterable' => false,
                    'searchable' => false,
                    'section' => null,
                    'default_value' => null,
                    'validation_rules' => null,
                ]
            );

            $type->mappedAttributes()->syncWithoutDetaching([$attribute->id]);
        }

        /**
         * TAXES
         */
        $taxClass = TaxClass::firstOrCreate(
            ['name' => 'Standard Tax'],
            ['default' => true]
        );

        $zone = TaxZone::firstOrCreate(
            ['name' => 'Default Zone'],
            [
                'zone_type' => 'country',
                'default' => true,
                'active' => true,
                'price_display' => 'tax_inclusive',
            ]
        );

        $rate = TaxRate::firstOrCreate(
            [
                'tax_zone_id' => $zone->id,
                'name' => 'Zero Tax',
            ],
            [
                'priority' => 1,
            ]
        );

        TaxRateAmount::firstOrCreate(
            [
                'tax_rate_id' => $rate->id,
                'tax_class_id' => $taxClass->id,
            ],
            [
                'percentage' => 0,
            ]
        );

        /**
         * PRODUCT GENERATION
         */
        $adjectives = ['fast', 'silent', 'red', 'bold', 'green', 'rapid', 'wild', 'blue', 'lunar', 'dusty'];
        $nouns      = ['falcon', 'mountain', 'river', 'sky', 'tiger', 'forest', 'ocean', 'engine', 'shadow', 'planet'];

        for ($i = 0; $i < 3; $i++) {

            $name = ucfirst($adjectives[array_rand($adjectives)]) . ' ' .
                ucfirst($nouns[array_rand($nouns)]);

            $price = rand(5, 15);
            $stock = rand(10, 30);

            /**
             * PRODUCT
             */
            $product = Product::create([
                'status' => 'published',
                'product_type_id' => $type->id,
                'attribute_data' => [
                    'name' => new TranslatedText(['en' => $name]),
                    'description' => new TranslatedText([
                        'en' => "Auto-generated product: $name"
                    ]),
                ],
            ]);

            $product
                ->addMedia(database_path('seeders/images/IMG_9327.jpg'))
                ->preservingOriginal()
                ->toMediaCollection('images');

            /**
             * VARIANT
             */
            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => 'SKU-' . strtoupper(substr(md5($name), 0, 6)),
                'tax_class_id' => $taxClass->id,
                'unit_quantity' => 1,
                'stock' => $stock,
                'backorder' => 0,
            ]);

            /**
             * CHANNEL AVAILABILITY
             */
            $product->channels()->syncWithoutDetaching([
                $channel->id => ['enabled' => true,]
            ]);


            /**
             * PRICE
             */
            $customerGroup = CustomerGroup::firstOrCreate([
                'name' => 'Default',
            ], [
                'handle' => 'default',
                'default' => true,
            ]);

            Price::create([
                'price' => $price * 100,
                'compare_price' => null,
                'currency_id' => $currency->id,
                'priceable_type' => $variant->getMorphClass(),
                'priceable_id' => $variant->id,
                'min_quantity' => 1,
            ]);

        }
    }
}
