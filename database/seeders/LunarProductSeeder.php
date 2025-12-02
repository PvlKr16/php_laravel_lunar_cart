<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Lunar\Models\Product;
use Lunar\Models\ProductVariant;
use Lunar\Models\ProductType;
use Lunar\Models\Currency;
use Lunar\Models\Price;
use Lunar\Models\Attribute;
use Lunar\Models\AttributeGroup;
use Lunar\Models\Language;
use Lunar\Models\TaxClass;
use Lunar\Models\TaxRate;
use Lunar\Models\TaxRateAmount;
use Lunar\Models\TaxZone;
use Lunar\Models\Channel;

class LunarProductSeeder extends Seeder
{
    public function run()
    {
        /**
         * Channel
         */
        $channel = Channel::firstOrCreate(
            ['handle' => 'web'],
            [
                'name' => 'Web Store',
                'url' => 'http://localhost',
                'default' => true,
            ]
        );

        /**
         * Currency
         */
        $currency = Currency::first() ?? Currency::create([
            'name' => 'US Dollar',
            'code' => 'USD',
            'decimal_places' => 2,
            'exchange_rate' => 1,
            'enabled' => true,
            'default' => true,
        ]);

        /**
         * Product type
         */
        $type = ProductType::first() ?? ProductType::create([
            'name' => 'Default Product Type',
        ]);

        /**
         * Attribute group
         */
        $group = AttributeGroup::first() ?? AttributeGroup::create([
            'name' => 'Product Main Data',
            'handle' => 'product_main',
            'position' => 1,
            'attributable_type' => Product::class,
        ]);

        /**
         * Attributes
         */
        $attributes = [
            [
                'handle' => 'name',
                'name'   => 'Name',
                'type'   => \Lunar\FieldTypes\TranslatedText::class,
                'position' => 1,
            ],
            [
                'handle' => 'description',
                'name'   => 'Description',
                'type'   => \Lunar\FieldTypes\TranslatedText::class,
                'position' => 2,
            ],
        ];

        foreach ($attributes as $attr) {
            $attribute = Attribute::firstOrCreate(
                ['handle' => $attr['handle']],
                [
                    'name'       => $attr['name'],
                    'type'       => $attr['type'],
                    'attribute_type' => 'product',
                    'attribute_group_id' => $group->id,
                    'position'   => $attr['position'],
                    'required'   => false,
                    'configuration' => [],
                    'system'     => false,
                ]
            );

            $type->mappedAttributes()->syncWithoutDetaching([$attribute->id]);
        }

        /**
         * Language
         */
        Language::firstOrCreate(
            ['code' => 'en'],
            ['name' => 'English', 'default' => true]
        );

        /**
         * Tax class
         */
        $taxClass = TaxClass::firstOrCreate(
            ['name' => 'Standard Tax'],
            ['default' => true]
        );

        $taxClass->default = true;
        $taxClass->save();

        $zone = TaxZone::firstOrCreate(
            ['name' => 'Default Zone'],
            [
                'default' => true,
                'active' => true,
                'zone_type' => 'country',
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
         * Goods generating
         */
        $adjectives = ['fast', 'silent', 'red', 'bold', 'green', 'rapid', 'wild', 'blue', 'lunar', 'dusty'];
        $nouns      = ['falcon', 'mountain', 'river', 'sky', 'tiger', 'forest', 'ocean', 'engine', 'shadow', 'planet'];

        for ($i = 0; $i < 3; $i++) {

            $name = ucfirst($adjectives[array_rand($adjectives)]) . ' ' .
                ucfirst($nouns[array_rand($nouns)]);

            $price = rand(5, 15);   // USD dollars
            $stock = rand(10, 30);  // quantity

            $product = Product::create([
                'status' => 'published',
                'product_type_id' => $type->id,
                'attribute_data' => [
                    'name' => new \Lunar\FieldTypes\TranslatedText([
                        'en' => $name
                    ]),
                    'description' => new \Lunar\FieldTypes\TranslatedText([
                        'en' => "Auto-generated product: $name"
                    ]),
                ],
            ]);

            $variant = ProductVariant::create([
                'product_id' => $product->id,
                'sku' => 'SKU-' . strtoupper(substr(md5($name), 0, 6)),
                'tax_class_id' => $taxClass->id,
                'stock' => $stock,
            ]);

            Price::create([
                'price' => $price * 100, // Lunar stores price in cents
                'currency_id' => $currency->id,
                'priceable_type' => ProductVariant::class,
                'priceable_id' => $variant->id,
            ]);
        }
    }
}
