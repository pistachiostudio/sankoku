// Image Gallery Modal Script
(function() {
  // DOMが読み込まれた後に実行
  document.addEventListener('DOMContentLoaded', function() {
    // ギャラリーコンテナを作成して、最後のhrタグの後に挿入
    const hrs = document.querySelectorAll('hr');
    if (hrs.length === 0) {
      return; // hrタグがない場合は何もしない
    }

    const lastHr = hrs[hrs.length - 1];
    const galleryContainer = document.createElement('div');
    galleryContainer.id = 'gallery-container';

    // hrの次の要素として挿入
    if (lastHr.nextSibling) {
      lastHr.parentNode.insertBefore(galleryContainer, lastHr.nextSibling);
    } else {
      lastHr.parentNode.appendChild(galleryContainer);
    }

    // slides.json から画像リストを読み込む
    fetch('slides/slides.json')
      .then(function(response) {
        if (!response.ok) {
          throw new Error('slides.json not found');
        }
        return response.json();
      })
      .then(function(imageFiles) {
        if (imageFiles.length === 0) {
          return; // 画像がない場合は何もしない
        }

        // ギャラリーグリッドを作成
        const galleryDiv = document.createElement('div');
        galleryDiv.className = 'image-gallery';

        imageFiles.forEach(function(filename) {
          const galleryItem = document.createElement('div');
          galleryItem.className = 'gallery-item';

          const thumbnail = document.createElement('img');
          thumbnail.src = 'slides/' + filename;
          thumbnail.alt = filename;
          thumbnail.className = 'gallery-thumbnail';

          galleryItem.appendChild(thumbnail);
          galleryDiv.appendChild(galleryItem);
        });

        galleryContainer.appendChild(galleryDiv);

        // モーダルを作成
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '&times;';

        const modalImg = document.createElement('img');
        modalImg.className = 'modal-content';
        modalImg.id = 'modalImage';

        // 左矢印ボタン
        const prevBtn = document.createElement('span');
        prevBtn.className = 'modal-prev';
        prevBtn.innerHTML = '&#10094;';

        // 右矢印ボタン
        const nextBtn = document.createElement('span');
        nextBtn.className = 'modal-next';
        nextBtn.innerHTML = '&#10095;';

        modal.appendChild(closeBtn);
        modal.appendChild(prevBtn);
        modal.appendChild(nextBtn);
        modal.appendChild(modalImg);
        document.body.appendChild(modal);

        let currentImageIndex = 0;

        // 画像を表示する関数
        function showImage(index) {
          currentImageIndex = index;
          modalImg.src = 'slides/' + imageFiles[index];

          // 最初の画像では左矢印を非表示
          prevBtn.style.display = (index === 0) ? 'none' : 'block';
          // 最後の画像では右矢印を非表示
          nextBtn.style.display = (index === imageFiles.length - 1) ? 'none' : 'block';
        }

        // サムネイル画像をクリックしたときの処理
        const galleryThumbnails = document.querySelectorAll('.gallery-thumbnail');
        galleryThumbnails.forEach(function(thumbnail, index) {
          thumbnail.addEventListener('click', function() {
            modal.style.display = 'block';
            showImage(index);
          });
        });

        // 前の画像へ
        prevBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (currentImageIndex > 0) {
            showImage(currentImageIndex - 1);
          }
        });

        // 次の画像へ
        nextBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (currentImageIndex < imageFiles.length - 1) {
            showImage(currentImageIndex + 1);
          }
        });

        // 閉じるボタンをクリックしたときの処理
        closeBtn.addEventListener('click', function() {
          modal.style.display = 'none';
        });

        // モーダル背景をクリックしたときの処理
        modal.addEventListener('click', function(e) {
          if (e.target === modal) {
            modal.style.display = 'none';
          }
        });

        // キーボード操作
        document.addEventListener('keydown', function(e) {
          if (modal.style.display === 'block') {
            if (e.key === 'Escape') {
              modal.style.display = 'none';
            } else if (e.key === 'ArrowLeft') {
              if (currentImageIndex > 0) {
                showImage(currentImageIndex - 1);
              }
            } else if (e.key === 'ArrowRight') {
              if (currentImageIndex < imageFiles.length - 1) {
                showImage(currentImageIndex + 1);
              }
            }
          }
        });
      })
      .catch(function(error) {
        console.error('Error loading gallery:', error);
      });
  });
})();
