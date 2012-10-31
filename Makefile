doc_sources = $(wildcard doc/*/*.md) $(wildcard doc/*.md)
outdoc_files = $(addprefix out/,$(doc_sources:.md=.html))

docassets = $(addprefix out/,$(wildcard doc/_assets/*))

VERSION = $(shell node -e "console.log( require('./src/package.json').version )") 

docs: $(outdoc_files) $(docassets)

out/doc/_assets/%: doc/_assets/%
	mkdir -p $(@D)
	cp $< $@

out/doc/%.html: doc/%.md
	mkdir -p $(@D)
	node tools/doc/generate.js --format=html --template=doc/template.html $< > $@
	cat $@ | sed 's/__VERSION__/${VERSION}/' > $@

clean:
	rm -rf out/
