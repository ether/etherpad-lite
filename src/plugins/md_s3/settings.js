'use strict';

exports.loadSettings = (hookName, settings, cb) => {
  if (!settings.settings.socketIo) {
    console.warn('Please update MuDoc to >=0.0.2');
  } else {
    // Setting maxHttpBufferSize to 10 MiB :)
    settings.settings.socketIo.maxHttpBufferSize = 100000000;
  }
  cb();
};
