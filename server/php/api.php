<?php
/**
 * Novaframe Studio — PHP 8 + MySQL edition of the API
 * ===================================================
 * Same contract as server/index.ts (Express + SQLite), so the React site and
 * admin console work unchanged on shared hosting (cPanel / Hostinger / Apache).
 *
 * Setup
 *   1. Create a MySQL database, then import schema.sql into it:
 *        mysql -u <user> -p <database> < server/php/schema.sql   (or phpMyAdmin → Import)
 *   2. Create server/php/.env with DB_HOST, DB_NAME, DB_USER, DB_PASSWORD,
 *      ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters) for the first owner
 *   3. Upload the server/php folder as /api on your host (keeps .htaccess)
 *   4. Build the site with VITE_API_URL=https://your-domain.com/api
 *
 * Content and settings are seeded from seed.json on the first request.
 * Passwords use PBKDF2-SHA512 (100k iterations) — hashes are compatible with
 * the Node edition, so a database can move between the two.
 */

declare(strict_types=1);

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

const COLLECTIONS = ['services', 'projects', 'packages', 'team', 'testimonials', 'faqs', 'process', 'techStack', 'guarantees', 'whyUs', 'rhythm', 'milestones', 'insights'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived'];
const LEAD_PRIORITIES = ['low', 'normal', 'high'];
const BOOKING_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
const ROLE_RANK = ['editor' => 1, 'admin' => 2, 'owner' => 3];
const REQUIRED = [
    'services' => ['title'], 'projects' => ['title', 'summary'], 'packages' => ['name', 'price'], 'team' => ['name', 'role'],
    'testimonials' => ['name', 'quote'], 'faqs' => ['q', 'a'], 'process' => ['title'], 'techStack' => ['title'],
    'guarantees' => ['title'], 'whyUs' => ['title'], 'rhythm' => ['title'], 'milestones' => ['title', 'year'], 'insights' => ['title', 'excerpt'],
];
const LEAD_COLUMNS = "id, reference, name, company_name AS companyName, email, phone, service, budget_range AS budget, timeline,
  project_details AS details, status, priority, value_estimate AS valueEstimate, internal_notes AS notes, source,
  created_at AS createdAt, updated_at AS updatedAt";
const BOOKING_COLUMNS = "id, reference, name, email, phone, company_name AS companyName, topic, budget_range AS budget, notes,
  slot_date AS date, slot_time AS time, timezone, status, meeting_link AS meetingLink, internal_notes AS internalNotes,
  enquiry_id AS enquiryId, created_at AS createdAt, updated_at AS updatedAt";

/* ================================================================== */
/* Helpers                                                            */
/* ================================================================== */
function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}
function ok($data = null, int $status = 200): void
{
    respond($status, ['ok' => true, 'data' => $data]);
}
function fail(int $status, string $error, array $extra = []): void
{
    respond($status, array_merge(['ok' => false, 'error' => $error], $extra));
}

function s($value, int $max): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}
function is_email(string $v): bool
{
    return (bool) filter_var($v, FILTER_VALIDATE_EMAIL);
}
function is_assoc($v): bool
{
    return is_array($v) && $v !== [] && array_keys($v) !== range(0, count($v) - 1);
}
function deep_merge($base, $override)
{
    if (!is_assoc($base) || !is_assoc($override)) {
        return $override ?? $base;
    }
    foreach ($override as $k => $v) {
        $base[$k] = (isset($base[$k]) && is_assoc($base[$k]) && is_assoc($v)) ? deep_merge($base[$k], $v) : $v;
    }
    return $base;
}
function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64);
}
function client_ua(): string
{
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 300);
}
function new_reference(string $prefix): string
{
    return $prefix . '-' . strtoupper(bin2hex(random_bytes(3)));
}
function slugify(string $text): string
{
    $text = strtolower((string) preg_replace('/[^A-Za-z0-9]+/', '-', $text));
    return substr(trim($text, '-'), 0, 72);
}
function date_in_tz(string $tz, int $offsetDays = 0): string
{
    try {
        $d = new DateTime('now', new DateTimeZone($tz));
    } catch (Throwable $e) {
        $d = new DateTime('now', new DateTimeZone('UTC'));
    }
    if ($offsetDays !== 0) {
        $d->modify(($offsetDays > 0 ? '+' : '') . $offsetDays . ' days');
    }
    return $d->format('Y-m-d');
}
function hash_password(string $password, ?string $salt = null): array
{
    $salt = $salt ?? bin2hex(random_bytes(16));
    return ['hash' => hash_pbkdf2('sha512', $password, $salt, 100000, 128), 'salt' => $salt];
}
function verify_password(string $password, string $hash, string $salt): bool
{
    return hash_equals($hash, hash_pbkdf2('sha512', $password, $salt, 100000, 128));
}
function q(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}
function one(string $sql, array $params = []): ?array
{
    $row = q($sql, $params)->fetch();
    return $row === false ? null : $row;
}
function all_rows(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

/* ================================================================== */
/* Seed data, settings and content                                    */
/* ================================================================== */
function seed(): array
{
    static $seed = null;
    if ($seed === null) {
        $raw = @file_get_contents(__DIR__ . '/seed.json');
        $seed = $raw ? (json_decode($raw, true) ?: []) : [];
    }
    return $seed;
}
function read_setting(string $key)
{
    $row = one('SELECT value FROM settings WHERE setting_key = ?', [$key]);
    return $row ? json_decode((string) $row['value'], true) : null;
}
function write_setting(string $key, $value): void
{
    q('INSERT INTO settings (setting_key, value, updated_at) VALUES (?, ?, UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = UTC_TIMESTAMP()', [$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}
function site_settings(): array
{
    return deep_merge(seed()['settings'] ?? [], read_setting('site') ?? []);
}
function advanced_settings(): array
{
    return deep_merge(seed()['advanced'] ?? [], read_setting('advanced') ?? []);
}
function seed_collection(string $name): void
{
    $items = seed()['collections'][$name] ?? [];
    $pdo = db();
    $pdo->beginTransaction();
    q('DELETE FROM content WHERE collection = ?', [$name]);
    foreach (array_values($items) as $i => $item) {
        q('INSERT INTO content (collection, id, data, sort_order, published) VALUES (?, ?, ?, ?, 1)', [
            $name, (string) $item['id'], json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), ($i + 1) * 10,
        ]);
    }
    $pdo->commit();
}
/**
 * Default entries that must reach databases which are ALREADY populated (seeding only runs on an
 * empty collection). Each id is offered once per database: inserted only if missing, appended after
 * the existing entries and never touched again — so admin edits survive and deletions stay deleted.
 * Mirror of DEFAULT_TOP_UPS in server/db.ts; keep both lists in sync.
 */
const DEFAULT_TOP_UPS = ['team' => ['vijay', 'om-gupta']];
function top_up_defaults(): void
{
    $offered = read_setting('seeded_items');
    $offered = is_array($offered) ? $offered : [];
    $changed = false;
    foreach (DEFAULT_TOP_UPS as $name => $ids) {
        $done = array_values(array_unique($offered[$name] ?? []));
        $defaults = seed()['collections'][$name] ?? [];
        foreach ($ids as $id) {
            if (in_array($id, $done, true)) {
                continue;
            }
            $item = null;
            foreach ($defaults as $d) {
                if (($d['id'] ?? null) === $id) {
                    $item = $d;
                    break;
                }
            }
            if ($item === null) {
                continue;
            }
            $exists = one('SELECT 1 AS x FROM content WHERE collection = ? AND id = ?', [$name, $id]);
            if (!$exists) {
                $max = (int) (one('SELECT COALESCE(MAX(sort_order), 0) AS m FROM content WHERE collection = ?', [$name])['m'] ?? 0);
                q('INSERT IGNORE INTO content (collection, id, data, sort_order, published) VALUES (?, ?, ?, ?, 1)', [
                    $name, $id, json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $max + 10,
                ]);
            }
            $done[] = $id;
            $offered[$name] = $done;
            $changed = true;
        }
    }
    if ($changed) {
        write_setting('seeded_items', $offered);
    }
}
function ensure_seeded(): void
{
    $seeded = read_setting('seeded_collections');
    $seeded = is_array($seeded) ? $seeded : [];
    $changed = false;
    foreach (COLLECTIONS as $name) {
        if (in_array($name, $seeded, true)) {
            continue;
        }
        $count = (int) (one('SELECT count(*) AS c FROM content WHERE collection = ?', [$name])['c'] ?? 0);
        if ($count === 0) {
            seed_collection($name);
        }
        $seeded[] = $name;
        $changed = true;
    }
    if ($changed) {
        write_setting('seeded_collections', $seeded);
    }
    top_up_defaults();
    if (read_setting('site') === null) {
        write_setting('site', seed()['settings'] ?? []);
    }
    if (read_setting('advanced') === null) {
        write_setting('advanced', seed()['advanced'] ?? []);
    }
    $admins = (int) (one('SELECT count(*) AS c FROM admin_users')['c'] ?? 0);
    $password = (string) env('ADMIN_PASSWORD');
    if ($admins === 0 && strlen($password) >= 10) {
        $h = hash_password($password);
        q("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, 'owner')", [
            strtolower(trim((string) env('ADMIN_EMAIL'))), $h['hash'], $h['salt'], (string) env('ADMIN_NAME'),
        ]);
    }
}
function parse_row(array $row): array
{
    $data = json_decode((string) $row['data'], true);
    $data = is_array($data) ? $data : [];
    $data['id'] = $row['id'];
    return [
        'id' => $row['id'],
        'data' => $data,
        'published' => (int) $row['published'] === 1,
        'sortOrder' => (int) $row['sort_order'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}
function published(string $name): array
{
    return array_map(fn ($r) => parse_row($r)['data'], all_rows('SELECT * FROM content WHERE collection = ? AND published = 1 ORDER BY sort_order, created_at', [$name]));
}
function all_entries(string $name): array
{
    return array_map('parse_row', all_rows('SELECT * FROM content WHERE collection = ? ORDER BY sort_order, created_at', [$name]));
}
function estimate_value(string $budget): ?int
{
    foreach (advanced_settings()['budgetRanges'] ?? [] as $range) {
        if (($range['label'] ?? null) === $budget) {
            $min = (float) $range['min'];
            return $range['max'] === null ? (int) round($min * 1.25) : (int) round(($min + (float) $range['max']) / 2);
        }
    }
    return null;
}

/* ================================================================== */
/* Rate limiting (table-backed fixed window)                          */
/* ================================================================== */
function rate_limit(string $bucket, int $max, int $windowSeconds, string $message = 'Too many requests — please try again in a little while.'): void
{
    $now = time();
    $key = substr($bucket, 0, 190);
    q('INSERT INTO rate_limits (bucket, hits, reset_at) VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE hits = IF(reset_at <= ?, 1, hits + 1), reset_at = IF(reset_at <= ?, VALUES(reset_at), reset_at)', [$key, $now + $windowSeconds, $now, $now]);
    $row = one('SELECT hits, reset_at FROM rate_limits WHERE bucket = ?', [$key]);
    if ($row && (int) $row['hits'] > $max) {
        header('Retry-After: ' . max(1, (int) $row['reset_at'] - $now));
        fail(429, $message);
    }
    if (random_int(1, 50) === 1) {
        q('DELETE FROM rate_limits WHERE reset_at <= ?', [$now]);
    }
}

/* ================================================================== */
/* Auth                                                               */
/* ================================================================== */
function bearer_token(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower((string) $k) === 'authorization') {
                $header = (string) $v;
            }
        }
    }
    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return trim((string) ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ''));
}

$ADMIN = null;

function require_role(string $min = 'editor'): array
{
    global $ADMIN;
    $token = bearer_token();
    if ($token === '') {
        fail(401, 'Authentication required.');
    }
    $row = one('SELECT s.id AS session_id, s.last_seen_at, u.id, u.email, u.full_name, u.role, u.active
                FROM sessions s JOIN admin_users u ON u.id = s.user_id
                WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()', [hash('sha256', $token)]);
    if (!$row || (int) $row['active'] !== 1) {
        fail(401, 'Your session has expired. Please sign in again.');
    }
    if ((ROLE_RANK[$row['role']] ?? 0) < ROLE_RANK[$min]) {
        fail(403, "Your role doesn't allow this action.");
    }
    if (time() - strtotime($row['last_seen_at'] . ' UTC') > 300) {
        q('UPDATE sessions SET last_seen_at = UTC_TIMESTAMP() WHERE id = ?', [$row['session_id']]);
    }
    $ADMIN = ['id' => (int) $row['id'], 'email' => $row['email'], 'fullName' => $row['full_name'], 'role' => $row['role'], 'sessionId' => (int) $row['session_id']];
    return $ADMIN;
}
function audit(string $action, string $target, string $details = ''): void
{
    global $ADMIN;
    q('INSERT INTO audit_logs (admin_id, admin_email, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)', [
        $ADMIN['id'] ?? null, $ADMIN['email'] ?? null, $action, substr($target, 0, 120), substr($details, 0, 500), client_ip(),
    ]);
}
function public_user(array $u): array
{
    return ['id' => (int) $u['id'], 'email' => $u['email'], 'fullName' => $u['full_name'], 'role' => $u['role'], 'lastLoginAt' => $u['last_login_at'] ?? null];
}

/* ================================================================== */
/* Analytics helpers                                                  */
/* ================================================================== */
/* ------------------------------------------------------------------ */
/* Media library — images uploaded from the admin console             */
/* ------------------------------------------------------------------ */
const MEDIA_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/avif' => 'avif',
    'image/gif' => 'gif',
];
const MEDIA_MAX_BYTES = 4194304; // 4 MB

/** Created on demand so installs made before this feature don't need a schema re-import. */
function media_table(): void
{
    q('CREATE TABLE IF NOT EXISTS media (
        id          VARCHAR(100) NOT NULL,
        filename    VARCHAR(160) NOT NULL,
        mime_type   VARCHAR(40)  NOT NULL,
        bytes       INT UNSIGNED NOT NULL,
        data_base64 LONGTEXT     NOT NULL,
        uploaded_by VARCHAR(160)     NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_media_created (created_at)
    ) ENGINE = InnoDB');
}

/** Magic-byte check so a renamed file can't be stored as an image. */
function sniff_image(string $buf, string $mime): bool
{
    if (strlen($buf) < 12) {
        return false;
    }
    switch ($mime) {
        case 'image/jpeg':
            return substr($buf, 0, 3) === "\xFF\xD8\xFF";
        case 'image/png':
            return substr($buf, 0, 8) === "\x89PNG\r\n\x1A\n";
        case 'image/gif':
            return substr($buf, 0, 4) === 'GIF8';
        case 'image/webp':
            return substr($buf, 0, 4) === 'RIFF' && substr($buf, 8, 4) === 'WEBP';
        case 'image/avif':
            return substr($buf, 4, 4) === 'ftyp';
        default:
            return false;
    }
}

function tz_minutes(): int{
    return (int) env('TZ_OFFSET_MINUTES');
}
function daily_series(string $sql, int $days, array $params = []): array
{
    $map = [];
    foreach (all_rows($sql, $params) as $r) {
        $map[(string) $r['day']] = (int) $r['c'];
    }
    $tz = site_settings()['timezone'] ?? 'Asia/Kolkata';
    $out = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $day = date_in_tz($tz, -$i);
        $out[] = ['date' => $day, 'count' => $map[$day] ?? 0];
    }
    return $out;
}

/* ================================================================== */
/* Router                                                             */
/* ================================================================== */
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = (string) (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/');
if (($pos = strpos($path, '/api.php')) !== false) {
    $route = substr($path, $pos + 8);
} elseif (preg_match('#/api(/.*)?$#', $path, $m)) {
    $route = $m[1] ?? '/';
} else {
    $route = $path;
}
$route = '/' . trim($route, '/');

$raw = file_get_contents('php://input') ?: '';
// Image uploads POST raw bytes with an image/* content type — never JSON-decode those.
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
$jsonBody = $contentType === '' || str_contains($contentType, 'json');
$body = ($jsonBody && $raw !== '') ? json_decode($raw, true) : [];
if ($jsonBody && $raw !== '' && !is_array($body)) {
    fail(400, 'Malformed JSON body.');
}
$body = is_array($body) ? $body : [];

try {
    ensure_seeded();
    dispatch($method, $route, $body);
    fail(404, 'Route not found.');
} catch (Throwable $e) {
    error_log('[novaframe-api] ' . $e->getMessage());
    if (str_contains($e->getMessage(), 'Duplicate entry') && str_contains($e->getMessage(), 'active_slot')) {
        fail(409, 'That slot was just taken — please pick another time.', ['errors' => ['time' => 'Slot taken']]);
    }
    if ($e instanceof PDOException && preg_match('/SQLSTATE\[(HY000|08\d{3})\] \[\d+\]/', $e->getMessage())) {
        fail(503, 'Database unavailable — check the DB_* values in server/php/.env and that schema.sql was imported.');
    }
    fail(500, 'Something went wrong on our side. Please try again.');
}

function dispatch(string $method, string $route, array $b): void
{
    $m = [];

    /* -------------------------- Public -------------------------- */
    if ($route === '/health' && $method === 'GET') {
        $c = (int) (one('SELECT count(*) AS c FROM content')['c'] ?? 0);
        ok(['service' => 'novaframe-php-api', 'database' => 'mysql', 'contentItems' => $c, 'time' => gmdate('c')]);
    }

    if ($route === '/content' && $method === 'GET') {
        $collections = [];
        foreach (COLLECTIONS as $name) {
            $collections[$name] = published($name);
        }
        $t = one('SELECT GREATEST(COALESCE((SELECT max(updated_at) FROM content), 0), COALESCE((SELECT max(updated_at) FROM settings), 0)) AS t');
        header('Cache-Control: no-cache');
        ok(['settings' => site_settings(), 'advanced' => advanced_settings(), 'collections' => $collections, 'version' => (string) ($t['t'] ?? '')]);
    }

    if (preg_match('#^/content/([A-Za-z]+)$#', $route, $m) && $method === 'GET') {
        if (!in_array($m[1], COLLECTIONS, true)) {
            fail(404, 'Unknown collection.');
        }
        ok(published($m[1]));
    }

    /** Serve an image uploaded from the admin console. Ids carry a random suffix, so they cache forever. */
    if (preg_match('#^/media/([a-z0-9][a-z0-9-]{0,80}\.(?:jpg|png|webp|avif|gif))$#', strtolower($route), $m) && $method === 'GET') {
        try {
            // No DDL on this hot path: if the table doesn't exist yet, nothing was ever uploaded.
            $row = one('SELECT mime_type, data_base64 FROM media WHERE id = ?', [$m[1]]);
        } catch (Throwable $e) {
            $row = null;
        }
        $bytes = $row ? base64_decode((string) $row['data_base64'], true) : false;
        if ($bytes === false) {
            fail(404, 'Image not found.');
        }
        header('Content-Type: ' . $row['mime_type']);
        header('Content-Length: ' . strlen($bytes));
        header('Cache-Control: public, max-age=31536000, immutable');
        // Defensive: these bytes are user-supplied, so never let them run as a document.
        header("Content-Security-Policy: default-src 'none'; img-src 'self' data:; sandbox");
        header('Cross-Origin-Resource-Policy: cross-origin');
        echo $bytes;
        exit;
    }

    if ($route === '/enquiries' && $method === 'POST') {
        rate_limit('form:' . client_ip(), 12, 3600);
        if (s($b['website'] ?? '', 200) !== '') {
            ok(['reference' => new_reference('NF'), 'message' => 'Received'], 201);
        }
        $name = s($b['name'] ?? '', 120);
        $email = strtolower(s($b['email'] ?? '', 160));
        $details = s($b['details'] ?? '', 5000);
        $errors = [];
        if (strlen($name) < 2) {
            $errors['name'] = 'Please enter your name.';
        }
        if (!is_email($email)) {
            $errors['email'] = 'Please enter a valid email address.';
        }
        if (strlen($details) < 10) {
            $errors['details'] = 'Please share a little more detail about the project.';
        }
        if ($errors) {
            fail(422, 'Please check the highlighted fields.', ['errors' => $errors]);
        }
        $budget = s($b['budget'] ?? '', 80) ?: 'Not specified';
        $reference = new_reference('NF');
        q('INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline, project_details, source, value_estimate, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            $reference, $name, s($b['companyName'] ?? '', 160), $email, s($b['phone'] ?? '', 40),
            s($b['service'] ?? '', 100) ?: 'General enquiry', $budget, s($b['timeline'] ?? '', 120), $details,
            strtolower((string) preg_replace('/[^a-z_-]/i', '', s($b['source'] ?? '', 30))) ?: 'contact',
            estimate_value($budget), client_ip(), client_ua(),
        ]);
        ok(['reference' => $reference, 'message' => 'Enquiry received. We reply within 12 business hours.'], 201);
    }

    if ($route === '/bookings/availability' && $method === 'GET') {
        $settings = site_settings();
        $tz = $settings['timezone'] ?? 'Asia/Kolkata';
        $from = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($_GET['from'] ?? '')) ? (string) $_GET['from'] : date_in_tz($tz);
        $to = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($_GET['to'] ?? '')) ? (string) $_GET['to'] : date_in_tz($tz, 45);
        $taken = [];
        foreach (all_rows("SELECT slot_date, slot_time FROM bookings WHERE slot_date BETWEEN ? AND ? AND status IN ('scheduled','confirmed')", [$from, $to]) as $r) {
            $taken[$r['slot_date']][] = $r['slot_time'];
        }
        ok(['taken' => (object) $taken, 'slots' => $settings['booking']['slots'] ?? [], 'timezone' => $tz]);
    }

    if ($route === '/bookings' && $method === 'POST') {
        rate_limit('form:' . client_ip(), 12, 3600);
        if (s($b['website'] ?? '', 200) !== '') {
            ok(['reference' => new_reference('NFC')], 201);
        }
        $settings = site_settings();
        $tz = $settings['timezone'] ?? 'Asia/Kolkata';
        $name = s($b['name'] ?? '', 120);
        $email = strtolower(s($b['email'] ?? '', 160));
        $date = s($b['date'] ?? '', 10);
        $time = s($b['time'] ?? '', 12);
        $topic = s($b['topic'] ?? '', 100) ?: 'Discovery call';
        $errors = [];
        if (strlen($name) < 2) {
            $errors['name'] = 'Please enter your name.';
        }
        if (!is_email($email)) {
            $errors['email'] = 'Please enter a valid email address.';
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors['date'] = 'Please choose a day.';
        }
        if (!in_array($time, $settings['booking']['slots'] ?? [], true)) {
            $errors['time'] = 'Please choose one of the available times.';
        }
        if ($errors) {
            fail(422, 'Please check the highlighted fields.', ['errors' => $errors]);
        }
        $weekday = (int) gmdate('w', strtotime($date . ' 12:00:00 UTC'));
        $latest = date_in_tz($tz, (int) ($settings['booking']['daysAhead'] ?? 10) + 10);
        if ($date <= date_in_tz($tz) || $date > $latest || !in_array($weekday, $settings['workingHours']['days'] ?? [], true)) {
            fail(422, "That day isn't available for calls — please pick another.", ['errors' => ['date' => 'Unavailable day']]);
        }
        $budget = s($b['budget'] ?? '', 80);
        $notes = s($b['notes'] ?? '', 2000);
        $company = s($b['companyName'] ?? '', 160);
        $phone = s($b['phone'] ?? '', 40);
        $reference = new_reference('NFC');
        $pdo = db();
        $pdo->beginTransaction();
        try {
            q('INSERT INTO enquiries (reference, name, company_name, email, phone, service, budget_range, timeline, project_details, source, value_estimate, ip_address, user_agent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                new_reference('NF'), $name, $company, $email, $phone, "Discovery call — $topic", $budget ?: 'To discuss on call',
                "Call booked for $date · $time " . ($settings['timezoneLabel'] ?? 'IST'), $notes ?: "Discovery call requested about: $topic.",
                'booking', estimate_value($budget), client_ip(), client_ua(),
            ]);
            $enquiryId = (int) $pdo->lastInsertId();
            q('INSERT INTO bookings (reference, name, email, phone, company_name, topic, budget_range, notes, slot_date, slot_time, timezone, enquiry_id, ip_address, user_agent)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                $reference, $name, $email, $phone, $company, $topic, $budget, $notes, $date, $time, $tz, $enquiryId, client_ip(), client_ua(),
            ]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        ok(['reference' => $reference, 'date' => $date, 'time' => $time, 'timezone' => $settings['timezoneLabel'] ?? 'IST', 'durationMinutes' => (int) ($settings['booking']['durationMinutes'] ?? 30)], 201);
    }

    if ($route === '/subscribe' && $method === 'POST') {
        rate_limit('subscribe:' . client_ip(), 10, 3600);
        $email = strtolower(s($b['email'] ?? '', 160));
        if (!is_email($email)) {
            fail(422, 'Please enter a valid email address.');
        }
        $stmt = q('INSERT IGNORE INTO subscribers (email, source) VALUES (?, ?)', [$email, s($b['source'] ?? '', 40) ?: 'footer']);
        ok(['subscribed' => true, 'existing' => $stmt->rowCount() === 0]);
    }

    if ($route === '/events' && $method === 'POST') {
        rate_limit('events:' . client_ip(), 120, 60);
        $name = (string) preg_replace('/[^a-z0-9_:-]/i', '', s($b['name'] ?? '', 40));
        if ($name === '') {
            fail(422, 'Event name required.');
        }
        $meta = is_assoc($b['meta'] ?? null) ? substr((string) json_encode($b['meta'], JSON_UNESCAPED_UNICODE), 0, 1000) : null;
        q('INSERT INTO events (name, path, session_id, referrer, meta) VALUES (?, ?, ?, ?, ?)', [
            $name, s($b['path'] ?? '', 200), s($b['sid'] ?? '', 64), s($b['referrer'] ?? '', 300), $meta,
        ]);
        ok(null, 202);
    }

    if (!str_starts_with($route, '/admin')) {
        return;
    }

    /* -------------------------- Auth -------------------------- */
    global $ADMIN;

    if ($route === '/admin/login' && $method === 'POST') {
        $email = strtolower(s($b['email'] ?? '', 160));
        $password = is_string($b['password'] ?? null) ? $b['password'] : '';
        rate_limit('login:' . client_ip() . '|' . $email, 8, 900, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
        if ($email === '' || $password === '') {
            fail(400, 'Email and password are required.');
        }
        if ((int) (one('SELECT count(*) AS c FROM admin_users')['c'] ?? 0) === 0) {
            fail(503, 'No admin account yet — set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters) in server/php/.env, then sign in.');
        }
        $user = one('SELECT * FROM admin_users WHERE email = ?', [$email]);
        $valid = $user ? verify_password($password, $user['password_hash'], $user['salt']) : (verify_password($password, str_repeat('0', 128), 'timing') && false);
        if (!$user || !$valid || (int) $user['active'] !== 1) {
            q('INSERT INTO audit_logs (admin_id, admin_email, action, target, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)', [$user['id'] ?? null, $email, 'LOGIN_FAILED', 'AUTH', 'Invalid credentials', client_ip()]);
            fail(401, 'Invalid email or password.');
        }
        $token = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $expires = gmdate('Y-m-d H:i:s', time() + (int) env('SESSION_DAYS') * 86400);
        q('INSERT INTO sessions (token_hash, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)', [hash('sha256', $token), $user['id'], client_ip(), client_ua(), $expires]);
        q('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [$user['id']]);
        $ADMIN = ['id' => (int) $user['id'], 'email' => $user['email'], 'fullName' => $user['full_name'], 'role' => $user['role'], 'sessionId' => 0];
        audit('LOGIN', 'AUTH', 'Signed in');
        ok(['token' => $token, 'expiresAt' => $expires, 'user' => public_user($user)]);
    }

    if ($route === '/admin/me' && $method === 'GET') {
        $a = require_role('editor');
        ok(['user' => public_user(one('SELECT * FROM admin_users WHERE id = ?', [$a['id']]) ?? [])]);
    }

    if ($route === '/admin/logout' && $method === 'POST') {
        $a = require_role('editor');
        q('DELETE FROM sessions WHERE id = ?', [$a['sessionId']]);
        audit('LOGOUT', 'AUTH', 'Signed out');
        ok();
    }

    if ($route === '/admin/password' && $method === 'POST') {
        $a = require_role('editor');
        $user = one('SELECT * FROM admin_users WHERE id = ?', [$a['id']]);
        $current = is_string($b['currentPassword'] ?? null) ? $b['currentPassword'] : '';
        $next = is_string($b['newPassword'] ?? null) ? $b['newPassword'] : '';
        if (!$user || !verify_password($current, $user['password_hash'], $user['salt'])) {
            fail(400, 'Your current password is incorrect.');
        }
        if (strlen($next) < 10) {
            fail(422, 'The new password must be at least 10 characters.');
        }
        $h = hash_password($next);
        q('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?', [$h['hash'], $h['salt'], $a['id']]);
        q('DELETE FROM sessions WHERE user_id = ? AND id != ?', [$a['id'], $a['sessionId']]);
        audit('PASSWORD_CHANGED', 'USER_' . $a['id'], 'Password changed; other sessions revoked');
        ok();
    }

    if ($route === '/admin/sessions' && $method === 'GET') {
        $a = require_role('editor');
        $rows = all_rows('SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC', [$a['id']]);
        ok(array_map(fn ($r) => $r + ['current' => (int) $r['id'] === $a['sessionId']], $rows));
    }

    if (preg_match('#^/admin/sessions/(\d+)$#', $route, $m) && $method === 'DELETE') {
        $a = require_role('editor');
        if (!q('DELETE FROM sessions WHERE id = ? AND user_id = ?', [(int) $m[1], $a['id']])->rowCount()) {
            fail(404, 'Session not found.');
        }
        audit('SESSION_REVOKED', 'SESSION_' . $m[1]);
        ok();
    }

    /* -------------------------- Dashboard -------------------------- */
    if ($route === '/admin/overview' && $method === 'GET') {
        require_role('admin');
        $tzMin = tz_minutes();
        $today = date_in_tz(site_settings()['timezone'] ?? 'Asia/Kolkata');
        $leads = one("SELECT count(*) AS total, sum(status = 'new') AS fresh, sum(status = 'won') AS won, sum(status = 'lost') AS lost,
            sum(created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS last7,
            sum(created_at < UTC_TIMESTAMP() - INTERVAL 7 DAY AND created_at >= UTC_TIMESTAMP() - INTERVAL 14 DAY) AS prev7,
            sum(CASE WHEN status IN ('new','contacted','qualified','proposal') THEN coalesce(value_estimate, 0) END) AS pipeline,
            sum(CASE WHEN status = 'won' THEN coalesce(value_estimate, 0) END) AS wonValue FROM enquiries") ?? [];
        $traffic = one("SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events WHERE name = 'page_view' AND created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY") ?? [];
        $subs = one('SELECT count(*) AS total, sum(created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY) AS last7 FROM subscribers') ?? [];
        $upcoming = (int) (one("SELECT count(*) AS c FROM bookings WHERE slot_date >= ? AND status IN ('scheduled','confirmed')", [$today])['c'] ?? 0);
        $won = (int) ($leads['won'] ?? 0);
        $decided = $won + (int) ($leads['lost'] ?? 0);
        ok([
            'kpis' => [
                'leadsTotal' => (int) ($leads['total'] ?? 0),
                'leadsNew' => (int) ($leads['fresh'] ?? 0),
                'leads7d' => (int) ($leads['last7'] ?? 0),
                'leadsPrev7d' => (int) ($leads['prev7'] ?? 0),
                'won' => $won,
                'winRate' => $decided ? (int) round($won / $decided * 100) : null,
                'pipelineValue' => (int) ($leads['pipeline'] ?? 0),
                'wonValue' => (int) ($leads['wonValue'] ?? 0),
                'bookingsUpcoming' => $upcoming,
                'subscribers' => (int) ($subs['total'] ?? 0),
                'subscribers7d' => (int) ($subs['last7'] ?? 0),
                'views7d' => (int) ($traffic['views'] ?? 0),
                'visitors7d' => (int) ($traffic['visitors'] ?? 0),
            ],
            'leadsSeries' => daily_series("SELECT DATE(created_at + INTERVAL $tzMin MINUTE) AS day, count(*) AS c FROM enquiries WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 31 DAY GROUP BY day", 30),
            'viewsSeries' => daily_series("SELECT DATE(created_at + INTERVAL $tzMin MINUTE) AS day, count(*) AS c FROM events WHERE name = 'page_view' AND created_at >= UTC_TIMESTAMP() - INTERVAL 31 DAY GROUP BY day", 30),
            'pipeline' => array_map(fn ($r) => ['status' => $r['status'], 'count' => (int) $r['count'], 'value' => (int) $r['value']], all_rows('SELECT status, count(*) AS count, coalesce(sum(value_estimate), 0) AS value FROM enquiries GROUP BY status')),
            'sources' => array_map(fn ($r) => ['source' => $r['source'], 'count' => (int) $r['count']], all_rows('SELECT source, count(*) AS count FROM enquiries GROUP BY source ORDER BY count DESC')),
            'services' => array_map(fn ($r) => ['service' => $r['service'], 'count' => (int) $r['count']], all_rows('SELECT service, count(*) AS count FROM enquiries GROUP BY service ORDER BY count DESC LIMIT 6')),
            'upcomingBookings' => all_rows("SELECT id, reference, name, company_name AS companyName, topic, slot_date AS date, slot_time AS time, status, meeting_link AS meetingLink
                FROM bookings WHERE slot_date >= ? AND status IN ('scheduled','confirmed') ORDER BY slot_date, slot_time LIMIT 6", [$today]),
            'recentLeads' => all_rows('SELECT id, reference, name, company_name AS companyName, service, budget_range AS budget, status, priority, created_at AS createdAt FROM enquiries ORDER BY created_at DESC, id DESC LIMIT 6'),
            'recentActivity' => all_rows('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 8'),
            'content' => array_map(fn ($r) => ['collection' => $r['collection'], 'published' => (int) $r['published'], 'total' => (int) $r['total']], all_rows('SELECT collection, sum(published) AS published, count(*) AS total FROM content GROUP BY collection')),
        ]);
    }

    if ($route === '/admin/analytics' && $method === 'GET') {
        require_role('admin');
        $days = min(max((int) ($_GET['days'] ?? 30), 7), 180);
        $tzMin = tz_minutes();
        $since = "UTC_TIMESTAMP() - INTERVAL $days DAY";
        $views = daily_series("SELECT DATE(created_at + INTERVAL $tzMin MINUTE) AS day, count(*) AS c FROM events WHERE name = 'page_view' AND created_at >= $since GROUP BY day", $days);
        $visitors = daily_series("SELECT DATE(created_at + INTERVAL $tzMin MINUTE) AS day, count(DISTINCT session_id) AS c FROM events WHERE name = 'page_view' AND created_at >= $since GROUP BY day", $days);
        $totals = one("SELECT count(*) AS views, count(DISTINCT session_id) AS visitors FROM events WHERE name = 'page_view' AND created_at >= $since") ?? [];
        $leadCount = (int) (one("SELECT count(*) AS c FROM enquiries WHERE created_at >= $since")['c'] ?? 0);
        $visitorCount = (int) ($totals['visitors'] ?? 0);
        $series = [];
        foreach ($views as $i => $v) {
            $series[] = ['date' => $v['date'], 'views' => $v['count'], 'visitors' => $visitors[$i]['count'] ?? 0];
        }
        ok([
            'days' => $days,
            'totals' => ['views' => (int) ($totals['views'] ?? 0), 'visitors' => $visitorCount, 'leads' => $leadCount, 'conversion' => $visitorCount ? round($leadCount / $visitorCount * 100, 2) : 0],
            'series' => $series,
            'topPages' => array_map(fn ($r) => ['path' => $r['path'], 'views' => (int) $r['views']], all_rows("SELECT path, count(*) AS views FROM events WHERE name = 'page_view' AND created_at >= $since GROUP BY path ORDER BY views DESC LIMIT 10")),
            'topEvents' => array_map(fn ($r) => ['name' => $r['name'], 'count' => (int) $r['count']], all_rows("SELECT name, count(*) AS count FROM events WHERE name != 'page_view' AND created_at >= $since GROUP BY name ORDER BY count DESC LIMIT 10")),
            'ctas' => array_map(fn ($r) => ['label' => $r['label'] ?? 'unknown', 'count' => (int) $r['count']], all_rows("SELECT coalesce(JSON_UNQUOTE(JSON_EXTRACT(meta, '$.label')), 'unknown') AS label, count(*) AS count FROM events WHERE name = 'cta_click' AND created_at >= $since GROUP BY label ORDER BY count DESC LIMIT 10")),
            'referrers' => array_map(fn ($r) => ['referrer' => $r['referrer'], 'count' => (int) $r['count']], all_rows("SELECT referrer, count(*) AS count FROM events WHERE name = 'page_view' AND referrer IS NOT NULL AND referrer != '' AND created_at >= $since GROUP BY referrer ORDER BY count DESC LIMIT 8")),
        ]);
    }

    /* -------------------------- Leads -------------------------- */
    if ($route === '/admin/enquiries' && $method === 'GET') {
        require_role('admin');
        ok(all_rows('SELECT ' . LEAD_COLUMNS . ' FROM enquiries ORDER BY created_at DESC, id DESC'));
    }

    if (preg_match('#^/admin/enquiries/(\d+)$#', $route, $m)) {
        $a = require_role('admin');
        $id = (int) $m[1];
        $lead = one('SELECT ' . LEAD_COLUMNS . ' FROM enquiries WHERE id = ?', [$id]);
        if (!$lead) {
            fail(404, 'Lead not found.');
        }
        if ($method === 'GET') {
            $activity = all_rows('SELECT id, kind, body, admin_name AS author, created_at AS createdAt FROM enquiry_notes WHERE enquiry_id = ? ORDER BY id DESC', [$id]);
            $booking = one('SELECT id, reference, slot_date AS date, slot_time AS time, status FROM bookings WHERE enquiry_id = ?', [$id]);
            ok($lead + ['activity' => $activity, 'booking' => $booking]);
        }
        if ($method === 'PATCH') {
            $sets = [];
            $params = [];
            if (array_key_exists('status', $b)) {
                if (!in_array($b['status'], LEAD_STATUSES, true)) {
                    fail(422, 'Invalid status.');
                }
                $sets[] = 'status = ?';
                $params[] = $b['status'];
            }
            if (array_key_exists('priority', $b)) {
                if (!in_array($b['priority'], LEAD_PRIORITIES, true)) {
                    fail(422, 'Invalid priority.');
                }
                $sets[] = 'priority = ?';
                $params[] = $b['priority'];
            }
            if (array_key_exists('valueEstimate', $b)) {
                $v = $b['valueEstimate'];
                $v = ($v === null || $v === '') ? null : max(0, (int) round((float) $v));
                $sets[] = 'value_estimate = ?';
                $params[] = $v;
            }
            if (array_key_exists('notes', $b)) {
                $sets[] = 'internal_notes = ?';
                $params[] = s($b['notes'], 4000);
            }
            if (!$sets) {
                fail(400, 'Nothing to update.');
            }
            $params[] = $id;
            q('UPDATE enquiries SET ' . implode(', ', $sets) . ', updated_at = UTC_TIMESTAMP() WHERE id = ?', $params);
            if (array_key_exists('status', $b) && $b['status'] !== $lead['status']) {
                q('INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)', [$id, $a['id'], $a['fullName'], 'status', "Status changed from {$lead['status']} to {$b['status']}"]);
            }
            if (array_key_exists('priority', $b) && $b['priority'] !== $lead['priority']) {
                q('INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)', [$id, $a['id'], $a['fullName'], 'priority', "Priority set to {$b['priority']}"]);
            }
            audit('LEAD_UPDATED', "LEAD_$id", implode(', ', array_keys($b)));
            ok(one('SELECT ' . LEAD_COLUMNS . ' FROM enquiries WHERE id = ?', [$id]));
        }
        if ($method === 'DELETE') {
            q('DELETE FROM enquiries WHERE id = ?', [$id]);
            audit('LEAD_DELETED', "LEAD_$id");
            ok();
        }
    }

    if (preg_match('#^/admin/enquiries/(\d+)/notes$#', $route, $m) && $method === 'POST') {
        $a = require_role('admin');
        $id = (int) $m[1];
        $text = s($b['body'] ?? '', 4000);
        if ($text === '') {
            fail(422, "Note can't be empty.");
        }
        if (!one('SELECT id FROM enquiries WHERE id = ?', [$id])) {
            fail(404, 'Lead not found.');
        }
        q('INSERT INTO enquiry_notes (enquiry_id, admin_id, admin_name, kind, body) VALUES (?, ?, ?, ?, ?)', [$id, $a['id'], $a['fullName'], 'note', $text]);
        $noteId = (int) db()->lastInsertId();
        q('UPDATE enquiries SET updated_at = UTC_TIMESTAMP() WHERE id = ?', [$id]);
        audit('LEAD_NOTE', "LEAD_$id");
        ok(['id' => $noteId, 'kind' => 'note', 'body' => $text, 'author' => $a['fullName'], 'createdAt' => gmdate('c')], 201);
    }

    /* -------------------------- Bookings -------------------------- */
    if ($route === '/admin/bookings' && $method === 'GET') {
        require_role('admin');
        ok(all_rows('SELECT ' . BOOKING_COLUMNS . ' FROM bookings ORDER BY slot_date DESC, slot_time DESC'));
    }

    if (preg_match('#^/admin/bookings/(\d+)$#', $route, $m)) {
        require_role('admin');
        $id = (int) $m[1];
        if (!one('SELECT id FROM bookings WHERE id = ?', [$id])) {
            fail(404, 'Booking not found.');
        }
        if ($method === 'PATCH') {
            $sets = [];
            $params = [];
            if (array_key_exists('status', $b)) {
                if (!in_array($b['status'], BOOKING_STATUSES, true)) {
                    fail(422, 'Invalid status.');
                }
                $sets[] = 'status = ?';
                $params[] = $b['status'];
            }
            if (array_key_exists('meetingLink', $b)) {
                $link = s($b['meetingLink'], 300);
                if ($link !== '' && !preg_match('#^https?://#i', $link)) {
                    fail(422, 'Meeting link must start with http:// or https://');
                }
                $sets[] = 'meeting_link = ?';
                $params[] = $link;
            }
            if (array_key_exists('internalNotes', $b)) {
                $sets[] = 'internal_notes = ?';
                $params[] = s($b['internalNotes'], 4000);
            }
            if (array_key_exists('date', $b) || array_key_exists('time', $b)) {
                $date = s($b['date'] ?? '', 10);
                $time = s($b['time'] ?? '', 12);
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $time === '') {
                    fail(422, 'Provide both a valid date and time.');
                }
                $sets[] = 'slot_date = ?';
                $sets[] = 'slot_time = ?';
                array_push($params, $date, $time);
            }
            if (!$sets) {
                fail(400, 'Nothing to update.');
            }
            $params[] = $id;
            try {
                q('UPDATE bookings SET ' . implode(', ', $sets) . ', updated_at = UTC_TIMESTAMP() WHERE id = ?', $params);
            } catch (Throwable $e) {
                if (str_contains($e->getMessage(), 'Duplicate entry')) {
                    fail(409, 'Another call is already booked in that slot.');
                }
                throw $e;
            }
            audit('BOOKING_UPDATED', "BOOKING_$id", implode(', ', array_keys($b)));
            ok(one('SELECT ' . BOOKING_COLUMNS . ' FROM bookings WHERE id = ?', [$id]));
        }
        if ($method === 'DELETE') {
            q('DELETE FROM bookings WHERE id = ?', [$id]);
            audit('BOOKING_DELETED', "BOOKING_$id");
            ok();
        }
    }

    /* -------------------------- Subscribers -------------------------- */
    if ($route === '/admin/subscribers' && $method === 'GET') {
        require_role('admin');
        ok(all_rows('SELECT id, email, source, created_at AS createdAt FROM subscribers ORDER BY id DESC'));
    }

    if (preg_match('#^/admin/subscribers/(\d+)$#', $route, $m) && $method === 'DELETE') {
        require_role('admin');
        if (!q('DELETE FROM subscribers WHERE id = ?', [(int) $m[1]])->rowCount()) {
            fail(404, 'Subscriber not found.');
        }
        audit('SUBSCRIBER_DELETED', 'SUBSCRIBER_' . $m[1]);
        ok();
    }

    /* -------------------------- CMS -------------------------- */
    if (preg_match('#^/admin/content/([A-Za-z]+)(?:/([^/]+))?(?:/(reorder|reset))?$#', $route, $m)) {
        $name = $m[1];
        if (!in_array($name, COLLECTIONS, true)) {
            fail(404, 'Unknown collection.');
        }
        $second = isset($m[2]) ? rawurldecode($m[2]) : '';
        $action = $m[3] ?? (in_array($second, ['reorder', 'reset'], true) ? $second : '');
        $id = ($second !== '' && !in_array($second, ['reorder', 'reset'], true)) ? $second : '';

        $validate = function ($data) use ($name): void {
            if (!is_assoc($data)) {
                fail(422, 'Content must be an object.');
            }
            if (strlen((string) json_encode($data)) > 200000) {
                fail(422, 'This entry is too large.');
            }
            foreach (REQUIRED[$name] as $field) {
                if (!is_string($data[$field] ?? null) || trim($data[$field]) === '') {
                    fail(422, "\"$field\" is required.");
                }
            }
        };

        if ($action === 'reorder' && $method === 'POST') {
            require_role('editor');
            $ids = is_array($b['ids'] ?? null) ? array_map('strval', $b['ids']) : [];
            if (!$ids) {
                fail(422, 'Provide the new order as an array of IDs.');
            }
            foreach ($ids as $i => $eid) {
                q('UPDATE content SET sort_order = ?, updated_at = UTC_TIMESTAMP() WHERE collection = ? AND id = ?', [($i + 1) * 10, $name, $eid]);
            }
            audit('CONTENT_REORDERED', $name);
            ok(all_entries($name));
        }
        if ($action === 'reset' && $method === 'POST') {
            require_role('admin');
            seed_collection($name);
            audit('CONTENT_RESET', $name, 'Restored shipped defaults');
            ok(all_entries($name));
        }
        if ($id === '' && $method === 'GET') {
            require_role('editor');
            ok(all_entries($name));
        }
        if ($id === '' && $method === 'POST') {
            require_role('editor');
            $data = $b['data'] ?? null;
            $validate($data);
            $base = s($b['id'] ?? '', 80) ?: (s($data['id'] ?? '', 80) ?: slugify((string) ($data['title'] ?? $data['name'] ?? $data['q'] ?? 'item')));
            $newId = slugify($base) ?: 'item-' . base_convert((string) time(), 10, 36);
            while (one('SELECT id FROM content WHERE collection = ? AND id = ?', [$name, $newId])) {
                $newId = substr(slugify($base), 0, 70) . '-' . bin2hex(random_bytes(2));
            }
            $data['id'] = $newId;
            $max = (int) (one('SELECT coalesce(max(sort_order), 0) AS m FROM content WHERE collection = ?', [$name])['m'] ?? 0);
            q('INSERT INTO content (collection, id, data, sort_order, published) VALUES (?, ?, ?, ?, ?)', [
                $name, $newId, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $max + 10, ($b['published'] ?? true) === false ? 0 : 1,
            ]);
            audit('CONTENT_CREATED', "$name/$newId", (string) ($data['title'] ?? $data['name'] ?? $data['q'] ?? ''));
            ok(parse_row(one('SELECT * FROM content WHERE collection = ? AND id = ?', [$name, $newId])), 201);
        }
        if ($id !== '') {
            require_role('editor');
            $row = one('SELECT * FROM content WHERE collection = ? AND id = ?', [$name, $id]);
            if (!$row) {
                fail(404, 'Entry not found.');
            }
            if ($method === 'PUT') {
                $data = $b['data'] ?? null;
                $validate($data);
                $requested = s($b['newId'] ?? '', 80);
                if ($requested !== '' && $requested !== $id) {
                    if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/', $requested)) {
                        fail(422, 'Invalid ID — use lowercase letters, numbers and dashes.');
                    }
                    if (one('SELECT id FROM content WHERE collection = ? AND id = ?', [$name, $requested])) {
                        fail(409, 'Another entry already uses that ID.');
                    }
                    q('UPDATE content SET id = ? WHERE collection = ? AND id = ?', [$requested, $name, $id]);
                    $id = $requested;
                }
                $data['id'] = $id;
                $published = array_key_exists('published', $b) ? ($b['published'] ? 1 : 0) : (int) $row['published'];
                $sort = isset($b['sortOrder']) && is_numeric($b['sortOrder']) ? (int) $b['sortOrder'] : (int) $row['sort_order'];
                q('UPDATE content SET data = ?, published = ?, sort_order = ?, updated_at = UTC_TIMESTAMP() WHERE collection = ? AND id = ?', [
                    json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $published, $sort, $name, $id,
                ]);
                audit('CONTENT_UPDATED', "$name/$id");
                ok(parse_row(one('SELECT * FROM content WHERE collection = ? AND id = ?', [$name, $id])));
            }
            if ($method === 'DELETE') {
                q('DELETE FROM content WHERE collection = ? AND id = ?', [$name, $id]);
                audit('CONTENT_DELETED', "$name/$id");
                ok();
            }
        }
    }

    /* -------------------------- Media -------------------------- */
    if ($route === '/admin/media' && $method === 'POST') {
        $me = require_role('editor');
        rate_limit('upload:' . client_ip(), 120, 3600, 'Too many uploads — please wait a few minutes.');
        $mime = trim(explode(';', strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')))[0]);
        $ext = MEDIA_TYPES[$mime] ?? '';
        if ($ext === '') {
            fail(415, 'Please upload a JPG, PNG, WebP, AVIF or GIF image.');
        }
        $bytes = file_get_contents('php://input') ?: '';
        if ($bytes === '') {
            fail(422, 'The upload was empty — please choose the file again. (If large images always fail, raise post_max_size on the host.)');
        }
        if (strlen($bytes) > MEDIA_MAX_BYTES) {
            fail(413, 'Images must be 4 MB or smaller.');
        }
        if (!sniff_image($bytes, $mime)) {
            fail(415, "That file doesn't look like a real image.");
        }
        $original = s($_GET['name'] ?? '', 120) ?: "image.$ext";
        $base = substr(slugify((string) preg_replace('/\.[A-Za-z0-9]+$/', '', $original)), 0, 64) ?: 'image';
        $id = $base . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        media_table();
        q('INSERT INTO media (id, filename, mime_type, bytes, data_base64, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)', [
            $id, $original, $mime, strlen($bytes), base64_encode($bytes), $me['email'],
        ]);
        audit('MEDIA_UPLOADED', "MEDIA_$id", $mime . ' · ' . round(strlen($bytes) / 1024) . ' kB');
        // `path` is relative to the API base so the client can build the right URL.
        ok(['id' => $id, 'path' => "/media/$id", 'bytes' => strlen($bytes), 'mimeType' => $mime], 201);
    }

    if ($route === '/admin/media' && $method === 'GET') {
        require_role('editor');
        media_table();
        $rows = all_rows('SELECT id, filename, mime_type AS mimeType, bytes, created_at AS createdAt FROM media ORDER BY created_at DESC LIMIT 200');
        ok(array_map(function (array $r): array {
            $r['path'] = '/media/' . $r['id'];
            $r['bytes'] = (int) $r['bytes'];
            return $r;
        }, $rows));
    }

    if (preg_match('#^/admin/media/([A-Za-z0-9][A-Za-z0-9.-]{0,99})$#', $route, $m) && $method === 'DELETE') {
        require_role('admin');
        media_table();
        $stmt = q('DELETE FROM media WHERE id = ?', [strtolower($m[1])]);
        if ($stmt->rowCount() === 0) {
            fail(404, 'Image not found.');
        }
        audit('MEDIA_DELETED', 'MEDIA_' . strtolower($m[1]));
        ok();
    }

    /* -------------------------- Settings -------------------------- */
    if ($route === '/admin/settings' && $method === 'GET') {
        require_role('editor');
        ok(['site' => site_settings(), 'advanced' => advanced_settings()]);
    }

    if (preg_match('#^/admin/settings/(site|advanced)$#', $route, $m) && $method === 'PUT') {
        require_role('admin');
        $key = $m[1];
        $value = $b['value'] ?? null;
        if (!is_assoc($value)) {
            fail(422, 'Settings must be an object.');
        }
        if (strlen((string) json_encode($value)) > 300000) {
            fail(422, 'Settings document is too large.');
        }
        if ($key === 'site') {
            if (array_key_exists('email', $value) && !is_email((string) $value['email'])) {
                fail(422, 'Please provide a valid contact email.');
            }
            if (array_key_exists('whatsapp', $value) && !preg_match('/^\d{8,15}$/', (string) $value['whatsapp'])) {
                fail(422, 'WhatsApp must be digits only, with country code (e.g. 918447859784).');
            }
            if (isset($value['booking']['slots']) && (!is_array($value['booking']['slots']) || !$value['booking']['slots'])) {
                fail(422, 'Provide at least one booking time slot.');
            }
        } else {
            if (isset($value['estimator']) && (!is_array($value['estimator']['types'] ?? null) || !$value['estimator']['types'])) {
                fail(422, 'The estimator needs at least one project type.');
            }
        }
        $merged = deep_merge($key === 'site' ? site_settings() : advanced_settings(), $value);
        write_setting($key, $merged);
        audit('SETTINGS_UPDATED', 'SETTINGS_' . strtoupper($key));
        ok($key === 'site' ? site_settings() : advanced_settings());
    }

    /* -------------------------- Audit, users, export -------------------------- */
    if ($route === '/admin/audit' && $method === 'GET') {
        require_role('admin');
        $limit = min(max((int) ($_GET['limit'] ?? 100), 10), 500);
        ok(all_rows("SELECT * FROM audit_logs ORDER BY id DESC LIMIT $limit"));
    }

    if ($route === '/admin/users' && $method === 'GET') {
        require_role('owner');
        ok(array_map(fn ($u) => public_user($u) + ['active' => (int) $u['active'] === 1, 'createdAt' => $u['created_at']], all_rows('SELECT id, email, full_name, role, active, last_login_at, created_at FROM admin_users ORDER BY id')));
    }

    if ($route === '/admin/users' && $method === 'POST') {
        require_role('owner');
        $email = strtolower(s($b['email'] ?? '', 160));
        $fullName = s($b['fullName'] ?? '', 120);
        $role = (string) ($b['role'] ?? 'editor');
        $password = is_string($b['password'] ?? null) ? $b['password'] : '';
        if (!is_email($email)) {
            fail(422, 'Please provide a valid email.');
        }
        if (strlen($fullName) < 2) {
            fail(422, "Please provide the person's name.");
        }
        if (!isset(ROLE_RANK[$role])) {
            fail(422, 'Invalid role.');
        }
        if (strlen($password) < 10) {
            fail(422, 'Temporary password must be at least 10 characters.');
        }
        if (one('SELECT id FROM admin_users WHERE email = ?', [$email])) {
            fail(409, 'A user with that email already exists.');
        }
        $h = hash_password($password);
        q('INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)', [$email, $h['hash'], $h['salt'], $fullName, $role]);
        $newId = (int) db()->lastInsertId();
        audit('USER_CREATED', "USER_$newId", "$email as $role");
        ok(['id' => $newId], 201);
    }

    if (preg_match('#^/admin/users/(\d+)$#', $route, $m)) {
        $a = require_role('owner');
        $id = (int) $m[1];
        $user = one('SELECT * FROM admin_users WHERE id = ?', [$id]);
        if (!$user) {
            fail(404, 'User not found.');
        }
        if ($method === 'PATCH') {
            $demoting = $user['role'] === 'owner' && ((isset($b['role']) && $b['role'] !== 'owner') || (array_key_exists('active', $b) && !$b['active']));
            if ($demoting && (int) (one("SELECT count(*) AS c FROM admin_users WHERE role = 'owner' AND active = 1")['c'] ?? 0) <= 1) {
                fail(422, 'At least one active owner is required.');
            }
            if (isset($b['role'])) {
                if (!isset(ROLE_RANK[$b['role']])) {
                    fail(422, 'Invalid role.');
                }
                q('UPDATE admin_users SET role = ? WHERE id = ?', [$b['role'], $id]);
            }
            if (isset($b['fullName'])) {
                q('UPDATE admin_users SET full_name = ? WHERE id = ?', [s($b['fullName'], 120), $id]);
            }
            if (array_key_exists('active', $b)) {
                q('UPDATE admin_users SET active = ? WHERE id = ?', [$b['active'] ? 1 : 0, $id]);
                if (!$b['active']) {
                    q('DELETE FROM sessions WHERE user_id = ?', [$id]);
                }
            }
            if (array_key_exists('password', $b)) {
                if (!is_string($b['password']) || strlen($b['password']) < 10) {
                    fail(422, 'Password must be at least 10 characters.');
                }
                $h = hash_password($b['password']);
                q('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?', [$h['hash'], $h['salt'], $id]);
                q('DELETE FROM sessions WHERE user_id = ?', [$id]);
            }
            audit('USER_UPDATED', "USER_$id", implode(', ', array_diff(array_keys($b), ['password'])) ?: 'password');
            ok();
        }
        if ($method === 'DELETE') {
            if ($id === $a['id']) {
                fail(422, "You can't delete your own account.");
            }
            q('DELETE FROM admin_users WHERE id = ?', [$id]);
            audit('USER_DELETED', "USER_$id");
            ok();
        }
    }

    if ($route === '/admin/export' && $method === 'GET') {
        $a = require_role('admin');
        $scope = ($_GET['scope'] ?? '') === 'all' ? 'all' : 'content';
        if ($scope === 'all' && $a['role'] !== 'owner') {
            fail(403, 'Only owners can export customer data.');
        }
        $collections = [];
        foreach (COLLECTIONS as $name) {
            $collections[$name] = all_entries($name);
        }
        $payload = ['exportedAt' => gmdate('c'), 'scope' => $scope, 'settings' => ['site' => site_settings(), 'advanced' => advanced_settings()], 'collections' => $collections];
        if ($scope === 'all') {
            $payload['enquiries'] = all_rows('SELECT ' . LEAD_COLUMNS . ' FROM enquiries');
            $payload['bookings'] = all_rows('SELECT ' . BOOKING_COLUMNS . ' FROM bookings');
            $payload['subscribers'] = all_rows('SELECT email, source, created_at FROM subscribers');
        }
        audit('EXPORT', 'EXPORT_' . strtoupper($scope));
        header('Content-Disposition: attachment; filename="novaframe-' . $scope . '-' . gmdate('Y-m-d') . '.json"');
        ok($payload);
    }
}
