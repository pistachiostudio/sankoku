clean:
	rm -rf ./vss_* ./vss

# for linux
setup: clean
	curl -OL https://github.com/vssio/go-vss/releases/latest/download/vss_linux_amd64.tar.gz
	tar -xvf vss_linux_amd64.tar.gz
	chmod +x vss

setup-win: clean
	curl -OL https://github.com/vssio/go-vss/releases/latest/download/vss_windows_amd64.zip
	unzip vss_windows_amd64.zip

build:
	@echo "Generating slides list..."
	@node generate-slides-list.js || echo "Warning: Node.js not found, skipping slides list generation"
	@echo "Generating logs..."
	@node generate-logs.js || echo "Warning: Node.js not found, skipping logs generation"
	@echo "Building site..."
	./vss build

build-win:
	@echo "Generating slides list..."
	@node generate-slides-list.js || echo "Warning: Node.js not found, skipping slides list generation"
	@echo "Generating logs..."
	@node generate-logs.js || echo "Warning: Node.js not found, skipping logs generation"
	@echo "Building site..."
	./vss.exe build

serve:
	@echo "Generating slides list..."
	@node generate-slides-list.js || echo "Warning: Node.js not found, skipping slides list generation"
	@echo "Generating logs..."
	@node generate-logs.js || echo "Warning: Node.js not found, skipping logs generation"
	@echo "Starting development server..."
	./vss serve

serve-win:
	@echo "Generating slides list..."
	@node generate-slides-list.js || echo "Warning: Node.js not found, skipping slides list generation"
	@echo "Generating logs..."
	@node generate-logs.js || echo "Warning: Node.js not found, skipping logs generation"
	@echo "Starting development server..."
	./vss.exe serve

resize-images:
	@echo "Resizing images in static/slides..."
	python3 resize-images.py

resize-images-win:
	@echo "Resizing images in static/slides..."
	py -3 resize-images.py