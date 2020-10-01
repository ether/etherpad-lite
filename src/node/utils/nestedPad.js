
module.exports = (req, isReadOnly = false) => {
    let padId = req.params.pad;
    let padName = req.params.pad;

    // If it is nested pad, and is readonly request. e.g /p/pad1/pad2/r.62e780adb601393554
    if(req.params['0'] && isReadOnly) {
      // the last params is our readonly id
      const readOnlyId = req.params[0].split('/').pop();
      padId = readOnlyId;
      padName = readOnlyId;
    }

    // If it is nested pad. e.g. /p/pad1/pad2/*
    if(req.params['0'] && !isReadOnly){
      // In this case padId looks like "pad1:pad2" (Database pad key)
      padId = (req.params.pad+req.params[0]).replace(/\//g, ":");
      // The pad's name is always the last param of the query
      padName = req.params[0].split('/').pop();
    }

    return {
        padId,
        padName
    }
}