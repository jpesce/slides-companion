# Releases Slides Companion:
# - builds the zip for the Chrome Web Store (npm run build)
# - keeps the version number in extension/manifest.json
# - tags the version and makes its GitHub release, with its notes from CHANGELOG.md
#
# A release: `make bump`, write what changed under the new version in CHANGELOG.md and date it,
# commit and push, then `make all`. Upload the zip it makes at the Chrome Web Store dashboard.

PROJECT = slides-companion
BUILD_DIR = build
VERSION = $(shell node scripts/release.mjs version)
TAG = v$(VERSION)
ZIPNAME = $(BUILD_DIR)/$(PROJECT)-$(TAG).zip
STORE_DASHBOARD = https://chrome.google.com/webstore/devconsole

# @help: Show this help message
.PHONY: help
help:
	@echo "\n📋 Available commands:\n"
	@grep -E '^# @[a-zA-Z_-]+:' $(MAKEFILE_LIST) | sed 's/^# @//' | awk -F: '{printf "\033[34m%-12s\033[0m %s\n", $$1, $$2}'

# @all: Main release workflow - builds the package, creates and pushes the git tag and creates the GitHub release
.PHONY: all
all: ensure-main ensure-clean ensure-pushed ensure-notes \
	build tag push-tag release
	@echo "\n📮 Last step: upload \033[34m$(ZIPNAME)\033[0m at $(STORE_DASHBOARD)"


# @build: Builds the zip package for the current version, without the dev auto-reload
.PHONY: build
build: require-zip
	@echo "\n📦 Building release package for $(TAG)…\n"
	@npm run --silent build
	@echo "\n✨ Release package \033[34m$(ZIPNAME)\033[0m created successfully"

$(ZIPNAME): build


# @test-build: Builds, then runs every test on the built package
.PHONY: test-build
test-build:
	@npm run test:build


# @clean: Removes all built packages
.PHONY: clean
clean:
	@echo "\n🧹 Cleaning build directory \033[34m$(BUILD_DIR)\033[0m"
	@rm -rf $(BUILD_DIR)


# @bump: Updates the version number in the manifest and starts its section in CHANGELOG.md
.PHONY: bump
bump:
	@echo "\n⬆️ Bumping version $(VERSION)\n";
	@while true; do \
		read -p "Bump (M)ajor, (m)inor, (p)atch, or (a)bort? " answer; \
		case "$$answer" in \
			M) part=major; break;; \
			m) part=minor; break;; \
			p) part=patch; break;; \
			a) echo "Version bump aborted."; exit 130;; \
			*) echo "Invalid option. Please try again.";; \
		esac; \
	done; \
	new_version=$$(node scripts/release.mjs bump $$part) || exit 1; \
	echo "\n✨ Version bumped to $$new_version"; \
	echo "Write what changed under \033[34m## v$$new_version\033[0m in CHANGELOG.md, and date it when releasing."


# @notes: Shows the release notes for the current version, from CHANGELOG.md
.PHONY: notes
notes: ensure-notes
	@node scripts/release.mjs notes $(VERSION)


# @tag: Creates the version tag in the local repository, with its notes from CHANGELOG.md
.PHONY: tag
tag: ensure-notes
	@# Check if tag already exists
	@if git rev-parse $(TAG) >/dev/null 2>&1; then \
		echo "\n❌ Tag \033[34m$(TAG)\033[0m already exists."; \
		echo "If this is a new version, please run 'make bump' first to increment the version number.\n"; \
		exit 1; \
	fi
	@{ echo "$(TAG)"; echo; node scripts/release.mjs notes $(VERSION); } | git tag -a $(TAG) --cleanup=verbatim -F -
	@echo "\n✨ Tag $(TAG) created successfully"


# @push-tag: Pushes the version tag to the remote repository
.PHONY: push-tag
push-tag: ensure-tag
	@echo "\n⬆️ Pushing tag to remote repository..."
	@git push origin tag $(TAG)
	@echo "\n✨ Tag pushed successfully"


# @release: Creates the GitHub release with the notes from CHANGELOG.md and the package attached
.PHONY: release
release: require-gh ensure-tag ensure-notes $(ZIPNAME)
	@echo "\n🚀 Creating GitHub release for \033[34m$(TAG)\033[0m..."
	@# A note recommending the Chrome Web Store, then the version's changes
	@{ cat .githubreleasepreamble; echo; node scripts/release.mjs notes $(VERSION); } > .releasenotes.tmp
	@gh release create $(TAG) --title "$(TAG)" --notes-file .releasenotes.tmp "$(ZIPNAME)"
	@rm .releasenotes.tmp
	@echo "\n✨ Release created and package uploaded successfully"


.PHONY: require-zip
require-zip:
	@command -v zip >/dev/null 2>&1 || { echo "\n❌ \033[31mzip\033[0m is required but not installed. Please install it first."; exit 1; }

.PHONY: require-gh
require-gh:
	@command -v gh >/dev/null 2>&1 || { echo "\n❌ \033[31mgh\033[0m (GitHub CLI) is required but not installed. Please install it first."; exit 1; }

.PHONY: ensure-notes
ensure-notes:
	@node scripts/release.mjs notes $(VERSION) >/dev/null || { echo "\n❌ Release notes for \033[34m$(TAG)\033[0m aren't ready (see above).\n"; exit 1; }

.PHONY: ensure-tag
ensure-tag:
	@if ! git rev-parse $(TAG) >/dev/null 2>&1; then \
		echo "\n❌️ Tag \033[34m$(TAG)\033[0m does not exist. Create it first with 'make tag'"; \
		exit 1; \
	fi

.PHONY: ensure-main
ensure-main:
	@if [ "$$(git branch --show-current)" != "main" ]; then \
		echo "\n❌ You must be on the \033[34mmain\033[0m branch to create a release."; \
		echo "Please switch to the main branch first.\n"; \
		exit 1; \
	fi

.PHONY: ensure-clean
ensure-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "\n❌ Git working directory is not clean."; \
		echo "Please commit or stash your changes first.\n"; \
		exit 1; \
	fi

.PHONY: ensure-pushed
ensure-pushed:
	@if ! git rev-parse @{upstream} >/dev/null 2>&1; then \
		echo "\n❌ This branch has no remote to release from."; \
		echo "Please push it first.\n"; \
		exit 1; \
	fi
	@if [ -n "$$(git rev-list @{upstream}..HEAD)" ]; then \
		echo "\n❌ You have unpushed commits."; \
		echo "Please push your changes first or move them to another branch.\n"; \
		exit 1; \
	fi
