// slideshow container
let slideshow_frame = document.getElementById("slideshow-frame");
let SLIDESHOW_CHILD_NAME = "slide-card";
let ACTIVE_STATUS_NAME = "active-slide";
let INACTIVE_STATUS_NAME = "inactive-slide";
let LEFT_HIDDEN = "left-scrolled";
let RIGHT_HIDDEN = "right-scrolled";

function initializeSlideshow() {
    let slideshow_element = slideshow_frame;
    let active_reached = false;
    let slideshow_children = Array.from(slideshow_element.children);

    slideshow_children.forEach((element, cur_slide_index) => {
        if (!element.classList.contains(SLIDESHOW_CHILD_NAME)) {
            return;
        }
        
        if (!active_reached) {
            if (element.classList.contains(ACTIVE_STATUS_NAME)) {
                // don't translate active slide
                active_reached = true;
            } else {
                // until you reach active slide: translate slide -100%
                element.classList.remove(INACTIVE_STATUS_NAME);
                element.classList.add(LEFT_HIDDEN);
            }
        } else {
            // after you reach active slide: translate slide +100%
            element.classList.remove(INACTIVE_STATUS_NAME);
            element.classList.add(RIGHT_HIDDEN);
        }
        console.log(element.classList);
    });
}

function ScrollLeft() {
    let slideshow_element = slideshow_frame;
    let slideshow_children = Array.from(slideshow_element.children);
    let active_slide_index = undefined;
    let iteration_exit = 0;

    slideshow_children.forEach((element, cur_slide_index) => {
        // skip over any un-formatted slides
        if (!element.classList.contains(SLIDESHOW_CHILD_NAME)) {
            return;
        }

        // check if active slide
        if (element.classList.contains(ACTIVE_STATUS_NAME)) {
            // if multiple active slides - abort and return -1
            if (active_slide_index != undefined) {
                iteration_exit = -1;
                return;
            } else {
                active_slide_index = cur_slide_index;
            }
        }
    });

    if (iteration_exit != 0 || active_slide_index == undefined) {
        return iteration_exit;
    }

    if (active_slide_index == 0) {
        // if active slide is first (not possible to go left) - abort and return 2
        return 2;
    }

    // remove active slide status -> set to right side
    slideshow_children[active_slide_index].classList.remove(ACTIVE_STATUS_NAME);
    slideshow_children[active_slide_index].classList.add(RIGHT_HIDDEN);

    console.log("success!", active_slide_index);

    /* moving in new current slide */
    let new_active_slide = active_slide_index - 1;
    let new_active_child = slideshow_children[new_active_slide];

    // Clear all positioning classes and make it active
    new_active_child.classList.remove(INACTIVE_STATUS_NAME, LEFT_HIDDEN, RIGHT_HIDDEN);
    new_active_child.classList.add(ACTIVE_STATUS_NAME);

    return 0;
}

function ScrollRight() {
    let slideshow_element = slideshow_frame;
    let slideshow_children = Array.from(slideshow_element.children);
    let active_slide_index = undefined;
    let iteration_exit = 0;

    slideshow_children.forEach((element, cur_slide_index) => {
        // skip over any un-formatted slides
        if (!element.classList.contains(SLIDESHOW_CHILD_NAME)) {
            return;
        }

        // check if active slide
        if (element.classList.contains(ACTIVE_STATUS_NAME)) {
            // if multiple active slides - abort and return -1
            if (active_slide_index != undefined) {
                iteration_exit = -1;
                return;
            } else {
                active_slide_index = cur_slide_index;
            }
        }
    });

    if (iteration_exit != 0 || active_slide_index == undefined) {
        return iteration_exit;
    }

    if (active_slide_index >= slideshow_children.filter(el => el.classList.contains(SLIDESHOW_CHILD_NAME)).length - 1) {
        // if active slide is last (not possible to go right) - abort and return 2
        return 2;
    }

    // remove active slide status -> set to left side
    slideshow_children[active_slide_index].classList.remove(ACTIVE_STATUS_NAME);
    slideshow_children[active_slide_index].classList.add(LEFT_HIDDEN);

    console.log("success!", active_slide_index);

    /* moving in new current slide */
    let new_active_slide = active_slide_index + 1;
    let new_active_child = slideshow_children[new_active_slide];

    // Clear all positioning classes and make it active
    new_active_child.classList.remove(INACTIVE_STATUS_NAME, LEFT_HIDDEN, RIGHT_HIDDEN);
    new_active_child.classList.add(ACTIVE_STATUS_NAME);

    return 0;
}

// Initialize slideshow when page loads
initializeSlideshow();
