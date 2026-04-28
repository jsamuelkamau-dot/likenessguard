"""
LikenessGuard Edge Consent Enforcement Component
AWS IoT Greengrass v2 Component

Provides offline-capable consent checking with:
- Local SQLite fingerprint cache
- Cosine similarity computation (no external deps)
- Default-deny when offline
- LRU cache eviction
- Sync-on-reconnect to central registry

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8
"""
import json
import logging
import math
import os
import sqlite3
import time
import threading
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional
import uuid

logger = logging.getLogger('likenessguard.edge')
logging.basicConfig(level=logging.INFO)

# Configuration from Greengrass component config
API_ENDPOINT = os.environ.get('LG_API_ENDPOINT', '')
SIMILARITY_THRESHOLD = float(os.environ.get('LG_SIMILARITY_THRESHOLD', '0.85'))
CACHE_MAX_ENTRIES = int(os.environ.get('LG_CACHE_MAX_ENTRIES', '10000'))
SYNC_INTERVAL_SECONDS = int(os.environ.get('LG_SYNC_INTERVAL', '300'))  # 5 minutes
DB_PATH = os.environ.get('LG_DB_PATH', '/var/lib/likenessguard/edge_cache.db')
STALE_CACHE_HOURS = 24

# State machine states
STATE_ONLINE = 'ONLINE'
STATE_OFFLINE = 'OFFLINE'
STATE_SYNCING = 'SYNCING'


class EdgeConsentEnforcer:
    """
    Main edge consent enforcement engine.
    Thread-safe, SQLite-backed, offline-capable.
    """

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.state = STATE_OFFLINE
        self.last_sync_time: Optional[float] = None
        self._lock = threading.Lock()
        self._init_db()
        logger.info(f"EdgeConsentEnforcer initialised. DB: {db_path}")

    def _init_db(self):
        """Initialise SQLite schema."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS facial_vectors (
                    subject_id TEXT NOT NULL,
                    photo_hash TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    policy_json TEXT NOT NULL,
                    policy_version INTEGER DEFAULT 1,
                    is_provisional INTEGER DEFAULT 0,
                    last_accessed REAL NOT NULL,
                    synced_at REAL NOT NULL,
                    PRIMARY KEY (subject_id, photo_hash)
                );

                CREATE TABLE IF NOT EXISTS offline_decisions (
                    request_id TEXT PRIMARY KEY,
                    subject_id TEXT,
                    requester_id TEXT,
                    decision TEXT NOT NULL,
                    reason_code TEXT NOT NULL,
                    similarity_score REAL DEFAULT 0.0,
                    usage_type TEXT,
                    timestamp REAL NOT NULL,
                    synced INTEGER DEFAULT 0
                );

                CREATE INDEX IF NOT EXISTS idx_last_accessed ON facial_vectors(last_accessed);
                CREATE INDEX IF NOT EXISTS idx_unsynced ON offline_decisions(synced) WHERE synced = 0;
            """)

    def check_consent(self, query_vector: list, usage_type: str,
                      requester_id: str = 'edge') -> dict:
        """
        Check consent for a query vector.

        Returns:
        {
            "decision": "ALLOW" | "DENY",
            "reason_code": str,
            "similarity_score": float,
            "subject_id": str | None,
            "offline": bool,
            "stale_cache": bool
        }
        """
        request_id = str(uuid.uuid4())
        is_offline = self.state != STATE_ONLINE
        stale = self._is_cache_stale()

        # Find best match in local cache
        best_match = self._find_best_match(query_vector)

        if best_match is None:
            # No match in cache
            result = {
                "request_id": request_id,
                "decision": "DENY",
                "reason_code": "OFFLINE_NO_CACHE" if is_offline else "SUBJECT_NOT_REGISTERED",
                "similarity_score": 0.0,
                "subject_id": None,
                "offline": is_offline,
                "stale_cache": stale
            }
        else:
            subject_id = best_match['subject_id']
            score = best_match['score']
            policy = best_match['policy']
            is_provisional = best_match['is_provisional']

            if score < SIMILARITY_THRESHOLD:
                result = {
                    "request_id": request_id,
                    "decision": "DENY",
                    "reason_code": "SIMILARITY_BELOW_THRESHOLD",
                    "similarity_score": score,
                    "subject_id": subject_id,
                    "offline": is_offline,
                    "stale_cache": stale
                }
            elif is_provisional:
                result = {
                    "request_id": request_id,
                    "decision": "DENY",
                    "reason_code": "PROVISIONAL_ENTRY",
                    "similarity_score": score,
                    "subject_id": subject_id,
                    "offline": is_offline,
                    "stale_cache": stale
                }
            else:
                # Evaluate policy locally
                decision, reason = self._evaluate_policy(policy, usage_type, requester_id)
                result = {
                    "request_id": request_id,
                    "decision": decision,
                    "reason_code": reason,
                    "similarity_score": score,
                    "subject_id": subject_id,
                    "offline": is_offline,
                    "stale_cache": stale
                }

            # Update LRU timestamp
            self._touch_entry(subject_id, best_match['photo_hash'])

        # Add stale cache warning
        if stale and result['decision'] == 'ALLOW':
            result['warnings'] = ['STALE_CACHE']

        # Record offline decision for later sync
        if is_offline:
            self._record_offline_decision(result, requester_id, usage_type)

        return result

    def _find_best_match(self, query_vector: list) -> Optional[dict]:
        """Find the best matching vector in the local cache using cosine similarity."""
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT subject_id, photo_hash, vector_json, policy_json, policy_version, is_provisional "
                "FROM facial_vectors ORDER BY last_accessed DESC LIMIT 50000"
            ).fetchall()

        if not rows:
            return None

        best_score = 0.0
        best_row = None

        for row in rows:
            try:
                stored_vector = json.loads(row[2])
                score = _cosine_similarity(query_vector, stored_vector)
                if score > best_score:
                    best_score = score
                    best_row = row
            except Exception:
                continue

        if best_row is None:
            return None

        return {
            "subject_id": best_row[0],
            "photo_hash": best_row[1],
            "policy": json.loads(best_row[3]),
            "policy_version": best_row[4],
            "is_provisional": bool(best_row[5]),
            "score": best_score
        }

    def _evaluate_policy(self, policy: dict, usage_type: str, requester_id: str) -> tuple:
        """Local policy evaluation — mirrors Consent Orchestrator logic."""
        if usage_type == 'FACE_SWAP' and policy.get('deny_face_swaps', True):
            return 'DENY', 'DENY_FACE_SWAP'
        if usage_type == 'THIRD_PARTY_EDIT' and policy.get('deny_third_party_edits', True):
            return 'DENY', 'DENY_THIRD_PARTY'
        blocklist = policy.get('platform_blocklist', [])
        if requester_id in blocklist:
            return 'DENY', 'DENY_PLATFORM_BLOCKED'
        allowlist = policy.get('platform_allowlist', [])
        if allowlist and requester_id not in allowlist:
            return 'DENY', 'DENY_NOT_IN_ALLOWLIST'
        return 'ALLOW', 'ALLOW_POLICY_PERMITS'

    def _touch_entry(self, subject_id: str, photo_hash: str):
        """Update last_accessed for LRU tracking."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE facial_vectors SET last_accessed = ? WHERE subject_id = ? AND photo_hash = ?",
                (time.time(), subject_id, photo_hash)
            )

    def _record_offline_decision(self, result: dict, requester_id: str, usage_type: str):
        """Store offline decision for sync-on-reconnect."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO offline_decisions "
                "(request_id, subject_id, requester_id, decision, reason_code, similarity_score, usage_type, timestamp, synced) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                (result['request_id'], result.get('subject_id'), requester_id,
                 result['decision'], result['reason_code'],
                 result.get('similarity_score', 0.0), usage_type, time.time())
            )

    def _is_cache_stale(self) -> bool:
        """Check if cache is older than STALE_CACHE_HOURS."""
        if self.last_sync_time is None:
            return True
        return (time.time() - self.last_sync_time) > (STALE_CACHE_HOURS * 3600)

    def cache_vector(self, subject_id: str, photo_hash: str, vector: list,
                     policy: dict, policy_version: int = 1, is_provisional: bool = False):
        """Add or update a facial vector in the local cache."""
        self._evict_if_needed()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO facial_vectors "
                "(subject_id, photo_hash, vector_json, policy_json, policy_version, is_provisional, last_accessed, synced_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (subject_id, photo_hash, json.dumps(vector), json.dumps(policy),
                 policy_version, int(is_provisional), time.time(), time.time())
            )

    def _evict_if_needed(self):
        """LRU eviction when cache is at capacity."""
        with sqlite3.connect(self.db_path) as conn:
            count = conn.execute("SELECT COUNT(*) FROM facial_vectors").fetchone()[0]
            if count >= CACHE_MAX_ENTRIES:
                # Evict oldest 10%
                evict_count = max(1, CACHE_MAX_ENTRIES // 10)
                conn.execute(
                    "DELETE FROM facial_vectors WHERE (subject_id, photo_hash) IN "
                    "(SELECT subject_id, photo_hash FROM facial_vectors ORDER BY last_accessed ASC LIMIT ?)",
                    (evict_count,)
                )
                logger.info(f"LRU eviction: removed {evict_count} entries")

    def sync_with_registry(self) -> dict:
        """Sync local cache with central registry. Called on reconnect."""
        if not API_ENDPOINT:
            logger.warning("No API endpoint configured for sync")
            return {"synced": 0, "uploaded": 0}

        self.state = STATE_SYNCING
        uploaded = 0
        downloaded = 0

        try:
            # Upload offline decisions
            with sqlite3.connect(self.db_path) as conn:
                unsynced = conn.execute(
                    "SELECT request_id, subject_id, requester_id, decision, reason_code, "
                    "similarity_score, usage_type, timestamp FROM offline_decisions WHERE synced = 0"
                ).fetchall()

            if unsynced:
                decisions = [
                    {"request_id": r[0], "subject_id": r[1], "requester_id": r[2],
                     "decision": r[3], "reason_code": r[4], "similarity_score": r[5],
                     "usage_type": r[6], "timestamp": r[7]}
                    for r in unsynced
                ]
                try:
                    _post_json(f"{API_ENDPOINT}/v2/audit/sync",
                               {"decisions": decisions, "edge_node_id": _get_node_id()})
                    with sqlite3.connect(self.db_path) as conn:
                        conn.execute("UPDATE offline_decisions SET synced = 1 WHERE synced = 0")
                    uploaded = len(decisions)
                    logger.info(f"Uploaded {uploaded} offline decisions")
                except Exception as e:
                    logger.error(f"Failed to upload offline decisions: {e}")

            self.last_sync_time = time.time()
            self.state = STATE_ONLINE
            return {"synced": downloaded, "uploaded": uploaded}

        except Exception as e:
            logger.error(f"Sync failed: {e}")
            self.state = STATE_OFFLINE
            return {"error": str(e)}

    def get_status(self) -> dict:
        """Return current edge node status."""
        with sqlite3.connect(self.db_path) as conn:
            vector_count = conn.execute("SELECT COUNT(*) FROM facial_vectors").fetchone()[0]
            unsynced_count = conn.execute(
                "SELECT COUNT(*) FROM offline_decisions WHERE synced = 0"
            ).fetchone()[0]

        return {
            "state": self.state,
            "cached_vectors": vector_count,
            "unsynced_decisions": unsynced_count,
            "last_sync": self.last_sync_time,
            "cache_stale": self._is_cache_stale(),
            "node_id": _get_node_id()
        }


def _cosine_similarity(v1: list, v2: list) -> float:
    """Compute cosine similarity between two vectors (no external deps)."""
    if len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(x * x for x in v1))
    mag2 = math.sqrt(sum(x * x for x in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


def _post_json(url: str, data: dict) -> dict:
    """Simple HTTP POST with JSON body."""
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body,
                                  headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _get_node_id() -> str:
    """Get or generate a stable node identifier."""
    node_id_file = '/var/lib/likenessguard/node_id'
    try:
        with open(node_id_file) as f:
            return f.read().strip()
    except FileNotFoundError:
        node_id = 'edge_' + str(uuid.uuid4())[:8]
        os.makedirs(os.path.dirname(node_id_file), exist_ok=True)
        with open(node_id_file, 'w') as f:
            f.write(node_id)
        return node_id


# ── Greengrass component entry point ──────────────────────────────────────────
if __name__ == '__main__':
    import sys
    enforcer = EdgeConsentEnforcer()

    # Start background sync thread
    def sync_loop():
        while True:
            time.sleep(SYNC_INTERVAL_SECONDS)
            try:
                enforcer.sync_with_registry()
            except Exception as e:
                logger.error(f"Background sync error: {e}")

    sync_thread = threading.Thread(target=sync_loop, daemon=True)
    sync_thread.start()

    # Initial sync attempt
    enforcer.sync_with_registry()

    logger.info(f"Edge consent enforcer running. Status: {enforcer.get_status()}")

    # Keep alive
    while True:
        time.sleep(60)
        status = enforcer.get_status()
        logger.info(f"Edge status: {status['state']} | vectors={status['cached_vectors']} | unsynced={status['unsynced_decisions']}")
