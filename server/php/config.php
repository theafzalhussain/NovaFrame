<?php
/**
 * Novaframe Studio — PHP configuration
 * ------------------------------------
 * Credentials are read from environment variables first so the same file can
 * be committed safely. On shared hosting without env support, fill the
 * fallback values below (and remove them from version control).
 */

declare(strict_types=1);

/** Read an environment value with a fallback. */
function env(string $key, ?string $fallback = null): ?string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }

    // Fallbacks — replace these on a real deployment.
    return match ($key) {
        'DB_HOST'     => '127.0.0.1',
        'DB_PORT'     => '3306',
        'DB_NAME'     => 'novaframe',
        'DB_USER'     => 'root',
        'DB_PASSWORD' => '',
        'ADMIN_TOKEN' => $fallback ?? 'novaframe-dev-token',
        default       => $fallback,
    };
}

/**
 * Shared PDO connection (lazy singleton).
 * MySQL here; switch the DSN to sqlite: for a zero-config local run.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        env('DB_HOST', '127.0.0.1'),
        env('DB_PORT', '3306'),
        env('DB_NAME', 'novaframe'),
    );

    $pdo = new PDO($dsn, env('DB_USER', 'root'), env('DB_PASSWORD', ''), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false, // real prepared statements
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ]);

    return $pdo;
}

/** Optional CORS allow-list, e.g. 'https://novaframe.studio,https://www.novaframe.studio' */
$allowed = env('CORS_ORIGIN', '*');
header('Vary: Origin');
if ($allowed === '*') {
    header('Access-Control-Allow-Origin: *');
} elseif (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], explode(',', $allowed), true)) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Admin-Token, Authorization');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}
