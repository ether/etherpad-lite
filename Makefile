doc_dirs = doc $(wildcard doc/*/)
outdoc_dirs = out $(addprefix out/,$(doc_dirs))
doc_sources = $(wildcard doc/*/*.md) $(wildcard doc/*.md)
outdoc_files = $(addprefix out/,$(doc_sources:.md=.html))
VERSION = $(shell node -e "console.log( require('./src/package.json').version )") 

docs: $(outdoc_files)

out/doc/%.html: doc/%.md
	mkdir -p $(@D)
	node tools/doc/generate.js --format=html --template=doc/template.html $< > $@
	cat $@ | sed 's/__VERSION__/${VERSION}/' > $@

clean:
	rm -rf out/
