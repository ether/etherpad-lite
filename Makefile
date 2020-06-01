doc_sources = $(wildcard doc/*/*.md) $(wildcard doc/*.md)
outdoc_files = $(addprefix out/,$(doc_sources:.md=.html))

docassets = $(addprefix out/,$(wildcard doc/assets/*))

VERSION = $(shell node -e "console.log( require('./src/package.json').version )")
UNAME := $(shell uname -s)

ensure_marked_is_installed:
	set -eu; \
	hash npm; \
	if [ $(shell npm list --prefix bin/doc >/dev/null 2>/dev/null; echo $$?) -ne "0" ]; then \
		npm ci --prefix=bin/doc; \
	fi

docs: ensure_marked_is_installed $(outdoc_files) $(docassets)

out/doc/assets/%: doc/assets/%
	mkdir -p $(@D)
	cp $< $@

out/doc/%.html: doc/%.md
	mkdir -p $(@D)
	node bin/doc/generate.js --format=html --template=doc/template.html $< > $@
ifeq ($(UNAME),Darwin)
	sed -i '' 's/__VERSION__/${VERSION}/' $@
else
	sed -i 's/__VERSION__/${VERSION}/' $@
endif

clean:
	rm -rf out/
