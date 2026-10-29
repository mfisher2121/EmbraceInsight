import json, sqlite3, sys
from pathlib import Path

database = Path(sys.argv[1])
database.parent.mkdir(parents=True, exist_ok=True)
payload = json.load(sys.stdin)
connection = sqlite3.connect(database, timeout=10)
connection.row_factory = sqlite3.Row
connection.execute('PRAGMA foreign_keys=ON')
try:
    if payload.get('migrations'):
        connection.execute('PRAGMA journal_mode=WAL')
        connection.execute('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY)')
        for migration in payload['migrations']:
            if not connection.execute('SELECT name FROM __local_migrations WHERE name=?',(migration['name'],)).fetchone():
                connection.executescript(migration['sql'])
                connection.execute('INSERT INTO __local_migrations (name) VALUES (?)',(migration['name'],))
        connection.commit()
        print(json.dumps({'success': True}))
    else:
        results = []
        with connection:
            for statement in payload['statements']:
                cursor = connection.execute(statement['sql'],statement.get('params',[]))
                rows = [dict(row) for row in cursor.fetchall()] if cursor.description else []
                mode = statement.get('mode','run')
                results.append(rows[0] if rows and mode=='first' else None if mode=='first' else {'results':rows,'success':True,'meta':{'changes':max(cursor.rowcount,0)}})
        print(json.dumps(results))
finally:
    connection.close()
