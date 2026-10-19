<?php
/**
 * Novaframe Studio — PHP 8 / MySQL API layer
 * ==========================================
 * This mirrors server/index.ts (Express) exactly, so the same React frontend
 * can talk to either backend depending on where it is deployed:
 *
 *   • Node.js + Express + SQLite  →  server/index.ts        (VPS / container)
 *   • PHP 8 + PDO + MySQL         →  server/php/api.php    (shared hosting / cPanel)
 *
 * Setup
 *   1. Import the schema:  mysql -u user -p novaframe < server/php/schema.sql
 *   2. Copy credentials into config.php (or set environment variables)
 *   3. Point the web server at this file, then set VITE_API_URL in the app
 *
 * Endpoints (identical contract to the Express version)
 *   GET   /api/health
 *   GET   /api/services
 *   POST  /api/enquiries
 *   GET   /api/enquiries        (header: X-Admin-Token)
 *   PATCH /api/enquiries/{id}   (header: X-Admin-Token)
 *   POST  /api/subscribe
 *   POST  /api/events
 *   GET   /api/stats            (header: X-Admin-Token)
 */

declare(strict_types=1);

require __DIR__ . '/config.php';

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$route  = preg_replace('#^.*/api#', '', $uri) ?: '/';

$ADMIN_TOKEN = env('ADMIN_TOKEN', 'novaframe-dev-token');
$body        = json_decode(file_get_contents('php://input') ?: '[]', true) ?: [];

try {
    $pdo = db();
    respond(dispatch($pdo, $route, $method, $body), $method === 'POST' || $method === 'PATCH' ? 201 : 200);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Internal server error']);
    error_log('[novaframe-api] ' . $e->getMessage());
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */
function dispatch(PDO $pdo, string $route, string $method, array $body): array
{
    if ($route === '/health' && $method === 'GET') {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM services')->fetchColumn();
        return ['ok' => true, 'service' => 'novaframe-php-api', 'database' => 'mysql', 'servicesSeeded' => $count];
    }

    if ($route === '/services' && $method === 'GET') {
        $rows = $pdo->query('SELECT id, title, category FROM services WHERE active = 1 ORDER BY id')->fetchAll();
        return ['ok' => true, 'data' => $rows];
    }

    if ($route === '/enquiries') {
        if ($method === 'POST') {
            return createEnquiry($pdo, $body);
        }
        if ($method === 'GET') {
            guard();
            $limit  = min(max((int) ($_GET['limit'] ?? 50), 1), 200);
            $offset = max((int) ($_GET['offset'] ?? 0), 0);
            $stmt   = $pdo->prepare(
                'SELECT id, reference, name, company_name AS companyName, email, phone, service,
                        budget_range AS budget, timeline, status, created_at AS createdAt
                   FROM enquiries ORDER BY created_at DESC LIMIT :l OFFSET :o'
            );
            $stmt->execute([':l' => $limit, ':o' => $offset]);
            $total = (int) $pdo->query('SELECT COUNT(*) FROM enquiries')->fetchColumn();
            return ['ok' => true, 'total' => $total, 'data' => $stmt->fetchAll()];
        }
    }

    if (preg_match('#^/enquiries/(\d+)$#', $route, $m) && $method === 'PATCH') {
        guard();
        $status = trim((string) ($body['status'] ?? ''));
        $allowed = ['new', 'contacted', 'qualified', 'proposal', 'won', 'archived'];
        if (!in_array($status, $allowed, true)) {
            bad('Invalid status');
        }
        $stmt = $pdo->prepare("UPDATE enquiries SET status = :s, updated_at = NOW() WHERE id = :id");
        $stmt->execute([':s' => $status, ':id' => (int) $m[1]]);
        if (!$stmt->rowCount()) {
            bad('Not found', 404);
        }
        return ['ok' => true, 'id' => (int) $m[1], 'status' => $status];
    }

    if ($route === '/subscribe' && $method === 'POST') {
        $email = filter_var(trim((string) ($body['email'] ?? '')), FILTER_VALIDATE_EMAIL);
        if (!$email) {
            bad('Invalid email', 422);
        }
        $stmt = $pdo->prepare('INSERT IGNORE INTO subscribers (email) VALUES (?)');
        $stmt->execute([$email]);
        return ['ok' => true, 'message' => $stmt->rowCount() ? 'Subscribed' : 'Already subscribed'];
    }

    if ($route === '/events' && $method === 'POST') {
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            bad('name required', 422);
        }
        $stmt = $pdo->prepare('INSERT INTO page_events (event_name, path, meta) VALUES (?, ?, ?)');
        $stmt->execute([
            mb_substr($name, 0, 60),
            mb_substr((string) ($body['path'] ?? ''), 0, 200),
            json_encode($body['meta'] ?? new stdClass()),
        ]);
        return ['ok' => true];
    }

    if ($route === '/stats' && $method === 'GET') {
        guard();
        return [
            'ok'   => true,
            'data' => [
                'totalEnquiries' => (int) $pdo->query('SELECT COUNT(*) FROM enquiries')->fetchColumn(),
                'newEnquiries'   => (int) $pdo->query("SELECT COUNT(*) FROM enquiries WHERE status = 'new'")->fetchColumn(),
                'subscribers'    => (int) $pdo->query('SELECT COUNT(*) FROM subscribers')->fetchColumn(),
                'events'         => (int) $pdo->query('SELECT COUNT(*) FROM page_events')->fetchColumn(),
            ],
        ];
    }

    bad('Route not found', 404);
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */
function createEnquiry(PDO $pdo, array $b): array
{
    $errors = [];
    $name    = trim((string) ($b['name'] ?? ''));
    $email   = trim((string) ($b['email'] ?? ''));
    $service = trim((string) ($b['service'] ?? ''));
    $budget  = trim((string) ($b['budget'] ?? ''));
    $details = trim((string) ($b['details'] ?? ''));

    if (mb_strlen($name) < 2)                       { $errors['name'] = 'Invalid or missing value'; }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors['email'] = 'Invalid or missing value'; }
    if ($service === '')                            { $errors['service'] = 'Invalid or missing value'; }
    if ($budget === '')                             { $errors['budget'] = 'Invalid or missing value'; }
    if (mb_strlen($details) < 20)                   { $errors['details'] = 'Invalid or missing value'; }

    if ($errors) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'errors' => $errors]);
        exit;
    }

    $reference = 'NF-' . strtoupper(bin2hex(random_bytes(3)));

    $stmt = $pdo->prepare(
        'INSERT INTO enquiries
           (reference, name, company_name, email, phone, service, budget_range,
            timeline, project_details, source, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $reference,
        mb_substr($name, 0, 120),
        mb_substr(trim((string) ($b['companyName'] ?? '')), 0, 160),
        mb_strtolower(mb_substr($email, 0, 160)),
        mb_substr(trim((string) ($b['phone'] ?? '')), 0, 40),
        mb_substr($service, 0, 80),
        mb_substr($budget, 0, 80),
        mb_substr(trim((string) ($b['timeline'] ?? '')), 0, 80),
        mb_substr($details, 0, 4000),
        mb_substr(trim((string) ($b['source'] ?? 'website')), 0, 60),
        $_SERVER['REMOTE_ADDR'] ?? '',
        mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 400),
    ]);

    return [
        'ok'       => true,
        'reference' => $reference,
        'id'       => (int) $pdo->lastInsertId(),
        'message'  => 'Enquiry received. We reply within 12 business hours.',
    ];
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */
function guard(): void
{
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN']
        ?? (isset($_SERVER['HTTP_AUTHORIZATION']) ? trim(str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION'])) : '');
    if (!hash_equals(env('ADMIN_TOKEN', 'novaframe-dev-token'), (string) $token)) {
        bad('Unauthorized', 401);
    }
}

function bad(string $message, int $code = 422): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
