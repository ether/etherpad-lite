#!/usr/bin/env PYTHONUNBUFFERED=1 python
#
# Created by Bjarni R. Einarsson, placed in the public domain. Go wild!
#
import json
import os
import sys

try:
    dirtydb_input = sys.argv[1]
    dirtydb_output = '%s.new' % dirtydb_input
    assert(os.path.exists(dirtydb_input))
    assert(not os.path.exists(dirtydb_output))
except:
    print()
    print('Usage: %s /path/to/dirty.db' % sys.argv[0])
    print()
    print('Note: Will create a file named dirty.db.new in the same folder,')
    print('      please make sure permissions are OK and a file by that')
    print('      name does not exist already. This script works by omitting')
    print('      duplicate lines from the dirty.db file, keeping only the')
    print('      last (latest) instance. No revision data should be lost,')
    print('      but be careful, make backups. If it breaks you get to keep')
    print('      both pieces!')
    print()
    sys.exit(1)

dirtydb = {}
lines = 0
with open(dirtydb_input, 'r') as fd:
    print('Reading %s' % dirtydb_input)
    for line in fd:
        lines += 1
        try:
            data = json.loads(line)
            dirtydb[data['key']] = line
        except:
            print("Skipping invalid JSON!")
        if lines % 10000 == 0:
            sys.stderr.write('.')
print()
print('OK, found %d unique keys in %d lines' % (len(dirtydb), lines))

with open(dirtydb_output, 'w') as fd:
    for data in list(dirtydb.values()):
        fd.write(data)

print('Wrote data to %s. All done!' % dirtydb_output)
