// Specific hash to display the skin variants builder popup
if (window.location.hash.toLowerCase() == "#skinvariantsbuilder") {
  $('#skin-variants').addClass('popup-show');

  $('.skin-variant').change(function() {
    updateSkinVariantsClasses();
  });

  var containers = ['editor', 'background', 'toolbar'];
  var colors = ['super-light', 'light', 'dark', 'super-dark'];

  updateCheckboxFromSkinClasses();
  updateSkinVariantsClasses();

  // add corresponding classes when config change
  function updateSkinVariantsClasses() {
    var domsToUpdate = [
      $('html'),
      $('iframe[name=ace_outer]').contents().find('html'),
      $('iframe[name=ace_outer]').contents().find('iframe[name=ace_inner]').contents().find('html')
    ];
    colors.forEach(function(color) {
      containers.forEach(function(container) {
        domsToUpdate.forEach(function(el) { el.removeClass(color + '-' + container); });
      })
    })

    domsToUpdate.forEach(function(el) { el.removeClass('full-width-editor'); });

    var new_classes = [];
    $('select.skin-variant-color').each(function() {
      new_classes.push($(this).val() + "-" + $(this).data('container'));
    })
    if ($('#skin-variant-full-width').is(':checked')) new_classes.push("full-width-editor");

    domsToUpdate.forEach(function(el) { el.addClass(new_classes.join(" ")); });

    $('#skin-variants-result').val('"skinVariants": "' + new_classes.join(" ") + '",');
  }

  // run on init
  function updateCheckboxFromSkinClasses() {
    $('html').attr('class').split(' ').forEach(function(classItem) {
      var container = classItem.split('-').slice(-1);

      var container = classItem.substring(classItem.lastIndexOf("-") + 1, classItem.length);
      if (containers.indexOf(container) > -1) {
        var color = classItem.substring(0, classItem.lastIndexOf("-"));
        $('.skin-variant-color[data-container="' + container + '"').val(color);
      }
    })

    $('#skin-variant-full-width').prop('checked', $('html').hasClass('full-width-editor'));
  }
}
