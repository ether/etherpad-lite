// Specific hash to display the skin variants builder popup
if (window.location.hash.toLowerCase() == '#skinvariantsbuilder') {
  $('#skin-variants').addClass('popup-show');

  $('.skin-variant').change(() => {
    updateSkinVariantsClasses();
  });

  const containers = ['editor', 'background', 'toolbar'];
  const colors = ['super-light', 'light', 'dark', 'super-dark'];

  updateCheckboxFromSkinClasses();
  updateSkinVariantsClasses();

  // add corresponding classes when config change
  function updateSkinVariantsClasses() {
    const domsToUpdate = [
      $('html'),
      $('iframe[name=ace_outer]').contents().find('html'),
      $('iframe[name=ace_outer]').contents().find('iframe[name=ace_inner]').contents().find('html'),
    ];
    colors.forEach((color) => {
      containers.forEach((container) => {
        domsToUpdate.forEach((el) => { el.removeClass(`${color}-${container}`); });
      });
    });

    domsToUpdate.forEach((el) => { el.removeClass('full-width-editor'); });

    const new_classes = [];
    $('select.skin-variant-color').each(function () {
      new_classes.push(`${$(this).val()}-${$(this).data('container')}`);
    });
    if ($('#skin-variant-full-width').is(':checked')) new_classes.push('full-width-editor');

    domsToUpdate.forEach((el) => { el.addClass(new_classes.join(' ')); });

    $('#skin-variants-result').val(`"skinVariants": "${new_classes.join(' ')}",`);
  }

  // run on init
  function updateCheckboxFromSkinClasses() {
    $('html').attr('class').split(' ').forEach((classItem) => {
      var container = classItem.split('-').slice(-1);

      var container = classItem.substring(classItem.lastIndexOf('-') + 1, classItem.length);
      if (containers.indexOf(container) > -1) {
        const color = classItem.substring(0, classItem.lastIndexOf('-'));
        $(`.skin-variant-color[data-container="${container}"`).val(color);
      }
    });

    $('#skin-variant-full-width').prop('checked', $('html').hasClass('full-width-editor'));
  }
}
