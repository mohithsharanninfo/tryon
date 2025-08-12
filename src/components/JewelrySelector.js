export function renderJewelryButtons(onSelectCallback) {
  const container = document.createElement('div');
  container.className = 'jewelry-selector';

  const jewelryItems = [
    { id: 'ear1', label: 'Diamond Earrings', type: 'earrings' },
    { id: 'ear2', label: 'Pearl Earrings', type: 'earrings' },
    { id: 'necklace1', label: 'Gold Necklace', type: 'necklace' },
    { id: 'necklace2', label: 'Silver Pendant', type: 'necklace' }
  ];

  jewelryItems.forEach(item => {
    const button = createJewelryButton(item, onSelectCallback);
    container.appendChild(button);
  });

  return container;
}

function createJewelryButton(item, onSelectCallback) {
const button = document.createElement('button');
  button.className = `jewelry-btn ${item.type}-btn`;
  button.innerHTML = `<span class="jewelry-icon ${item.type}-icon"></span>${item.label}`;
  button.addEventListener('click', () => {
    onSelectCallback(item.id);
  });
  button.dataset.testid = `${item.type}-button`;
  return button;
}