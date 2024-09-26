<?php

require 'vendor/autoload.php';

use Goutte\Client;

function loadSelectors($filename) {
    if (!file_exists($filename)) {
        throw new Exception("Selectors file not found: " . $filename);
    }
    $selectorsJson = file_get_contents($filename);
    return json_decode($selectorsJson, true);
}

function getUrlsFromFile($filename) {
    if (!file_exists($filename)) {
        throw new Exception("File not found: " . $filename);
    }
    return file($filename, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}

function crawlShop($url, $selectors) {
    $client = new Client();
    $crawler = $client->request('GET', $url);

    if ($client->getResponse()->getStatusCode() !== 200) {
        throw new Exception('Request error: ' . $client->getResponse()->getStatusCode());
    }

    $categories = extractCategories($crawler, $selectors);
    $products = extractProducts($crawler, $selectors, $url);

    return [
        'url' => $url,
        'categories' => $categories,
        'products' => $products,
    ];
}

function extractCategories($crawler, $selectors) {
    $categories = [];

    $crawler->filter($selectors['category'])->each(function ($node) use (&$categories) {
        $categoryName = $node->text();
        $categoryUrl = $node->attr('href');
        $categories[] = [
            'name' => $categoryName,
            'url' => $categoryUrl,
        ];
    });

    return $categories;
}

function extractProducts($crawler, $selectors, $baseUrl) {
    $products = [];

    $crawler->filter($selectors['product'])->each(function ($node) use (&$products, $selectors, $baseUrl) {
        $productName = $node->filter($selectors['product_name'])->count() > 0 ? $node->filter($selectors['product_name'])->text() : null;

        $productUrl = null;
        if ($node->ancestors()->filter($selectors['url'])->count() > 0) {
            $productUrl = $node->ancestors()->filter($selectors['url'])->attr('href');
            if ($productUrl && strpos($productUrl, 'http') !== 0) {
                if (substr($baseUrl, -1) !== '/') {
                    $baseUrl .= '/';
                }
                $productUrl = ltrim($productUrl, '/');
                $productUrl = $baseUrl . $productUrl;
            }
        }

        $price = $node->filter($selectors['price'])->count() > 0 ? $node->filter($selectors['price'])->text() : null;

        $oldPrice = isset($selectors['discount']) && $node->filter($selectors['discount'])->count() > 0 ? $node->filter($selectors['discount'])->text() : null;

        if ($price === null && $oldPrice !== null) {
            $price = $oldPrice;
            $oldPrice = null;
        }

        if ($productName && $price) {
            $products[] = [
                'name' => $productName,
                'url' => $productUrl,
                'price' => $price,
                'discount' => $oldPrice
            ];
        }
    });

    return $products;
}

try {
    $selectors = loadSelectors('./api/selectors.json');

    if (!is_array($selectors)) {
        throw new Exception('Error: failed to load selectors from file.');
    }

    $urls = getUrlsFromFile('./shops.txt');
    $results = [];

    foreach ($urls as $url) {
        $parsedUrl = parse_url($url);
        $domain = $parsedUrl['host'];

        if (array_key_exists($domain, $selectors)) {
            $result = crawlShop($url, $selectors[$domain]);
            $results[] = $result;
        } else {
            throw new Exception('No selectors for domain: ' . $domain);
        }
    }

    header('Content-Type: application/json');
    echo json_encode($results);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
