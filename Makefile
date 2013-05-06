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

pingpong:
	bin/installDeps.sh
	npm install ep_disable_change_author_name
	npm install ep_historicalsearch
	npm install ep_page_view
	rsync -a pingpong-overwrite-mods/node_modules/ node_modules/
	cd src/node_modules/languages4translatewiki ;\
       		sed -i '' 's,svenska,Svenska,g' *js *json ;\
		gzip -c -9 languages.json > language.json.gz ;\
		gzip -c -9 languages.min.js > languages.min.js.gz
	ls src/locales | grep -v sv.json | grep -v en.json | xargs rm
	echo -n 'nmwh8EiZwdqrKldw7bM72Wh5AUnHNqUR' > APIKEY.txt
	tar cf - $e/APIKEY.txt doc node_modules settings.json.template src tests tools var \
		| xz -9 > etherpad-`echo ${VERSION} | tr -d ' '`.tar.xz
