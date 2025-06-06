// Mobile filter toggle functionality
    const mobileIndicator = document.getElementById('mobile-filter-indicator');
    const filterControls = document.getElementById('filter-controls');
    const filterOverlay = document.getElementById('filter-overlay');
    const mobileCloseBtn = document.getElementById('mobile-close-btn');
    const pullArrow = document.querySelector('.pull-arrow');
    
    function toggleMobileFilters() {
        const isShowing = filterControls.classList.contains('show');
        
        if (isShowing) {
            // Hide filters
            filterControls.classList.remove('show');
            filterOverlay.classList.remove('show');
            mobileIndicator.classList.remove('pulled');
            pullArrow.classList.remove('up');
            pullArrow.innerHTML = '▼';
            document.body.style.overflow = '';
        } else {
            // Show filters
            filterControls.classList.add('show');
            filterOverlay.classList.add('show');
            mobileIndicator.classList.add('pulled');
            pullArrow.classList.add('up');
            pullArrow.innerHTML = '▲';
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Only add mobile event listeners
    if (mobileIndicator) {
        mobileIndicator.addEventListener('click', toggleMobileFilters);
    }
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', toggleMobileFilters);
    }
    if (filterOverlay) {
        filterOverlay.addEventListener('click', toggleMobileFilters);
    }
    
    // Handle window resize - reset mobile state when switching to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // Desktop view - ensure mobile state is reset
            filterControls.classList.remove('show');
            filterOverlay.classList.remove('show');
            mobileIndicator.classList.remove('pulled');
            if (pullArrow) {
                pullArrow.classList.remove('up');
                pullArrow.innerHTML = '▼';
            }
            document.body.style.overflow = '';
        }
    });
    
    // Dropdown toggle functionality
    function setupDropdown(toggleId, dropdownId) {
        const toggle = document.getElementById(toggleId);
        const dropdown = document.getElementById(dropdownId);
        
        if (!toggle || !dropdown) return;
        
        toggle.addEventListener('click', function() {
            const isShowing = dropdown.classList.contains('show');
            
            // Hide all dropdowns first
            document.querySelectorAll('.filter-dropdown').forEach(dd => {
                dd.classList.remove('show');
            });
            
            // Update all toggle button text
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.innerHTML = btn.innerHTML.replace('▲', '▼');
            });
            
            if (!isShowing) {
                dropdown.classList.add('show');
                toggle.innerHTML = toggle.innerHTML.replace('▼', '▲');
            }
        });
    }
    
    // Setup dropdowns
    setupDropdown('genre-toggle', 'genre-dropdown');
    setupDropdown('keyword-toggle', 'keyword-dropdown');
    
    // Apply filters functionality
    const applyButton = document.getElementById('apply-filters');
    if (applyButton) {
        applyButton.addEventListener('click', function() {
            alert('Filters applied! (This is a demo - integrate with your actual filtering logic)');
            
            // Close mobile menu after applying filters
            if (window.innerWidth <= 768 && filterControls.classList.contains('show')) {
                toggleMobileFilters();
            }
        });
    }
    
    // Select all functionality
    const selectAllGenres = document.getElementById('select-all-genres');
    if (selectAllGenres) {
        selectAllGenres.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#genre-list input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
    
    const selectAllKeywords = document.getElementById('select-all-keywords');
    if (selectAllKeywords) {
        selectAllKeywords.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#keyword-list input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
