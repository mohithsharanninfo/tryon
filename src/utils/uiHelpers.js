import ear1 from '../assets/jwellery/ear1.png'
import ear2 from '../assets/jwellery/ear2.png'
import necklace1 from '../assets/jwellery/necklace1.png'
import necklace2 from '../assets/jwellery/necklace2.png'

export const jewelryLibrary = {
  earrings: {
    diamond: {
      id: 'ear1',
      path: ear1,
      type: 'earrings',
      anchorPoints: [234, 454]
    },
    pearl: {
      id: 'ear2',
      path: ear2,
      type: 'earrings',
      anchorPoints: [234, 454]
    }
  },
  necklaces: {
    gold: {
      id: 'necklace1',
      path: necklace1,
      type: 'necklace',
      anchorPoints: [152, 377]
    },
    silver: {
      id: 'necklace2',
      path: necklace2,
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