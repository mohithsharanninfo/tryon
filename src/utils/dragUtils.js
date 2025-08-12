
//use this to get the bounds of the rendered image element
// This function calculates the bounds of an image element, accounting for its position in the document. But it is not used in the current codebase.
// It returns an object with the left, top, width, and height of the image element
export function getRenderedImageBounds(imageElement) {
  const rect = imageElement.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  return {
    left: rect.left + scrollLeft,
    top: rect.top + scrollTop,
    width: rect.width,
    height: rect.height
  };
}
