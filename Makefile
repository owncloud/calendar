SHELL := /bin/bash


COMPOSER_BIN := $(shell command -v composer 2> /dev/null)
ifndef COMPOSER_BIN
    $(error composer is not available on your system, please install composer)
endif

YARN := $(shell command -v yarn 2> /dev/null)
NODE_PREFIX=$(shell pwd)

KARMA=$(NODE_PREFIX)/node_modules/.bin/karma
JSDOC=$(NODE_PREFIX)/node_modules/.bin/jsdoc

app_name=$(notdir $(CURDIR))
doc_files=README.md CHANGELOG.md
src_dirs=appinfo js l10n templates
all_src=$(src_dirs) $(doc_files)
build_dir=$(CURDIR)/build
dist_dir=$(build_dir)/dist
tests_acceptance_directory=$(CURDIR)/../../tests/acceptance

nodejs_deps=node_modules

# composer
composer_deps=
composer_dev_deps=
acceptance_test_deps=vendor-bin/behat/vendor

occ=$(CURDIR)/../../occ
private_key=$(HOME)/.owncloud/certificates/$(app_name).key
certificate=$(HOME)/.owncloud/certificates/$(app_name).crt
sign=$(occ) integrity:sign-app --privateKey="$(private_key)" --certificate="$(certificate)"
sign_skip_msg="Skipping signing, either no key and certificate found in $(private_key) and $(certificate) or occ can not be found at $(occ)"
ifneq (,$(wildcard $(private_key)))
ifneq (,$(wildcard $(certificate)))
ifneq (,$(wildcard $(occ)))
	CAN_SIGN=true
endif
endif
endif

all: build

# Fetches the PHP and JS dependencies and compiles the JS. If no composer.json
# is present, the composer step is skipped, if no package.json or js/package.json
# is present, the npm step is skipped
.PHONY: build
build:
	make yarn

# Installs yarn dependencies
.PHONY: yarn
yarn:
	cd js && $(yarn) run build

# Remove the appstore build and generated guests bundle
.PHONY: clean
clean: clean-nodejs-deps clean-composer-deps
	rm -rf ./build

.PHONY: clean-nodejs-deps
clean-nodejs-deps:
	rm -Rf $(nodejs_deps)

.PHONY: clean-composer-deps
clean-composer-deps:
	rm -rf ./vendor
	rm -Rf vendor-bin/**/vendor vendor-bin/**/composer.lock

# Same as clean but also removes dependencies installed by npm
.PHONY: distclean
distclean: clean


# bin file definitions
PHPUNIT=php -d zend.enable_gc=0  "$(PWD)/../../lib/composer/bin/phpunit"
PHPUNITDBG=phpdbg -qrr -d memory_limit=4096M -d zend.enable_gc=0 "$(PWD)/../../lib/composer/bin/phpunit"
PHP_CS_FIXER=php -d zend.enable_gc=0 vendor-bin/owncloud-codestyle/vendor/bin/php-cs-fixer
PHAN=php -d zend.enable_gc=0 vendor-bin/phan/vendor/bin/phan
PHPSTAN=php -d zend.enable_gc=0 vendor-bin/phpstan/vendor/bin/phpstan
BEHAT_BIN=vendor-bin/behat/vendor/bin/behat

.DEFAULT_GOAL := help

# start with displaying help
help: ## Show this help message
	@fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##//' | sed -e 's/  */ /' | column -t -s :

.PHONY: dist
dist: ## Build the source and appstore package
	make appstore

# Build the source package for the app store, ignores php and js tests
.PHONY: appstore
appstore: ## Build the source package for the app store
	rm -rf $(dist_dir)
	mkdir -p $(dist_dir)/$(app_name)
	cp -R $(all_src) $(dist_dir)/$(app_name)

ifdef CAN_SIGN
	$(sign) --path="$(dist_dir)/$(app_name)"
else
	@echo $(sign_skip_msg)
endif
	tar -czf $(dist_dir)/$(app_name).tar.gz -C $(dist_dir) $(app_name)
	tar -cjf $(dist_dir)/$(app_name).tar.bz2 -C $(dist_dir) $(app_name)

$(nodejs_deps): package.json yarn.lock
	yarn install && touch $@

$(KARMA): $(nodejs_deps)

##------------
## Tests
##------------

# Command for running all tests.
.PHONY: test
test: test-php-unit test-js

# Command for running JS and PHP tests. Works for package.json files in the js/
# and root directory. If phpunit is not installed systemwide, a copy is fetched
# from the internet
# .PHONY: test
# test:
# 	cd js && $(yarn) run test
# ifneq ("$(wildcard $(phpunit_oc10))","")
# 	php $(phpunit_oc10) -c phpunit.xml --coverage-clover coverage.clover
# else
# 	phpunit -c phpunit.xml --coverage-clover coverage.clover
#   phpunit -c phpunit.integration.xml --coverage-clover build/php-unit.clover
# endif

.PHONY: test-php-codecheck
test-php-codecheck:
	# currently fails - as we use a private api
	# $(occ) app:check-code $(app_name) -c private
	$(occ) app:check-code $(app_name) -c strong-comparison
	$(occ) app:check-code $(app_name) -c deprecation

.PHONY: test-php-style
test-php-style: ## Run php-cs-fixer and check owncloud code-style
test-php-style: vendor-bin/owncloud-codestyle/vendor
	$(PHP_CS_FIXER) fix -v --diff --diff-format udiff --dry-run --allow-risky yes

.PHONY: test-php-style-fix
test-php-style-fix: ## Run php-cs-fixer and fix code style issues
test-php-style-fix: vendor-bin/owncloud-codestyle/vendor
	$(PHP_CS_FIXER) fix -v --diff --diff-format udiff --allow-risky yes

.PHONY: test-php-unit
test-php-unit: ## Run php unit tests
test-php-unit:
	$(PHPUNIT) --configuration phpunit.xml --testsuite unit --coverage-clover coverage.clover

.PHONY: test-php-unit-dbg
test-php-unit-dbg: ## Run php unit tests using phpdbg
test-php-unit-dbg:
	$(PHPUNITDBG) --configuration phpunit.xml --testsuite unit

.PHONY: test-js
test-js: ## Test js files
test-js: $(nodejs_deps)
	$(YARN) run test

#
# Dependency management
#--------------------------------------

composer.lock: composer.json
	@echo composer.lock is not up to date.

vendor: composer.lock
	composer install --no-dev

vendor/bamarni/composer-bin-plugin: composer.lock
	composer install

vendor-bin/owncloud-codestyle/vendor: vendor/bamarni/composer-bin-plugin vendor-bin/owncloud-codestyle/composer.lock
	composer bin owncloud-codestyle install --no-progress

vendor-bin/owncloud-codestyle/composer.lock: vendor-bin/owncloud-codestyle/composer.json
	@echo owncloud-codestyle composer.lock is not up to date.

vendor-bin/phan/vendor: vendor/bamarni/composer-bin-plugin vendor-bin/phan/composer.lock
	composer bin phan install --no-progress

vendor-bin/phan/composer.lock: vendor-bin/phan/composer.json
	@echo phan composer.lock is not up to date.

vendor-bin/phpstan/vendor: vendor/bamarni/composer-bin-plugin vendor-bin/phpstan/composer.lock
	composer bin phpstan install --no-progress

vendor-bin/phpstan/composer.lock: vendor-bin/phpstan/composer.json
	@echo phpstan composer.lock is not up to date.
