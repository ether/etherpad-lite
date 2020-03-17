function customStart()
{
  $('#pad_title').show();

  var showMoreIconBtn = $('<span class="show-more-icon-btn"></span>')
  showMoreIconBtn.click(function() {
    $('.toolbar').toggleClass('full-icons');
    $('#editorcontainer').css('top', $('.menu_left').height() + 1 + 'px');
  })
  $('.toolbar').append(showMoreIconBtn)

  var timer;
  // on resize end
  window.onresize = function(){
    clearTimeout(timer);
    timer = setTimeout(checkAllIconAreDisplayedInToolbar, 100);
  };
  setTimeout(checkAllIconAreDisplayedInToolbar, 300);
  setTimeout(checkAllIconAreDisplayedInToolbar, 600);
}

function checkAllIconAreDisplayedInToolbar()
{
  // reset style
  $('.toolbar').removeClass('cropped')
  console.log("check icons displayed", $('.toolbar .menu_left')[0].scrollWidth, $('.toolbar').width());

  if ($('.toolbar .menu_left')[0].scrollWidth > $('.toolbar').width()) {
    console.log("button are hidden");
    $('.toolbar').addClass('cropped');
  }
}
