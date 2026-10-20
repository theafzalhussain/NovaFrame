<?php
/**
 * Novaframe Studio — PHP configuration
 * ------------------------------------
 * Values come from environment variables, then from a `.env` file in this
 * folder (KEY=value lines), then from the fallbacks below. On shared
 * hosting, create server/php/.env (it is git-ignored) — never commit secrets.
 */

declare(strict_types=1);

(function (): void {
    $file = __DIR__ . '/.env';
    if (!is_readable($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");
        if ($key !== '' && getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
})();

/** Read a configuration value with a fallback. */
function env(string $key, ?string $fallback = null): ?string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }
    $defaults = [
        'DB_HOST'        => '127.0.0.1',
        'DB_PORT'        => '3306',
        'DB_NAME'        => 'novaframe',
        'DB_USER'        => 'root',
        'DB_PASSWORD'    => '',
        'ADMIN_EMAIL'    => 'admin@novaframe.studio',
        'ADMIN_PASSWORD' => '',        // set this (10+ chars) to create the first owner account
        'ADMIN_NAME'     => 'Afzal Hussain',
        'CORS_ORIGIN'    => '',        // comma-separated allow-list; empty = reflect the caller
        'SESSION_DAYS'   => '7',
        'TZ_OFFSET_MINUTES' => '330',  // chart day buckets (IST)
    ];
    return $defaults[$key] ?? $fallback;
}

/** Shared PDO connection (lazy singleton, UTC session). */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', env('DB_HOST'), env('DB_PORT'), env('DB_NAME'));
    $pdo = new PDO($dsn, (string) env('DB_USER'), (string) env('DB_PASSWORD'), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

/* ------------------------------------------------------------------ */
/* CORS + security headers                                            */
/* ------------------------------------------------------------------ */
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_filter(array_map('trim', explode(',', (string) env('CORS_ORIGIN'))));
header('Vary: Origin');
if ($origin !== '' && (!$allowed || in_array($origin, $allowed, true))) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Frame-Options: SAMEORIGIN');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}
