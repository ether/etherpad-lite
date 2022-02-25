'use strict';

const _handleNewLines = (ace) => {
  const rep = ace.ace_getRep();
  const lineNumber = rep.selStart[0];
  const curLine = rep.lines.atIndex(lineNumber);
  if (curLine.text) {
    ace.ace_doReturnKey();

    return lineNumber + 1;
  }

  return lineNumber;
};

const _isValid = (file) => {
  const mimedb = clientVars.ep_s3.mimeTypes;
  const mimeType = mimedb[file.type];
  let validMime = null;
  const errorTitle = html10n.get('ep_s3.error.title');

  if (clientVars.ep_s3 && clientVars.ep_s3.fileTypes) {
    validMime = false;
    if (mimeType && mimeType.extensions) {
      for (const fileType of clientVars.ep_s3.fileTypes) {
        const exists = mimeType.extensions.indexOf(fileType);
        if (exists > -1) {
          validMime = true;
        }
      }
    }
    if (validMime === false) {
      const errorMessage = html10n.get('ep_s3.error.fileType');
      $.gritter.add({title: errorTitle, text: errorMessage, sticky: true, class_name: 'error'});

      return false;
    }
  }

  if (clientVars.ep_s3 && file.size > clientVars.ep_s3.maxFileSize) {
    const allowedSize = (clientVars.ep_s3.maxFileSize / 1000000);
    const errorText = html10n.get('ep_s3.error.fileSize', {maxallowed: allowedSize});
    $.gritter.add({title: errorTitle, text: errorText, sticky: true, class_name: 'error'});

    return false;
  }

  return true;
};


exports.postToolbarInit = (hook, context) => {
  const toolbar = context.toolbar;
  toolbar.registerCommand('imageUpload', () => {
    $(document).find('body').find('#imageInput').remove();
    const fileInputHtml = `<input
    style="width:1px;height:1px;z-index:-10000;"
    id="imageInput" type="file" />`;
    $(document).find('body').append(fileInputHtml);

    $(document).find('body').find('#imageInput').on('change', (e) => {
      const files = e.target.files;
      if (!files.length) {
        return 'Please choose a file to upload first.';
      }
      const file = files[0];

      if (!_isValid(file)) {
        return;
      }
      if (clientVars.ep_s3.storageType === 'base64') {
        $('#imageUploadModalLoader').removeClass('popup-show');
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const data = reader.result;
          context.ace.callWithAce((ace) => {
            const imageLineNr = _handleNewLines(ace);
            ace.ace_addImage(imageLineNr, data);
            ace.ace_doReturnKey();
          }, 'img', true);
        };
      } else {
        const formData = new FormData();

        // add assoc key values, this will be posts values
        formData.append('file', file, file.name);
        $('#imageUploadModalLoader').addClass('popup-show');
        $.ajax({
          type: 'POST',
          url: `${clientVars.padId}/pluginfw/ep_s3/upload`,
          xhr: () => {
            const myXhr = $.ajaxSettings.xhr();

            return myXhr;
          },
          success: (data) => {
            $('#imageUploadModalLoader').removeClass('popup-show');
            context.ace.callWithAce((ace) => {
              const imageLineNr = _handleNewLines(ace);
              ace.ace_addImage(imageLineNr, data);
              ace.ace_doReturnKey();
            }, 'img', true);
          },
          error: (error) => {
            let errorResponse;
            try {
              errorResponse = JSON.parse(error.responseText.trim());
              if (errorResponse.type) {
                errorResponse.message = `ep_s3.error.${errorResponse.type}`;
              }
            } catch (err) {
              errorResponse = {message: error.responseText};
            }
            const errorTitle = html10n.get('ep_s3.error.title');
            const errorText = html10n.get(errorResponse.message);

            $.gritter.add({title: errorTitle, text: errorText, sticky: true, class_name: 'error'});
          },
          async: true,
          data: formData,
          cache: false,
          contentType: false,
          processData: false,
          timeout: 60000,
        });
      }
    });
    $(document).find('body').find('#imageInput').trigger('click');
  });
};
