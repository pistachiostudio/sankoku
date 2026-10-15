# VSS のバージョンは固定する（latest だと差し替えや破壊的変更がそのまま本番に入るため）
# 上げるときは VSS_VERSION と VSS_SHA256_LINUX_AMD64 を一緒に更新する
VSS_VERSION ?= v0.18.0
VSS_RELEASE_URL = https://github.com/veltiosoft/vss/releases/download/$(VSS_VERSION)
VSS_SHA256_LINUX_AMD64 ?=

clean:
	rm -rf ./vss_* ./vss

# for linux
setup: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_linux_amd64.tar.gz
	sha256sum vss_linux_amd64.tar.gz
	@if [ -n "$(VSS_SHA256_LINUX_AMD64)" ]; then \
		echo "$(VSS_SHA256_LINUX_AMD64)  vss_linux_amd64.tar.gz" | sha256sum -c -; \
	else \
		echo "Warning: VSS_SHA256_LINUX_AMD64 is not set, skipping checksum verification"; \
	fi
	tar -xvf vss_linux_amd64.tar.gz
	chmod +x vss

# for macOS (Apple Silicon)
setup-mac: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_darwin_arm64.tar.gz
	tar -xvf vss_darwin_arm64.tar.gz
	chmod +x vss

# for macOS (Intel)
setup-mac-intel: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_darwin_amd64.tar.gz
	tar -xvf vss_darwin_amd64.tar.gz
	chmod +x vss

setup-win: clean
	curl -fsSLO $(VSS_RELEASE_URL)/vss_windows_amd64.zip
	unzip vss_windows_amd64.zip

# ビルド前処理（info.json / slides.json / activity_logs.json 等を生成）
generate:
	@echo "Generating info banner..."
	@node generate-info.js || echo "Warning: Node.js not found, skipping info generation"
	@echo "Generating slides list..."
	@node generate-slides-list.js || echo "Warning: Node.js not found, skipping slides list generation"
	@echo "Generating logs..."
	@node generate-logs.js || echo "Warning: Node.js not found, skipping logs generation"

build: generate
	@echo "Building site..."
	./vss build

build-win: generate
	@echo "Building site..."
	./vss.exe build

serve: generate
	@echo "Starting development server..."
	./vss serve

serve-win: generate
	@echo "Starting development server..."
	./vss.exe serve

resize-images:
	@echo "Resizing images in static/slides..."
	python3 resize-images.py

resize-images-win:
	@echo "Resizing images in static/slides..."
	py -3 resize-images.py