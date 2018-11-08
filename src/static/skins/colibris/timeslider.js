function customStart()
{
  console.log("custom start", $('#timeslider-wrapper').length);
  // inverse display order betwwen slidebar and titles
  $('#timeslider-wrapper').appendTo('#timeslider-top');
}
