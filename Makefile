.PHONY: all debug tests

all:
	@cd bin && bash run.sh
debug:
	@cd bin && bash runDebug.sh
tests:
	@cd bin && bash runTests.sh
