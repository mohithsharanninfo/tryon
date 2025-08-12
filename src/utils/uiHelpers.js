export const jewelryLibrary = {
  earrings: {
    diamond: {
      id: 'ear1',
      path: 'public/jwellery/ear1.png',
      type: 'earrings',
      anchorPoints: [234, 454]
    },
    pearl: {
      id: 'ear2',
      path: 'public/jwellery/ear2.png',
      type: 'earrings',
      anchorPoints: [234, 454]
    }
  },
  necklaces: {
    gold: {
      id: 'necklace1',
      path: 'public/jwellery/necklace1.png',
      type: 'necklace',
      anchorPoints: [152, 377]
    },
    silver: {
      id: 'necklace2',
      path: 'public/jwellery/necklace2.png',
      type: 'necklace',
      anchorPoints: [152, 377]
    }
  }
};

export function preloadJewelry() {
  Object.values(jewelryLibrary).forEach(category => {
    Object.values(category).forEach(item => {
      const img = new Image();
      img.src = item.path;
    });
  });
}

export function createJewelryElement(item) {
  const img = document.createElement('img');
  img.id = item.id;
  img.src = item.path;
  img.className = `jewelry-overlay ${item.type}`;
  img.style.display = 'none';
  img.dataset.type = item.type;
  const container = document.getElementById('camera-container');
  if (container) {
    container.appendChild(img);
  }
  return img;
}