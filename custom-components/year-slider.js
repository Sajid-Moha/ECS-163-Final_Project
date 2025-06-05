/* ai generated slider code */
const slider = document.getElementById('yearSlider');
const tooltip = document.getElementById('yearTooltip');

// Update tooltip position and value
function updateTooltip(e) {
    const rect = slider.getBoundingClientRect();
    const percent = (slider.value - slider.min) / (slider.max - slider.min);
    const tooltipX = percent * rect.width;
    
    tooltip.style.left = tooltipX + 'px';
    tooltip.textContent = slider.value;
}

// Show tooltip on hover and drag
slider.addEventListener('mouseenter', () => {
    tooltip.classList.add('show');
    updateTooltip();
});

slider.addEventListener('mouseleave', () => {
    tooltip.classList.remove('show');
});

// Update tooltip during dragging
slider.addEventListener('input', updateTooltip);

// Initialize tooltip position
updateTooltip();
