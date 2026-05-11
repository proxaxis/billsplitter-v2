<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use DI\Container;

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../utils.php';

$container = new Container();
AppFactory::setContainer($container);
$app = AppFactory::create();

$errorMiddleware = $app->addErrorMiddleware(true, true, true);

$app->add(function (Request $request, $handler) {
  $response = $handler->handle($request);
  $origin = getenv('CORS_ORIGIN_BASE_URL');

  return $response
    ->withHeader('Access-Control-Allow-Origin', $origin)
    ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    ->withHeader('Access-Control-Allow-Credentials', 'true');
});

$container->set('db', function () {
    $dsn = "mysql:host=" . getenv('DB_HOST') . ";dbname=" . getenv('DB_NAME') . ";charset=utf8mb4";
    return new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
});

if (session_status() === PHP_SESSION_NONE) {
  session_start([
    'cookie_httponly' => true,
    'cookie_secure' => getenv('NODE_ENV') === 'production',
    'cookie_samesite' => 'Lax',
  ]);
}


$app->options('/{routes:.+}', function (Request $request, Response $response) {
  return $response;
});


// テスト用エンドポイント
$app->get('/api/config-test', function ($request, $response) {
    $data = [
        'cors_url' => getenv('CORS_ORIGIN_BASE_URL'),
        'db_host' => getenv('DB_HOST')
    ];
    return jsonResponse($response, $data);
});

// --- Auth APIs ---

// POST /auth/google
$app->post('/auth/google', function (Request $request, Response $response) {
    $body = json_decode($request->getBody(), true);
    $idToken = $body['id_token'] ?? null;
    $clientId = getenv('GOOGLE_CLIENT_ID');

    if (!$idToken) return jsonResponse($response, ['error' => 'id_token is required'], 400);

    $client = new Google_Client(['client_id' => $clientId]);
    $payload = $client->verifyIdToken($idToken);
    if (!$payload) return jsonResponse($response, ['error' => 'Invalid Google Token'], 401);

    $db = $this->get('db');
    $socialId = $payload['sub'];
    $email = $payload['email'];

    $stmt = $db->prepare("SELECT u.* FROM social_accounts sa INNER JOIN users u ON sa.uid = u.uid WHERE sa.social_id = ? AND u.deleted_at IS NULL LIMIT 1");
    $stmt->execute([$socialId]);
    $user = $stmt->fetch();

    if ($user) {
        $_SESSION['user'] = ['id' => $user['public_uid'], 'nickname' => $user['nickname'], 'email' => $user['email'], 'icon' => $user['icon']];
        return jsonResponse($response, array_merge($_SESSION['user'], ['is_new' => false]));
    }

    $publicUid = uuid();
    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO users (public_uid, nickname, email, icon) VALUES (?, ?, ?, ?)");
        $stmt->execute([$publicUid, normalizeNickname($payload['name'] ?? '', $email), $email, '👤']);
        $db->prepare("INSERT INTO social_accounts (uid, social_id) VALUES (?, ?)")->execute([$db->lastInsertId(), $socialId]);
        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        return jsonResponse($response, ['error' => 'Internal Server Error'], 500);
    }

    $_SESSION['user'] = ['id' => $publicUid, 'nickname' => $payload['name'] ?? $email, 'email' => $email, 'icon' => '👤'];
    return jsonResponse($response, array_merge($_SESSION['user'], ['is_new' => true]), 201);
});

// GET /auth/session
$app->get('/auth/session', function (Request $request, Response $response) {
    $user = $_SESSION['user'] ?? null;
    return jsonResponse($response, ['authenticated' => (bool)$user, 'user' => $user]);
});

// POST /auth/logout
$app->post('/auth/logout', function (Request $request, Response $response) {
    session_destroy();
    return jsonResponse($response, ['ok' => true]);
});

// --- Group APIs ---

// POST /g/new
$app->post('/g/new', function (Request $request, Response $response) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    $publicGid = uuid();

    $db->prepare("INSERT INTO grps (public_gid, name, description, icon, currency, timezone, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$publicGid, $body['name'], $body['description'] ?? '', $body['icon'], $body['currency'], $body['timezone'], toMySQLDateTime($body['start_at']), toMySQLDateTime($body['end_at'])]);
    
    $gid = $db->lastInsertId();
    if (!empty($body['members'])) {
        $stmt = $db->prepare("INSERT INTO members (gid, mmid, name, icon) VALUES (?, ?, ?, ?)");
        foreach ($body['members'] as $i => $m) {
            $stmt->execute([$gid, $i + 1, $m['name'], $m['icon']]);
        }
    }
    return jsonResponse($response, ['id' => $publicGid], 201);
});

// GET /g/{id}/info
$app->get('/g/{id}/info', function (Request $request, Response $response, array $args) {
    $db = $this->get('db');
    $stmt = $db->prepare("SELECT * FROM grps WHERE public_gid = ? AND deleted_at IS NULL");
    $stmt->execute([$args['id']]);
    $group = $stmt->fetch();
    if (!$group) return jsonResponse($response, ['error' => 'Group Not Found'], 404);

    $gid = $group['gid'];
    $members = $db->prepare("SELECT mmid as id, name, icon FROM members WHERE gid = ? AND left_at IS NULL");
    $members->execute([$gid]);
    $group['members'] = $members->fetchAll();

    $subgroups = $db->prepare("SELECT sgid as id, name FROM sub_groups WHERE gid = ? AND is_disabled = 0");
    $subgroups->execute([$gid]);
    $group['sub_groups'] = array_map(function($sg) use ($db, $gid) {
        $stm = $db->prepare("SELECT mmid FROM sub_group_members WHERE gid = ? AND sgid = ?");
        $stm->execute([$gid, $sg['id']]);
        $sg['members'] = $stm->fetchAll(PDO::FETCH_COLUMN);
        return $sg;
    }, $subgroups->fetchAll());

    $categories = $db->prepare("SELECT ctid as id, name FROM categories WHERE gid = ? AND is_disabled = 0");
    $categories->execute([$gid]);
    $group['categories'] = $categories->fetchAll();

    $group['start_at'] = toIso8601($group['start_at']);
    $group['end_at']   = toIso8601($group['end_at']);
    $group['created_at'] = toIso8601($group['created_at']);
    $group['updated_at'] = toIso8601($group['updated_at']);

    unset($group['gid'], $group['public_gid'], $group['deleted_at']);
    return jsonResponse($response, $group);
});

// PATCH /g/{id}/basic
$app->patch('/g/{id}/basic', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    $stmt = $db->prepare("UPDATE grps SET name=?, description=?, icon=?, currency=?, timezone=?, start_at=?, end_at=? WHERE public_gid=? AND deleted_at IS NULL");
    $stmt->execute([$body['name'], $body['description'], $body['icon'], $body['currency'], $body['timezone'], toMySQLDateTime($body['start_at']), toMySQLDateTime($body['end_at']), $args['id']]);
    return jsonResponse($response, ['id' => $args['id']]);
});

// DELETE /g/{id}
$app->delete('/g/{id}', function (Request $request, Response $response, array $args) {
    $db = $this->get('db');
    $db->prepare("UPDATE grps SET deleted_at = NOW() WHERE public_gid = ?")->execute([$args['id']]);
    return jsonResponse($response, ['id' => $args['id']]);
});

// --- Payment APIs ---
// --- 修正版: GET /g/{id}/payments/{page} ---
$app->get('/g/{id}/payments/{page}', function (Request $request, Response $response, array $args) {
    $db = $this->get('db');
    $limit = 150;
    $page = (int)$args['page'];
    $offset = ($page - 1) * $limit;

    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = :pgid AND deleted_at IS NULL");
    $stmt->execute([':pgid' => $args['id']]);
    $gid = $stmt->fetchColumn();
    
    if (!$gid) return jsonResponse($response, ['error' => 'Group Not Found'], 404);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM payments WHERE gid = :gid AND is_disabled = 0");
    $countStmt->execute([':gid' => $gid]);
    $total = (int)$countStmt->fetchColumn();

    // 全てのプレースホルダを :名前 形式に統一
    $stmt = $db->prepare("SELECT pmid as id, name, description,
                          amount, paid_at, created_at, updated_at, currency, exchange_rate, type, paid_by as payer 
                          FROM payments 
                          WHERE gid = :gid AND is_disabled = 0 AND deleted_at IS NULL 
                          ORDER BY paid_at DESC, created_at DESC
                          LIMIT :limit OFFSET :offset");
    
    // bindValueで型を指定してバインド
    $stmt->bindValue(':gid', $gid, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $payments = $stmt->fetchAll();

    foreach ($payments as &$p) {
        $stm = $db->prepare("SELECT mmid FROM payees WHERE gid = :gid AND pmid = :pmid");
        $stm->execute([':gid' => $gid, ':pmid' => $p['id']]);
        $p['payees'] = $stm->fetchAll(PDO::FETCH_COLUMN);
    }

    foreach ($payments as &$p) {
        $p['paid_at']   = toIso8601($p['paid_at']);
        $p['created_at']   = toIso8601($p['created_at']);
        $p['updated_at']   = toIso8601($p['updated_at']);
    }

    return jsonResponse($response, [
        'group_id' => $args['id'],
        'payments' => $payments,
        'total' => $total,
        'page' => $page,
        'limit' => $limit
    ]);
});

// POST /g/{id}/new
$app->post('/g/{id}/new', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = ? AND deleted_at IS NULL");
    $stmt->execute([$args['id']]);
    $gid = $stmt->fetchColumn();

    $db->beginTransaction();
    $max = $db->prepare("SELECT IFNULL(MAX(pmid), 0) + 1 FROM payments WHERE gid = ?");
    $max->execute([$gid]);
    $pmid = $max->fetchColumn();

    $db->prepare("INSERT INTO payments (gid, pmid, name, description, amount, paid_at, currency, exchange_rate, type, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
       ->execute([$gid, $pmid, $body['name'], $body['description'], $body['amount'], toMySQLDateTime($body['paid_at']), $body['currency'], $body['exchange_rate'], $body['type'], $body['payer']]);

    $stmt = $db->prepare("INSERT INTO payees (gid, pmid, mmid) VALUES (?, ?, ?)");
    foreach ($body['payees'] as $mmid) $stmt->execute([$gid, $pmid, $mmid]);
    $db->commit();

    return jsonResponse($response, array_merge(['id' => $pmid], $body), 201);
});

// DELETE /g/{id}/{pmid}
$app->delete('/g/{id}/{pmid}', function (Request $request, Response $response, array $args) {
    $db = $this->get('db');
    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = ?");
    $stmt->execute([$args['id']]);
    $gid = $stmt->fetchColumn();
    $db->prepare("UPDATE payments SET is_disabled = 1, deleted_at = NOW() WHERE gid = ? AND pmid = ?")->execute([$gid, $args['pmid']]);
    return jsonResponse($response, ['group_id' => $args['id'], 'id' => (int)$args['pmid']]);
});

// --- 1. サブグループの更新 (PATCH /g/{id}/sub-groups) ---
$app->patch('/g/{id}/sub-groups', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    
    // 公開IDから内部GIDを取得
    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = :pgid");
    $stmt->execute([':pgid' => $args['id']]);
    $gid = $stmt->fetchColumn();
    if (!$gid) return jsonResponse($response, ['error' => 'Group Not Found'], 404);

    $db->beginTransaction();
    try {
        // 新規追加
        if (!empty($body['add'])) {
            foreach ($body['add'] as $sg) {
                $maxStmt = $db->prepare("SELECT IFNULL(MAX(sgid), 0) + 1 FROM sub_groups WHERE gid = :gid");
                $maxStmt->execute([':gid' => $gid]);
                $newSgid = $maxStmt->fetchColumn();

                $db->prepare("INSERT INTO sub_groups (gid, sgid, name) VALUES (:gid, :sgid, :name)")
                   ->execute([':gid' => $gid, ':sgid' => $newSgid, ':name' => $sg['name']]);

                $mStmt = $db->prepare("INSERT INTO sub_group_members (gid, sgid, mmid) VALUES (:gid, :sgid, :mmid)");
                foreach ($sg['members'] as $mmid) {
                    $mStmt->execute([':gid' => $gid, ':sgid' => $newSgid, ':mmid' => $mmid]);
                }
            }
        }

        // 名前更新
        if (!empty($body['names'])) {
            $stmt = $db->prepare("UPDATE sub_groups SET name = :name WHERE gid = :gid AND sgid = :sgid");
            foreach ($body['names'] as $n) {
                $stmt->execute([':name' => $n['name'], ':gid' => $gid, ':sgid' => $n['id']]);
            }
        }

        // メンバー入れ替え
        if (!empty($body['members'])) {
            foreach ($body['members'] as $m) {
                $db->prepare("DELETE FROM sub_group_members WHERE gid = :gid AND sgid = :sgid")
                   ->execute([':gid' => $gid, ':sgid' => $m['id']]);
                
                $mStmt = $db->prepare("INSERT INTO sub_group_members (gid, sgid, mmid) VALUES (:gid, :sgid, :mmid)");
                foreach ($m['members'] as $mmid) {
                    $mStmt->execute([':gid' => $gid, ':sgid' => $m['id'], ':mmid' => $mmid]);
                }
            }
        }

        // 削除（無効化）
        if (!empty($body['remove'])) {
            $stmt = $db->prepare("UPDATE sub_groups SET is_disabled = 1 WHERE gid = :gid AND sgid = :sgid");
            foreach ($body['remove'] as $sgid) {
                $stmt->execute([':gid' => $gid, ':sgid' => $sgid]);
            }
        }

        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        return jsonResponse($response, ['error' => $e->getMessage()], 500);
    }

    return jsonResponse($response, ['id' => $args['id']]);
});

// --- 2. メンバーの更新 (PATCH /g/{id}/members) ---
$app->patch('/g/{id}/members', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    
    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = :pgid");
    $stmt->execute([':pgid' => $args['id']]);
    $gid = $stmt->fetchColumn();

    $db->beginTransaction();
    try {
        if (!empty($body['add'])) {
            $maxStmt = $db->prepare("SELECT IFNULL(MAX(mmid), 0) FROM members WHERE gid = :gid");
            $maxStmt->execute([':gid' => $gid]);
            $currentMax = $maxStmt->fetchColumn();

            $stmt = $db->prepare("INSERT INTO members (gid, mmid, name, icon) VALUES (:gid, :mmid, :name, :icon)");
            foreach ($body['add'] as $i => $m) {
                $stmt->execute([':gid' => $gid, ':mmid' => $currentMax + $i + 1, ':name' => $m['name'], ':icon' => $m['icon']]);
            }
        }
        if (!empty($body['rename'])) {
            $stmt = $db->prepare("UPDATE members SET name = :name, icon = :icon WHERE gid = :gid AND mmid = :mmid");
            foreach ($body['rename'] as $m) {
                $stmt->execute([':name' => $m['name'], ':icon' => $m['icon'], ':gid' => $gid, ':mmid' => $m['id']]);
            }
        }
        if (!empty($body['remove'])) {
            $stmt = $db->prepare("UPDATE members SET left_at = NOW() WHERE gid = :gid AND mmid = :mmid");
            foreach ($body['remove'] as $mmid) {
                $stmt->execute([':gid' => $gid, ':mmid' => $mmid]);
            }
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        return jsonResponse($response, ['error' => $e->getMessage()], 500);
    }
    return jsonResponse($response, ['id' => $args['id']]);
});

// --- 4. 支払いの更新 (PATCH /g/{id}/{pmid}) ---
$app->patch('/g/{id}/{pmid}', function (Request $request, Response $response, array $args) {
    $body = json_decode($request->getBody(), true);
    $db = $this->get('db');
    
    $stmt = $db->prepare("SELECT gid FROM grps WHERE public_gid = :pgid");
    $stmt->execute([':pgid' => $args['id']]);
    $gid = $stmt->fetchColumn();

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("UPDATE payments SET name = :name, description = :description, amount = :amount, paid_at = :paid_at, currency = :currency, exchange_rate = :exchange_rate, type = :type, paid_by = :payer WHERE gid = :gid AND pmid = :pmid");
        $stmt->execute([
            ':name' => $body['name'],
            ':description' => $body['description'],
            ':amount' => $body['amount'],
            ':paid_at' => toMySQLDateTime($body['paid_at']),
            ':currency' => $body['currency'],
            ':exchange_rate' => $body['exchange_rate'],
            ':type' => $body['type'],
            ':payer' => $body['payer'],
            ':gid' => $gid,
            ':pmid' => $args['pmid']
        ]);

        $db->prepare("DELETE FROM payees WHERE gid = :gid AND pmid = :pmid")
           ->execute([':gid' => $gid, ':pmid' => $args['pmid']]);

        $pStmt = $db->prepare("INSERT INTO payees (gid, pmid, mmid) VALUES (:gid, :pmid, :mmid)");
        foreach ($body['payees'] as $mmid) {
            $pStmt->execute([':gid' => $gid, ':pmid' => $args['pmid'], ':mmid' => $mmid]);
        }
        $db->commit();
    } catch (Exception $e) {
        $db->rollBack();
        return jsonResponse($response, ['error' => $e->getMessage()], 500);
    }
    return jsonResponse($response, ['group_id' => $args['id'], 'id' => (int)$args['pmid']]);
});

$app->run();
