from __future__ import annotations
import json, os, sqlite3, socket, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

DATA = Path('/data')
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / 'kaspa-solo.db'
CONFIG = DATA / 'config.json'
BRIDGE = os.getenv('BRIDGE_BASE', 'http://bridge:3030').rstrip('/')
NODE_HOST = os.getenv('NODE_HOST', 'kaspad')
NODE_PORT = int(os.getenv('NODE_RPC_PORT', '16110'))
STRATUM_PORT = int(os.getenv('STRATUM_PORT', '5555'))
VERSION = os.getenv('APP_VERSION', '0.1.0')
STATIC = Path('/app/static')
LOCK = threading.Lock()
STATE = {'bridge': {}, 'status': {}, 'node_reachable': False, 'updated_at': None, 'error': None}

def db():
    con = sqlite3.connect(DB)
    con.execute('PRAGMA journal_mode=WAL')
    con.execute('CREATE TABLE IF NOT EXISTS blocks(hash TEXT PRIMARY KEY, ts INTEGER, worker TEXT, wallet TEXT, miner TEXT, nonce TEXT, bluescore TEXT, payload TEXT NOT NULL)')
    con.execute('CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL, payload TEXT)')
    con.commit()
    return con

def load_config():
    default = {'wallet':'','worker':'worker1','remote_ack':False,'setup_complete':False}
    try:
        obj = json.loads(CONFIG.read_text())
        if isinstance(obj, dict): default.update(obj)
    except Exception:
        pass
    return default

def save_config(obj):
    allowed = {'wallet','worker','remote_ack','setup_complete'}
    cur = load_config()
    for k in allowed:
        if k in obj: cur[k] = obj[k]
    wallet = str(cur.get('wallet','')).strip()
    if wallet and not wallet.startswith('kaspa:'):
        raise ValueError('Wallet must begin with kaspa:')
    worker = ''.join(c for c in str(cur.get('worker','worker1')) if c.isalnum() or c in '-_')[:48] or 'worker1'
    cur['wallet'], cur['worker'] = wallet, worker
    tmp = CONFIG.with_suffix('.tmp')
    tmp.write_text(json.dumps(cur, indent=2))
    tmp.replace(CONFIG)
    return cur

def fetch_json(path):
    req = Request(BRIDGE + path, headers={'User-Agent':'Kraskus-Kaspa-Solo/' + VERSION})
    with urlopen(req, timeout=3) as r:
        return json.loads(r.read().decode())

def tcp_ok(host, port):
    try:
        with socket.create_connection((host, port), timeout=1): return True
    except OSError:
        return False

def record_event(kind, message, payload=None):
    with db() as con:
        con.execute('INSERT INTO events(ts,kind,message,payload) VALUES(?,?,?,?)', (int(time.time()),kind,message,json.dumps(payload) if payload is not None else None))
        con.commit()

def ingest_blocks(stats):
    blocks = stats.get('blocks') or stats.get('recentBlocks') or []
    if not isinstance(blocks, list): return
    with db() as con:
        for b in blocks:
            if not isinstance(b, dict): continue
            h = str(b.get('hash') or b.get('blockHash') or '').strip()
            if not h: continue
            cur = con.execute('INSERT OR IGNORE INTO blocks(hash,ts,worker,wallet,miner,nonce,bluescore,payload) VALUES(?,?,?,?,?,?,?,?)',(
                h, int(b.get('timestamp') or time.time()), str(b.get('worker') or ''), str(b.get('wallet') or ''), str(b.get('miner') or ''), str(b.get('nonce') or ''), str(b.get('bluescore') or b.get('blueScore') or ''), json.dumps(b)))
            if cur.rowcount:
                con.execute('INSERT INTO events(ts,kind,message,payload) VALUES(?,?,?,?)',(int(time.time()),'block','Block found',json.dumps(b)))
        con.commit()

def poller():
    previous_workers = None
    while True:
        try:
            status = fetch_json('/api/status')
            stats = fetch_json('/api/stats')
            ingest_blocks(stats)
            workers = int(stats.get('activeWorkers') or stats.get('active_workers') or 0)
            if previous_workers is not None and workers != previous_workers:
                record_event('workers', f'Active workers changed from {previous_workers} to {workers}', {'before':previous_workers,'after':workers})
            previous_workers = workers
            with LOCK:
                STATE.update({'bridge':stats,'status':status,'node_reachable':tcp_ok(NODE_HOST,NODE_PORT),'updated_at':int(time.time()),'error':None})
        except Exception as e:
            with LOCK:
                STATE.update({'node_reachable':tcp_ok(NODE_HOST,NODE_PORT),'updated_at':int(time.time()),'error':str(e)})
        time.sleep(5)

def snapshot():
    with LOCK: s = json.loads(json.dumps(STATE))
    cfg = load_config()
    host = socket.gethostname()
    s.update({'version':VERSION,'config':cfg,'stratum_port':STRATUM_PORT,'hostname':host})
    return s

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        rel = path.split('?',1)[0].lstrip('/') or 'index.html'
        return str(STATIC / rel)
    def log_message(self, fmt, *args):
        return
    def json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path == '/healthz': return self.json(200, {'ok':True})
        if self.path == '/api/state': return self.json(200, snapshot())
        if self.path == '/api/config': return self.json(200, load_config())
        if self.path.startswith('/api/blocks'):
            with db() as con:
                rows = con.execute('SELECT hash,ts,worker,wallet,miner,nonce,bluescore FROM blocks ORDER BY ts DESC LIMIT 100').fetchall()
            return self.json(200, [dict(zip(['hash','ts','worker','wallet','miner','nonce','bluescore'],r)) for r in rows])
        if self.path.startswith('/api/events'):
            with db() as con:
                rows = con.execute('SELECT id,ts,kind,message,payload FROM events ORDER BY id DESC LIMIT 100').fetchall()
            return self.json(200, [dict(zip(['id','ts','kind','message','payload'],r)) for r in rows])
        return super().do_GET()
    def do_POST(self):
        if self.path != '/api/config': return self.json(404, {'error':'not found'})
        try:
            n = min(int(self.headers.get('Content-Length','0')), 16384)
            obj = json.loads(self.rfile.read(n) or b'{}')
            cfg = save_config(obj)
            record_event('config','Configuration updated', {'worker':cfg['worker'],'wallet_set':bool(cfg['wallet'])})
            return self.json(200, cfg)
        except Exception as e:
            return self.json(400, {'error':str(e)})

if __name__ == '__main__':
    db().close()
    threading.Thread(target=poller, daemon=True).start()
    ThreadingHTTPServer(('0.0.0.0',8080), Handler).serve_forever()
