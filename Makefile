doc_sources = $(wildcard doc/*/*.md) $(wildcard doc/*.md)
outdoc_files = $(addprefix out/,$(doc_sources:.md=.html))

docassets = $(addprefix out/,$(wildcard doc/assets/*))

VERSION = $(shell node -e "console.log( require('./src/package.json').version )") 
UNAME := $(shell uname -s)

docs: $(outdoc_files) $(docassets)

out/doc/assets/%: doc/assets/%
	mkdir -p $(@D)
	cp $< $@

out/doc/%.html: doc/%.md
	mkdir -p $(@D)
	node tools/doc/generate.js --format=html --template=doc/template.html $< > $@
ifeq ($(UNAME),Darwin)
	sed -i '' 's/__VERSION__/${VERSION}/' $@
else
	sed -i 's/__VERSION__/${VERSION}/' $@
endif

clean:
	rm -rf out/
