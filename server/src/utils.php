<?php
use Psr\Http\Message\ResponseInterface as Response;

function jsonResponse(Response $response, $data, $status = 200) {
  $response->getBody()->write(json_encode($data));
  return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
}

function normalizeNickname($name, $email) {
  $fallback = explode('@', $email)[0] ?: 'user';
  return mb_substr(trim($name ?: $fallback), 0, 128) ?: 'user';
}

function toMySQLDateTime($isoString) {
  return $isoString ? date('Y-m-d H:i:s', strtotime($isoString)) : null;
}

function uuid() {
  return str_replace('-', '', bin2hex(random_bytes(16)));
}

function toIso8601($dateString) {
  if (!$dateString) return null;
  $date = new DateTime($dateString);
  return $date->format('Y-m-d\TH:i:s\Z');
}
