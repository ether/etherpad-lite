/**
 * the contentWindow is either the normal pad or timeslider
 *
 * @returns {HTMLElement} contentWindow
 */
helper.contentWindow = function(){
  return $('#iframe-container iframe')[0].contentWindow;
}
