// @ts-nocheck
'use strict';

// Specific hash to display the skin variants builder popup
if (window.location.hash.toLowerCase() === '#skinvariantsbuilder') {
  $('#skin-variants').addClass('popup-show');

  const containers = ['editor', 'background', 'toolbar'];
  const colors = ['super-light', 'light', 'dark', 'super-dark'];

  // add corresponding classes when config change
  const updateSkinVariantsClasses = () => {
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

    const newClasses = [];
    $('select.skin-variant-color').each(function () {
      newClasses.push(`${$(this).val()}-${$(this).data('container')}`);
    });
    if ($('#skin-variant-full-width').is(':checked')) newClasses.push('full-width-editor');

    domsToUpdate.forEach((el) => { el.addClass(newClasses.join(' ')); });

    $('#skin-variants-result').val(`"skinVariants": "${newClasses.join(' ')}",`);
  };

  // run on init
  const updateCheckboxFromSkinClasses = () => {
    $('html').attr('class').split(' ').forEach((classItem) => {
      const container = classItem.substring(classItem.lastIndexOf('-') + 1, classItem.length);
      if (containers.indexOf(container) > -1) {
        const color = classItem.substring(0, classItem.lastIndexOf('-'));
        $(`.skin-variant-color[data-container="${container}"`).val(color);
      }
    });

    $('#skin-variant-full-width').prop('checked', $('html').hasClass('full-width-editor'));
  };

  $('.skin-variant').on('change', () => {
    updateSkinVariantsClasses();
  });

  updateCheckboxFromSkinClasses();
  updateSkinVariantsClasses();
}
