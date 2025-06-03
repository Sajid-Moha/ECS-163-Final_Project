// slideshow container
let slideshow_frame = document.getElementById("slideshow-frame")
slideshow_frame.class

let SLIDESHOW_CHILD_NAME = "slide-card";
let ACTIVE_STATUS_NAME = "active-slide";
let INACTIVE_STATUS_NAME = "inactive-slide";

function initializeSlideshow() {
  let slideshow_element = slideshow_frame;
  // except for leftmost (active) slide - translate all slides +100%

}

function ScrollLeft() {
  let slideshow_element = slideshow_frame;

  let slideshow_children = Array.from(slideshow_element.children);
  let active_slide_index = undefined;
  let iteration_exit = 0;

  console.log(slideshow_element)
  console.log(slideshow_children)

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

  // remove active slide status -> set inactive
  slideshow_children[active_slide_index].classList.remove(ACTIVE_STATUS_NAME);
  slideshow_children[active_slide_index].classList.add(INACTIVE_STATUS_NAME);

  console.log("success!", active_slide_index)

  /* moving in new current slide */
  let new_active_slide = active_slide_index - 1;
  let new_active_child = slideshow_children[new_active_slide];

  new_active_child.classList.remove(INACTIVE_STATUS_NAME);
  new_active_child.classList.add(ACTIVE_STATUS_NAME);

  // translate +100%;
  
  // add active-slide class

  return 0;
}

function ScrollRight() {

}
