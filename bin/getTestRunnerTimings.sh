# Requires gron
for file in src/mochawesome-report/mochawesome*.json; do gron $file; done | grep -F 'results[' | grep -F 'tests[' | grep -E '(fullTitle|duration)' | sed -r 's/.*= //' | sed -r 's/[;"]//g' | paste -d '$' - - | awk -F'$' '{if ($1 > durations[$2]) durations[$2] = $1} END{for (i in durations) print durations[i], i}' | sed 's/^[^0-9].*/0 \0/'
