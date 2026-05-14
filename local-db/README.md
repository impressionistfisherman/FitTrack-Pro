# Local FitTrack SQLite DB

This folder contains a SQLite copy and export artifacts copied from the remote TiDB database.

## Files

- `fittrack_local.sqlite`: local SQLite database
- `fittrack_remote_dump.sql`: schema and data dump
- `summary.json`: exported table row counts
- `sqlite-summary.json`: SQLite table row counts after import
- `json/`: table data snapshots

## Use SQLite

SQLite database path:

```powershell
local-db\fittrack_local.sqlite
```

Example Python check:

```powershell
python -c "import sqlite3; c=sqlite3.connect('local-db/fittrack_local.sqlite'); print(c.execute('select count(*) from exercises').fetchone())"
```
