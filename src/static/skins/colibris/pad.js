function customStart()
{
  $('#pad_title').show();

  $('.hyperlink-icon').on('click',function() {
    $('.hyperlink-dialog').appendTo('body').css({'top': $('.hyperlink-icon').offset().top + 42, 'left': $('.hyperlink-icon').offset().left - 12});
  });
  $('.hyperlink-url').on("keyup", function(e)
  {
    if(e.keyCode == 13) // touche entrée
    { 
      $('.hyperlink-save').click();
    }
  });
  $('.hyperlink-save').click(function() { $('.hyperlink-dialog').hide(); });
}
